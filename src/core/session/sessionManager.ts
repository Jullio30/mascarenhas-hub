/**
 * Mascarenhas Hub — gerenciador de sessão.
 * Conecta transporte + motor autoritativo + store; cuida de reconexão (F5),
 * presença online/away, migração automática de anfitrião e inatividade.
 */
import { isSupabaseConfigured } from '../../lib/supabase';
import { useHubStore, serverNow } from '../../store/useHubStore';
import type { GameAction, PresenceStatus, RoomSnapshot } from '../../types/game.types';
import { RoomAuthority, makeInitialSnapshot, makePlayer } from '../engine/roomAuthority';
import {
  LocalRoomTransport,
  SupabaseRoomTransport,
  type PlayerProfile,
  type PresenceInfo,
  type RoomTransport,
  type TransportMode,
  type WireMsg,
} from '../realtime/roomChannel';

const ACTIVE_ROOM_KEY = 'mascarenhas_hub_active_room';
const SESSION_KEY = 'mascarenhas_hub_session';
const HOST_ABANDON_MS = 15_000;
const INACTIVITY_MS = 30 * 60_000;
const REACTION_THROTTLE_MS = 1500;

interface ActiveRoom {
  code: string;
  mode: TransportMode;
  playerId: string;
}

function storageFor(mode: TransportMode): Storage {
  // No Modo Local cada aba é um jogador distinto, então a sessão fica por aba.
  return mode === 'local' ? sessionStorage : localStorage;
}

function readActive(): ActiveRoom | null {
  for (const st of [sessionStorage, localStorage]) {
    try {
      const raw = st.getItem(ACTIVE_ROOM_KEY);
      if (raw) return JSON.parse(raw) as ActiveRoom;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function clearActive() {
  sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  localStorage.removeItem(ACTIVE_ROOM_KEY);
}

class SessionManager {
  private transport: RoomTransport | null = null;
  private authority: RoomAuthority | null = null;
  private playerId = '';
  private joinedAt = 0;
  private profile: PlayerProfile = { nickname: '', avatar: 'neon-fox' };
  private timers: number[] = [];
  private hostTimers: number[] = [];
  private hostAbsentSince: number | null = null;
  private claiming = false;
  private lastActivity = Date.now();
  private lastReactionAt = 0;
  private lastHelloAt = 0;
  private lastRebroadcastAt = 0;
  private listenersBound = false;

  get defaultMode(): TransportMode | null {
    return isSupabaseConfigured ? 'supabase' : null;
  }

  private makeTransport(mode: TransportMode): RoomTransport {
    return mode === 'supabase' ? new SupabaseRoomTransport() : new LocalRoomTransport();
  }

  /* ----------------------------- ciclo de vida ----------------------------- */

  async createRoom(mode: TransportMode, profile: PlayerProfile) {
    const t = this.makeTransport(mode);
    const r = await t.createRoom(profile);
    const joinedAt = t instanceof SupabaseRoomTransport ? t.joinedAtFromServer : Date.now();
    const snap = makeInitialSnapshot(r.code, r.roomId, makePlayer(r.playerId, profile, joinedAt));
    await this.enter(t, r.code, r.playerId, joinedAt, profile, snap, true);
  }

  async joinRoom(mode: TransportMode, code: string, profile: PlayerProfile) {
    const t = this.makeTransport(mode);
    const r = await t.joinRoom(code, profile);
    if (r.snapshot?.kicked.includes(r.playerId)) throw new Error('Você foi removido desta sala pelo anfitrião.');
    const existing = r.snapshot?.players.find((p) => p.id === r.playerId);
    const joinedAt = t instanceof SupabaseRoomTransport ? t.joinedAtFromServer : existing?.joinedAt ?? Date.now();
    await this.enter(t, r.code, r.playerId, joinedAt, profile, r.snapshot, false);
  }

  /** Reconexão transparente após F5 / queda de rede. */
  async resume(): Promise<boolean> {
    const active = readActive();
    if (!active) return false;
    const url = new URL(window.location.href);
    const urlRoom = url.searchParams.get('room');
    if (urlRoom && urlRoom.toUpperCase() !== active.code) return false;
    if (active.mode === 'supabase' && !isSupabaseConfigured) {
      clearActive();
      return false;
    }
    const prefs = useHubStore.getState().prefs;
    if (!prefs.nickname) return false;
    try {
      await this.joinRoom(active.mode, active.code, { nickname: prefs.nickname, avatar: prefs.avatar });
      return true;
    } catch (err) {
      clearActive();
      useHubStore.getState().toast((err as Error).message || 'Não foi possível reconectar à sala.', 'error');
      return false;
    }
  }

  private async enter(
    t: RoomTransport,
    code: string,
    playerId: string,
    joinedAt: number,
    profile: PlayerProfile,
    snap: RoomSnapshot | null,
    asHost: boolean,
  ) {
    this.teardown(false);
    this.transport = t;
    this.playerId = playerId;
    this.joinedAt = joinedAt;
    this.profile = profile;
    this.hostAbsentSince = null;
    this.lastActivity = Date.now();
    const store = useHubStore.setState;
    store({ mode: t.mode, meId: playerId, snapshot: snap, myView: null, connection: 'connecting', kicked: false, presence: {} });

    const active: ActiveRoom = { code, mode: t.mode, playerId };
    storageFor(t.mode).setItem(ACTIVE_ROOM_KEY, JSON.stringify(active));
    storageFor(t.mode).setItem(SESSION_KEY, JSON.stringify({ playerId, joinedAt, code }));
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    window.history.replaceState(null, '', url.toString());

    await t.connect(code, playerId, joinedAt, {
      onMessage: (m) => this.onMessage(m),
      onPresence: (p) => this.onPresence(p),
      onStatus: (s) => {
        useHubStore.setState({ connection: s === 'connected' ? 'connected' : s });
        if (s === 'connected' && !this.authority) {
          this.transport?.send({ t: 'request_state', from: this.playerId });
        }
      },
    });
    const offset = await t.serverOffset();
    useHubStore.setState({ offset });

    if (asHost || snap?.hostId === playerId) {
      await this.becomeHost(snap!, asHost ? null : undefined);
    } else {
      this.sendHello(true);
      t.send({ t: 'request_state', from: playerId });
      const view = await t.fetchMyView();
      if (view && !this.authority) useHubStore.setState({ myView: view });
    }

    this.timers.push(window.setInterval(() => this.checkHostMigration(), 1000));
    this.timers.push(window.setInterval(() => this.checkInactivity(), 30_000));
    this.bindGlobalListeners();
    this.updateVisibility();
  }

  private sendHello(force = false) {
    const now = Date.now();
    if (!force && now - this.lastHelloAt < 3000) return;
    this.lastHelloAt = now;
    this.transport?.send({ t: 'hello', from: this.playerId, profile: this.profile, joinedAt: this.joinedAt });
  }

  /** Assume o papel de autoridade da sala (criação, F5 do anfitrião, migração ou transferência). */
  private async becomeHost(snap: RoomSnapshot, secret: unknown | null | undefined) {
    const t = this.transport;
    if (!t || this.authority) return;
    let sec = secret;
    if (sec === undefined) {
      sec = await t.loadSecret();
      for (let i = 0; i < 6 && sec == null && snap.status === 'PLAYING' && t.mode === 'supabase'; i++) {
        await new Promise((r) => setTimeout(r, 800));
        sec = await t.loadSecret();
      }
    }
    const working: RoomSnapshot = structuredClone(snap);
    working.hostId = this.playerId;
    const authority = new RoomAuthority(working, sec ?? null, {}, (s, views, secretOut, viewsChanged) => this.onAuthorityChange(s, views, secretOut, viewsChanged), serverNow);
    this.authority = authority;
    authority.setPresence(useHubStore.getState().presence);
    if (!working.players.some((p) => p.id === this.playerId)) {
      authority.addPlayer(this.playerId, this.profile, this.joinedAt);
    } else {
      authority.rebroadcast(true);
    }
    this.hostTimers.push(window.setInterval(() => this.authority?.tick(), 250));
    t.touch();
    this.hostTimers.push(window.setInterval(() => this.transport?.touch(), 5000));
  }

  private stepDown() {
    this.hostTimers.forEach((x) => clearInterval(x));
    this.hostTimers = [];
    this.authority = null;
  }

  private onAuthorityChange(snap: RoomSnapshot, views: Record<string, unknown>, secret: unknown, viewsChanged: boolean) {
    const copy = structuredClone(snap);
    useHubStore.setState({ snapshot: copy, myView: views[this.playerId] ?? null });
    this.transport?.publish(copy, views, secret, viewsChanged);
    this.lastActivity = Date.now();
    if (copy.hostId !== this.playerId) {
      // Transferência manual de anfitrião
      const target = copy.hostId;
      const tr = this.transport;
      this.stepDown();
      window.setTimeout(() => void tr?.transferHost(target), 1500);
    }
  }

  /* ----------------------------- mensagens ----------------------------- */

  private onMessage(msg: WireMsg) {
    const st = useHubStore.getState();
    switch (msg.t) {
      case 'state': {
        if (this.authority) {
          if (msg.from === this.playerId) return;
          // Outro dispositivo também se considera anfitrião: o estado mais recente vence.
          if (msg.snap.hostId !== this.playerId && msg.snap.updatedAt > this.authority.snap.updatedAt) {
            this.stepDown();
          } else return;
        }
        const snap = msg.snap;
        this.lastActivity = Date.now();
        if (snap.kicked.includes(this.playerId)) {
          this.kickedOut();
          return;
        }
        useHubStore.setState({ snapshot: snap });
        if (snap.hostId === this.playerId) {
          void this.becomeHost(snap, undefined);
          return;
        }
        if (!snap.players.some((p) => p.id === this.playerId)) this.sendHello();
        if (st.snapshot?.game && !snap.game) useHubStore.setState({ myView: null });
        return;
      }
      case 'views':
        if (!this.authority) useHubStore.setState({ myView: msg.views[this.playerId] ?? null });
        return;
      case 'views_changed':
        if (!this.authority) {
          void this.transport?.fetchMyView().then((view) => {
            if (!this.authority) useHubStore.setState({ myView: view });
          });
        }
        return;
      case 'action':
        this.authority?.handle(msg.from, msg.a);
        return;
      case 'hello':
        this.authority?.addPlayer(msg.from, msg.profile, msg.joinedAt);
        return;
      case 'request_state': {
        if (!this.authority) return;
        const now = Date.now();
        if (now - this.lastRebroadcastAt < 800) return;
        this.lastRebroadcastAt = now;
        this.authority.rebroadcast(true);
        return;
      }
      case 'reaction':
        st.addReaction(msg.from, msg.emoji);
        return;
    }
  }

  private onPresence(info: Record<string, PresenceInfo>) {
    const presence: Record<string, PresenceStatus> = {};
    const joined: Record<string, number> = {};
    Object.entries(info).forEach(([id, p]) => {
      presence[id] = p.status;
      joined[id] = p.joinedAt;
    });
    useHubStore.setState({ presence, presenceJoined: joined });
    this.authority?.setPresence(presence);
  }

  /* ----------------------------- migração de host ----------------------------- */

  private async checkHostMigration() {
    const { snapshot, presence, presenceJoined, connection } = useHubStore.getState();
    if (!snapshot || this.authority || this.claiming || connection !== 'connected') return;
    if (presence[snapshot.hostId]) {
      this.hostAbsentSince = null;
      return;
    }
    const now = Date.now();
    if (this.hostAbsentSince === null) {
      this.hostAbsentSince = now;
      return;
    }
    if (now - this.hostAbsentSince < HOST_ABANDON_MS) return;
    const inRoom = new Set(snapshot.players.map((p) => p.id));
    const onlineIds = Object.keys(presence).filter((id) => presence[id] === 'online' || presence[id] === 'away');
    const pool = onlineIds.some((id) => inRoom.has(id)) ? onlineIds.filter((id) => inRoom.has(id)) : onlineIds;
    const joinedOf = (id: string) => snapshot.players.find((p) => p.id === id)?.joinedAt ?? presenceJoined[id] ?? Number.MAX_SAFE_INTEGER;
    pool.sort((a, b) => joinedOf(a) - joinedOf(b) || a.localeCompare(b));
    if (pool[0] !== this.playerId) return;

    this.claiming = true;
    try {
      const ok = await this.transport?.claimHost();
      if (!ok) return;
      const stored = await this.transport?.loadSnapshot();
      const base = stored && stored.version > snapshot.version ? stored : snapshot;
      await this.becomeHost({ ...base, hostId: this.playerId }, undefined);
      const me = base.players.find((p) => p.id === this.playerId)?.nickname ?? this.profile.nickname;
      useHubStore.getState().toast(`${me}, você assumiu como anfitrião da sala.`, 'info');
    } finally {
      this.claiming = false;
      this.hostAbsentSince = null;
    }
  }

  /* ----------------------------- inatividade / visibilidade ----------------------------- */

  private checkInactivity() {
    const { snapshot, connection } = useHubStore.getState();
    if (!snapshot || snapshot.status !== 'LOBBY' || connection === 'inactive') return;
    if (Date.now() - this.lastActivity > INACTIVITY_MS) {
      this.teardown(false);
      useHubStore.setState({ connection: 'inactive' });
    }
  }

  private markActivity = () => {
    this.lastActivity = Date.now();
  };

  private updateVisibility = () => {
    const hidden = document.visibilityState === 'hidden';
    this.transport?.setStatus(hidden ? 'away' : 'online');
    if (!hidden) {
      const conn = useHubStore.getState().connection;
      if (conn === 'reconnecting') void this.reconnect();
      else if (!this.authority) this.transport?.send({ t: 'request_state', from: this.playerId });
    }
  };

  private onOnline = () => {
    if (useHubStore.getState().connection !== 'connected') void this.reconnect();
  };

  private bindGlobalListeners() {
    if (this.listenersBound) return;
    this.listenersBound = true;
    document.addEventListener('visibilitychange', this.updateVisibility);
    window.addEventListener('online', this.onOnline);
    window.addEventListener('pointerdown', this.markActivity, { passive: true });
    window.addEventListener('keydown', this.markActivity);
  }

  private unbindGlobalListeners() {
    if (!this.listenersBound) return;
    this.listenersBound = false;
    document.removeEventListener('visibilitychange', this.updateVisibility);
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('pointerdown', this.markActivity);
    window.removeEventListener('keydown', this.markActivity);
  }

  /** Reconecta mantendo o mesmo jogador (após inatividade ou queda de rede). */
  async reconnect() {
    const active = readActive();
    const prefs = useHubStore.getState().prefs;
    if (!active) return;
    useHubStore.setState({ connection: 'connecting' });
    try {
      await this.joinRoom(active.mode, active.code, { nickname: prefs.nickname, avatar: prefs.avatar });
    } catch (err) {
      useHubStore.setState({ connection: 'error' });
      useHubStore.getState().toast((err as Error).message, 'error');
    }
  }

  private kickedOut() {
    this.teardown(true);
    useHubStore.setState({ kicked: true, snapshot: null, myView: null, meId: null, connection: 'idle', mode: null });
  }

  private teardown(clearSession: boolean) {
    this.timers.forEach((x) => clearInterval(x));
    this.timers = [];
    this.stepDown();
    this.transport?.disconnect();
    if (clearSession) {
      this.transport = null;
      clearActive();
      this.unbindGlobalListeners();
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState(null, '', url.toString());
    }
  }

  /* ----------------------------- API pública ----------------------------- */

  dispatch(action: GameAction) {
    this.lastActivity = Date.now();
    if (this.authority) this.authority.handle(this.playerId, action);
    else this.transport?.send({ t: 'action', from: this.playerId, a: action });
  }

  /** Reações rápidas (throttle de 1,5s por jogador). */
  react(emoji: string): boolean {
    const now = Date.now();
    if (now - this.lastReactionAt < REACTION_THROTTLE_MS) return false;
    this.lastReactionAt = now;
    this.transport?.send({ t: 'reaction', from: this.playerId, emoji });
    useHubStore.getState().addReaction(this.playerId, emoji);
    return true;
  }

  async kick(playerId: string) {
    this.dispatch({ type: 'ROOM/KICK', playerId });
    await this.transport?.kick(playerId);
  }

  leave() {
    this.dispatch({ type: 'ROOM/LEAVE' });
    window.setTimeout(() => {
      this.teardown(true);
      useHubStore.setState({ snapshot: null, myView: null, meId: null, connection: 'idle', mode: null, presence: {} });
    }, 150);
  }
}

export const session = new SessionManager();
