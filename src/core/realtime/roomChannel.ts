/**
 * Mascarenhas Hub — camada de transporte da sala.
 *
 * Duas implementações com a mesma interface:
 *  - SupabaseRoomTransport: 1 único canal `mascarenhas_room:{code}` (Presence + Broadcast)
 *    + RPCs para estado crítico/persistido (segredos isolados em round_secrets).
 *  - LocalRoomTransport: BroadcastChannel('mascarenhas_hub_local') + localStorage
 *    (Modo Passa-o-Celular / teste entre abas sem credenciais de nuvem).
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase';
import type { GameAction, RoomSnapshot } from '../../types/game.types';

export type TransportMode = 'local' | 'supabase';

export interface PlayerProfile {
  nickname: string;
  avatar: string;
}

export interface PresenceInfo {
  status: 'online' | 'away';
  joinedAt: number;
}

export type WireMsg =
  | { t: 'state'; from: string; snap: RoomSnapshot }
  | { t: 'views'; from: string; views: Record<string, unknown> }
  | { t: 'views_changed'; from: string }
  | { t: 'action'; from: string; a: GameAction }
  | { t: 'hello'; from: string; profile: PlayerProfile; joinedAt: number }
  | { t: 'request_state'; from: string }
  | { t: 'reaction'; from: string; emoji: string };

export interface JoinResult {
  playerId: string;
  roomId: string | null;
  code: string;
  snapshot: RoomSnapshot | null;
}

export interface TransportHandlers {
  /** Payload bruto da rede (envelope assinado). Quem verifica é o SessionManager (secureEnvelope.ts). */
  onMessage: (raw: unknown) => void;
  onPresence: (presence: Record<string, PresenceInfo>) => void;
  onStatus: (status: 'connected' | 'reconnecting' | 'error') => void;
}

export interface RoomTransport {
  readonly mode: TransportMode;
  createRoom(profile: PlayerProfile): Promise<JoinResult>;
  joinRoom(code: string, profile: PlayerProfile): Promise<JoinResult>;
  connect(code: string, playerId: string, joinedAt: number, handlers: TransportHandlers): Promise<void>;
  disconnect(): void;
  send(msg: WireMsg): void;
  /** Função que assina cada mensagem antes de ir para a rede. Sem ela, nada é enviado (falha fechada). */
  setSealer(sealer: Sealer | null): void;
  setStatus(status: 'online' | 'away'): void;
  /** Anfitrião: difunde estado público, entrega visões privadas e persiste. */
  publish(snap: RoomSnapshot, views: Record<string, unknown>, secret: unknown, viewsChanged: boolean): void;
  loadSnapshot(): Promise<RoomSnapshot | null>;
  loadSecret(): Promise<unknown>;
  fetchMyView(): Promise<unknown>;
  claimHost(): Promise<boolean>;
  transferHost(playerId: string): Promise<void>;
  kick(playerId: string): Promise<void>;
  touch(): void;
  serverOffset(): Promise<number>;
}

export type Sealer = (msg: WireMsg) => Promise<unknown>;

/** Fila de saída: assina na ordem de envio (a assinatura é assíncrona) e só então publica. */
class Outbox {
  private chain: Promise<void> = Promise.resolve();
  sealer: Sealer | null = null;
  constructor(private post: (payload: unknown) => void) {}
  push(msg: WireMsg) {
    const sealer = this.sealer;
    if (!sealer) return;
    this.chain = this.chain
      .then(() => sealer(msg))
      .then((env) => this.post(env))
      .catch((err) => console.warn('[Mascarenhas Hub] mensagem não assinada/enviada', err));
  }
}

/** Alfabeto sem caracteres ambíguos (sem 0, O, 1, I, L). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
}

export function normalizeRoomCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => ROOM_CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, 6);
}

function uuid(): string {
  return crypto.randomUUID();
}

/* ------------------------------------------------------------------ */
/* Modo Local (BroadcastChannel + localStorage)                        */
/* ------------------------------------------------------------------ */

const LOCAL_STORE_PREFIX = 'mascarenhas_hub_local_room:';
const LOCAL_TOKEN_KEY = 'mascarenhas_hub_player_token';

interface LocalStore {
  snap: RoomSnapshot;
  secret: unknown;
  views: Record<string, unknown>;
}

type LocalEnvelope =
  | { room: string; kind: 'msg'; msg: unknown }
  | { room: string; kind: 'hb'; from: string; status: 'online' | 'away'; joinedAt: number }
  | { room: string; kind: 'bye'; from: string };

export class LocalRoomTransport implements RoomTransport {
  readonly mode = 'local' as const;
  private bc: BroadcastChannel | null = null;
  private code = '';
  private playerId = '';
  private joinedAt = 0;
  private status: 'online' | 'away' = 'online';
  private seen = new Map<string, { at: number; status: 'online' | 'away'; joinedAt: number }>();
  private timers: number[] = [];
  private handlers: TransportHandlers | null = null;
  private onPageHide = () => this.post({ room: this.code, kind: 'bye', from: this.playerId });
  private outbox = new Outbox((payload) => this.post({ room: this.code, kind: 'msg', msg: payload }));

  setSealer(sealer: Sealer | null) {
    this.outbox.sealer = sealer;
  }

  /** Identidade por aba (sessionStorage) para permitir vários jogadores no mesmo navegador. */
  static playerToken(): string {
    let token = sessionStorage.getItem(LOCAL_TOKEN_KEY);
    if (!token) {
      token = uuid();
      sessionStorage.setItem(LOCAL_TOKEN_KEY, token);
    }
    return token;
  }

  private readStore(code: string): LocalStore | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORE_PREFIX + code);
      return raw ? (JSON.parse(raw) as LocalStore) : null;
    } catch {
      return null;
    }
  }

  async createRoom(): Promise<JoinResult> {
    let code = generateRoomCode();
    while (this.readStore(code)) code = generateRoomCode();
    this.cleanupOldRooms();
    return { playerId: LocalRoomTransport.playerToken(), roomId: null, code, snapshot: null };
  }

  async joinRoom(code: string): Promise<JoinResult> {
    const store = this.readStore(code);
    if (!store) throw new Error('Sala não encontrada neste navegador. No Modo Local, todos precisam estar no mesmo navegador/dispositivo.');
    return { playerId: LocalRoomTransport.playerToken(), roomId: null, code, snapshot: store.snap };
  }

  private cleanupOldRooms() {
    const limit = Date.now() - 6 * 3600_000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LOCAL_STORE_PREFIX)) continue;
      try {
        const s = JSON.parse(localStorage.getItem(key) || 'null') as LocalStore | null;
        if (!s || s.snap.updatedAt < limit) localStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  async connect(code: string, playerId: string, joinedAt: number, handlers: TransportHandlers) {
    this.disconnect();
    this.code = code;
    this.playerId = playerId;
    this.joinedAt = joinedAt;
    this.handlers = handlers;
    this.bc = new BroadcastChannel('mascarenhas_hub_local');
    this.bc.onmessage = (ev: MessageEvent<LocalEnvelope>) => {
      const env = ev.data;
      if (!env || env.room !== this.code) return;
      if (env.kind === 'msg') handlers.onMessage(env.msg);
      else if (env.kind === 'hb') {
        const known = this.seen.has(env.from);
        this.seen.set(env.from, { at: Date.now(), status: env.status, joinedAt: env.joinedAt });
        if (!known) this.emitPresence();
      } else if (env.kind === 'bye') {
        this.seen.delete(env.from);
        this.emitPresence();
      }
    };
    this.heartbeat();
    this.timers.push(window.setInterval(() => this.heartbeat(), 2000));
    this.timers.push(window.setInterval(() => this.emitPresence(), 1000));
    window.addEventListener('pagehide', this.onPageHide);
    handlers.onStatus('connected');
    this.emitPresence();
  }

  private heartbeat() {
    this.post({ room: this.code, kind: 'hb', from: this.playerId, status: this.status, joinedAt: this.joinedAt });
  }

  private emitPresence() {
    const now = Date.now();
    const out: Record<string, PresenceInfo> = { [this.playerId]: { status: this.status, joinedAt: this.joinedAt } };
    this.seen.forEach((v, k) => {
      if (now - v.at < 6500) out[k] = { status: v.status, joinedAt: v.joinedAt };
    });
    this.handlers?.onPresence(out);
  }

  private post(env: LocalEnvelope) {
    try {
      this.bc?.postMessage(env);
    } catch {
      /* canal fechado */
    }
  }

  disconnect() {
    if (this.bc) {
      this.onPageHide();
      this.bc.close();
    }
    this.bc = null;
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    this.seen.clear();
    window.removeEventListener('pagehide', this.onPageHide);
  }

  send(msg: WireMsg) {
    this.outbox.push(msg);
  }

  setStatus(status: 'online' | 'away') {
    this.status = status;
    this.heartbeat();
    this.emitPresence();
  }

  publish(snap: RoomSnapshot, views: Record<string, unknown>, secret: unknown, viewsChanged: boolean) {
    try {
      localStorage.setItem(LOCAL_STORE_PREFIX + snap.code, JSON.stringify({ snap, secret, views } satisfies LocalStore));
    } catch {
      /* quota */
    }
    this.send({ t: 'state', from: this.playerId, snap });
    if (viewsChanged) this.send({ t: 'views', from: this.playerId, views });
  }

  async loadSnapshot() {
    return this.readStore(this.code)?.snap ?? null;
  }

  async loadSecret() {
    return this.readStore(this.code)?.secret ?? null;
  }

  async fetchMyView() {
    return this.readStore(this.code)?.views?.[this.playerId] ?? null;
  }

  async claimHost() {
    return true;
  }

  async transferHost() {}
  async kick() {}
  touch() {}
  async serverOffset() {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Modo Online (Supabase Realtime: canal único + RPCs)                */
/* ------------------------------------------------------------------ */

interface RoomRpcResult {
  room_id: string;
  code: string;
  player_id: string;
  joined_at: string;
  public_state: RoomSnapshot | Record<string, never> | null;
}

function asSnapshot(value: unknown): RoomSnapshot | null {
  if (value && typeof value === 'object' && 'code' in (value as object) && 'players' in (value as object)) {
    return value as RoomSnapshot;
  }
  return null;
}

export class SupabaseRoomTransport implements RoomTransport {
  readonly mode = 'supabase' as const;
  private channel: RealtimeChannel | null = null;
  private roomId = '';
  private playerId = '';
  private joinedAt = 0;
  private status: 'online' | 'away' = 'online';
  private saveTimer: number | null = null;
  private saving = false;
  private pending: { snap: RoomSnapshot; views: Record<string, unknown>; secret: unknown; viewsChanged: boolean } | null = null;
  private lastSaveAt = 0;
  private outbox = new Outbox((payload) => void this.channel?.send({ type: 'broadcast', event: 'msg', payload }));

  setSealer(sealer: Sealer | null) {
    this.outbox.sealer = sealer;
  }

  private get sb() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não configurado.');
    return sb;
  }

  private async ensureAuth() {
    const { data } = await this.sb.auth.getSession();
    if (data.session) return;
    const { error } = await this.sb.auth.signInAnonymously();
    if (error) {
      // 429: limite de logins anônimos por IP do Supabase (ex.: muita gente entrando pela mesma rede Wi-Fi).
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        throw new Error('Muitas entradas seguidas a partir desta rede. Aguarde alguns minutos e tente de novo (ou use os dados móveis).');
      }
      throw new Error(
        'Falha no login anônimo do Supabase. Ative "Anonymous Sign-Ins" em Authentication -> Providers. Detalhe: ' + error.message,
      );
    }
  }

  async createRoom(profile: PlayerProfile): Promise<JoinResult> {
    await this.ensureAuth();
    const { data, error } = await this.sb.rpc('create_room', { p_nickname: profile.nickname, p_avatar: profile.avatar });
    if (error) throw new Error('Não foi possível criar a sala: ' + error.message);
    const r = data as unknown as RoomRpcResult;
    this.roomId = r.room_id;
    this.joinedAt = Date.parse(r.joined_at);
    return { playerId: r.player_id, roomId: r.room_id, code: r.code, snapshot: null };
  }

  async joinRoom(code: string, profile: PlayerProfile): Promise<JoinResult> {
    await this.ensureAuth();
    const { data, error } = await this.sb.rpc('join_room', { p_code: code, p_nickname: profile.nickname, p_avatar: profile.avatar });
    if (error) {
      if (error.message.includes('ROOM_NOT_FOUND')) throw new Error('Sala não encontrada ou expirada.');
      if (error.message.includes('KICKED')) throw new Error('Você foi removido desta sala pelo anfitrião.');
      throw new Error('Não foi possível entrar: ' + error.message);
    }
    const r = data as unknown as RoomRpcResult;
    this.roomId = r.room_id;
    this.joinedAt = Date.parse(r.joined_at);
    return { playerId: r.player_id, roomId: r.room_id, code: r.code, snapshot: asSnapshot(r.public_state) };
  }

  get joinedAtFromServer() {
    return this.joinedAt;
  }

  async connect(code: string, playerId: string, joinedAt: number, handlers: TransportHandlers) {
    this.disconnect();
    this.playerId = playerId;
    this.joinedAt = joinedAt;
    const channel = this.sb.channel('mascarenhas_room:' + code, {
      config: { broadcast: { self: false, ack: false }, presence: { key: playerId } },
    });
    this.channel = channel;
    channel.on('broadcast', { event: 'msg' }, ({ payload }) => handlers.onMessage(payload));
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ status: 'online' | 'away'; joinedAt: number }>();
      const out: Record<string, PresenceInfo> = {};
      Object.entries(state).forEach(([key, metas]) => {
        const meta = metas[metas.length - 1];
        if (meta) out[key] = { status: meta.status, joinedAt: meta.joinedAt };
      });
      handlers.onPresence(out);
    });
    await new Promise<void>((resolve) => {
      let settled = false;
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ status: this.status, joinedAt: this.joinedAt });
          handlers.onStatus('connected');
          if (!settled) {
            settled = true;
            resolve();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          handlers.onStatus('reconnecting');
          if (!settled) {
            settled = true;
            resolve();
          }
        } else if (status === 'CLOSED') {
          handlers.onStatus('reconnecting');
        }
      });
    });
  }

  disconnect() {
    if (this.channel) {
      void this.channel.untrack();
      void this.sb.removeChannel(this.channel);
    }
    this.channel = null;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    // Garante que o último estado do anfitrião seja persistido antes de sair.
    if (this.pending && !this.saving) void this.flushSave();
  }

  send(msg: WireMsg) {
    this.outbox.push(msg);
  }

  setStatus(status: 'online' | 'away') {
    this.status = status;
    void this.channel?.track({ status, joinedAt: this.joinedAt });
  }

  publish(snap: RoomSnapshot, views: Record<string, unknown>, secret: unknown, viewsChanged: boolean) {
    this.send({ t: 'state', from: this.playerId, snap });
    const merged = this.pending;
    this.pending = { snap, views, secret, viewsChanged: viewsChanged || Boolean(merged?.viewsChanged) };
    this.scheduleSave(viewsChanged ? 0 : 1200);
  }

  private scheduleSave(delay: number) {
    if (this.saving) return;
    const wait = Math.max(0, Math.min(delay, 1200 - (Date.now() - this.lastSaveAt)));
    if (this.saveTimer) {
      if (delay > 0) return;
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(() => void this.flushSave(), delay === 0 ? 0 : wait);
  }

  private async flushSave() {
    this.saveTimer = null;
    const job = this.pending;
    if (!job) return;
    this.pending = null;
    this.saving = true;
    this.lastSaveAt = Date.now();
    const game = job.snap.game;
    const { error } = await this.sb.rpc('host_save_state', {
      p_room_id: this.roomId,
      p_public_state: job.snap as never,
      p_secret_payload: { engine: job.secret ?? null, views: job.views } as never,
      p_status: job.snap.status,
      p_current_game: job.snap.status === 'LOBBY' ? null : job.snap.gameSlug,
      p_round_number: game?.round ?? 0,
      p_round_ends_at: game?.endsAt ? new Date(game.endsAt).toISOString() : null,
    });
    this.saving = false;
    if (error) console.warn('[Mascarenhas Hub] host_save_state falhou', error.message);
    if (job.viewsChanged) this.send({ t: 'views_changed', from: this.playerId });
    const next = this.pending as typeof job | null; // pode ter mudado durante o await
    if (next) this.scheduleSave(next.viewsChanged ? 0 : 1200);
  }

  async loadSnapshot() {
    const { data, error } = await this.sb.rpc('get_room_state', { p_room_id: this.roomId });
    if (error) return null;
    return asSnapshot(data);
  }

  async loadSecret() {
    const { data, error } = await this.sb.rpc('get_host_secret', { p_room_id: this.roomId });
    if (error || !data) return null;
    return (data as { engine?: unknown }).engine ?? null;
  }

  async fetchMyView() {
    const { data, error } = await this.sb.rpc('get_player_round_view', { p_room_id: this.roomId });
    if (error) return null;
    return data ?? null;
  }

  async claimHost() {
    const { data, error } = await this.sb.rpc('claim_host_if_abandoned', { p_room_id: this.roomId });
    return !error && data === true;
  }

  async transferHost(playerId: string) {
    await this.sb.rpc('transfer_host', { p_room_id: this.roomId, p_new_host: playerId });
  }

  async kick(playerId: string) {
    await this.sb.rpc('kick_player', { p_room_id: this.roomId, p_player_id: playerId });
  }

  touch() {
    if (this.roomId) void this.sb.rpc('touch_player', { p_room_id: this.roomId });
  }

  async serverOffset() {
    const t0 = Date.now();
    const { data, error } = await this.sb.rpc('server_now');
    const t1 = Date.now();
    if (error || !data) return 0;
    return Date.parse(data as string) - (t0 + t1) / 2;
  }
}
