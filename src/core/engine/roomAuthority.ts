/**
 * Mascarenhas Hub — motor autoritativo da sala.
 * Executa no dispositivo do anfitrião: aplica ações, roda o relógio do jogo,
 * calcula placares e produz o estado público + visões privadas por jogador.
 */
import { DEFAULT_CATALOG, type Catalog } from '../../data/defaultPacks';
import type {
  BasePublicState,
  EngineCtx,
  GameAction,
  GameConfig,
  GameDraft,
  GameSlug,
  Player,
  PodiumData,
  PresenceStatus,
  RoomSnapshot,
} from '../../types/game.types';
import { getGame, defaultConfigFor, REGISTERED_GAMES } from '../registry/gameRegistry';
import { emptyStats, shiftTimestamps } from './helpers';
import { sanitizeNickname } from '../../lib/textUtils';
import { AVATARS } from '../../data/avatars';
import type { PlayerProfile } from '../realtime/roomChannel';

export type AuthorityListener = (snap: RoomSnapshot, views: Record<string, unknown>, secret: unknown, viewsChanged: boolean) => void;

const MAX_LOG = 40;
const MIN_PLAYERS_GRACE_MS = 30_000;

export function makeInitialSnapshot(code: string, roomId: string | null, host: Player): RoomSnapshot {
  const configs: Partial<Record<GameSlug, GameConfig>> = {};
  REGISTERED_GAMES.forEach((g) => (configs[g.slug] = defaultConfigFor(g.slug)));
  return {
    code,
    roomId,
    hostId: host.id,
    status: 'LOBBY',
    gameSlug: 'desafio-5-segundos',
    configs,
    players: [host],
    kicked: [],
    game: null,
    pause: null,
    podium: null,
    usedPromptIds: [],
    log: [],
    version: 1,
    updatedAt: Date.now(),
  };
}

/** Perfil vindo da rede: apelido limpo (2–16) e avatar existente, sempre. */
export function cleanProfile(profile: Partial<PlayerProfile> | null | undefined): PlayerProfile {
  const nick = sanitizeNickname(String(profile?.nickname ?? ''));
  const avatar = String(profile?.avatar ?? '');
  return {
    ...(profile as PlayerProfile),
    nickname: nick.length >= 2 ? nick : 'Jogador',
    avatar: AVATARS.some((a) => a.id === avatar) ? avatar : AVATARS[0].id,
  };
}

export function makePlayer(id: string, rawProfile: PlayerProfile, joinedAt: number): Player {
  const profile = cleanProfile(rawProfile);
  return {
    id,
    nickname: profile.nickname,
    avatar: profile.avatar,
    joinedAt,
    matchScore: 0,
    sessionScore: 0,
    crowns: 0,
    stats: emptyStats(),
  };
}

export class RoomAuthority {
  snap: RoomSnapshot;
  secret: unknown;
  views: Record<string, unknown>;
  presence: Record<string, PresenceStatus> = {};
  catalog: Catalog = DEFAULT_CATALOG;
  private lastViewsJson: string;
  private listener: AuthorityListener;
  private now: () => number;

  constructor(snap: RoomSnapshot, secret: unknown, views: Record<string, unknown>, listener: AuthorityListener, now: () => number) {
    this.snap = snap;
    this.secret = secret ?? null;
    this.views = views ?? {};
    this.lastViewsJson = JSON.stringify(this.views);
    this.listener = listener;
    this.now = now;
  }

  /** Re-difunde o estado atual (ex.: novo jogador pediu sincronização). */
  rebroadcast(forceViews = false) {
    this.listener(this.snap, this.views, this.secret, forceViews);
  }

  setPresence(presence: Record<string, PresenceStatus>) {
    this.presence = presence;
  }

  private isOnline = (id: string) => {
    const s = this.presence[id];
    return s === 'online' || s === 'away';
  };

  private commit(viewsMaybeChanged = true) {
    this.snap.version += 1;
    this.snap.updatedAt = this.now();
    let viewsChanged = false;
    if (viewsMaybeChanged) {
      const plugin = this.snap.game ? getGame(this.snap.gameSlug) : null;
      const views = plugin && this.snap.game ? plugin.engine.views({ pub: this.snap.game, sec: this.secret } as GameDraft<BasePublicState, unknown>, this.snap.players) : {};
      const json = JSON.stringify(views);
      if (json !== this.lastViewsJson) {
        this.views = views;
        this.lastViewsJson = json;
        viewsChanged = true;
      }
    }
    this.listener(this.snap, this.views, this.secret, viewsChanged);
  }

  private pushLog(text: string) {
    this.snap.log = [...this.snap.log, { id: crypto.randomUUID(), ts: this.now(), text }].slice(-MAX_LOG);
  }

  addPlayer(id: string, rawProfile: PlayerProfile, joinedAt: number) {
    if (typeof id !== 'string' || !id || this.snap.kicked.includes(id)) return;
    const profile = cleanProfile(rawProfile);
    const existing = this.snap.players.find((p) => p.id === id);
    if (existing) {
      if (existing.nickname === profile.nickname && existing.avatar === profile.avatar) {
        this.rebroadcast(true);
        return;
      }
      existing.nickname = profile.nickname;
      existing.avatar = profile.avatar;
    } else {
      this.snap.players.push(makePlayer(id, profile, joinedAt));
      this.pushLog(`${profile.nickname} entrou na sala`);
    }
    this.commit();
  }

  /** Processa qualquer ação recebida (comandos de sala ou jogadas). */
  handle(from: string, action: GameAction) {
    // Ações chegam da rede: nunca confie no formato (um cliente quebrado não pode derrubar a sala).
    if (!action || typeof action !== 'object' || typeof action.type !== 'string' || typeof from !== 'string') return;
    const isHost = from === this.snap.hostId;
    const t = action.type;
    if (t.startsWith('ROOM/')) {
      if (t === 'ROOM/LEAVE') return this.leave(from);
      if (!isHost) return;
      switch (t) {
        case 'ROOM/SELECT_GAME': {
          const slug = action.slug as GameSlug;
          if (this.snap.status !== 'LOBBY' || !getGame(slug)) return;
          this.snap.gameSlug = slug;
          return this.commit(false);
        }
        case 'ROOM/SET_CONFIG': {
          const slug = this.snap.gameSlug;
          const key = String(action.key);
          const value = action.value as GameConfig[string];
          if (this.snap.status !== 'LOBBY') return;
          this.snap.configs[slug] = { ...(this.snap.configs[slug] ?? defaultConfigFor(slug)), [key]: value };
          return this.commit(false);
        }
        case 'ROOM/START':
          void this.startGame();
          return;
        case 'ROOM/KICK':
          return this.kick(String(action.playerId));
        case 'ROOM/TRANSFER_HOST': {
          const target = String(action.playerId);
          if (!this.snap.players.some((p) => p.id === target) || target === this.snap.hostId) return;
          this.snap.hostId = target;
          this.pushLog(`${this.nick(target)} agora é o anfitrião`);
          return this.commit(false);
        }
        case 'ROOM/END_MATCH':
          return this.toLobby('Partida encerrada pelo anfitrião');
        case 'ROOM/BACK_TO_LOBBY':
          return this.toLobby(null);
        case 'ROOM/PAUSE':
          if (this.snap.status !== 'PLAYING' || this.snap.pause) return;
          this.snap.pause = { since: this.now(), until: null, reason: 'manual' };
          return this.commit(false);
        case 'ROOM/RESUME':
          return this.resume();
        case 'ROOM/SKIP':
          return this.runEngine((draft, ctx, plugin) => {
            if (plugin.engine.skip) return plugin.engine.skip(draft, ctx);
            if (draft.pub.endsAt) {
              draft.pub.endsAt = ctx.now;
              return plugin.engine.tick(draft, ctx);
            }
            return false;
          });
        default:
          return;
      }
    }
    if (this.snap.status !== 'PLAYING' || this.snap.pause) return;
    if (!this.snap.players.some((p) => p.id === from)) return;
    this.runEngine((draft, ctx, plugin) => plugin.engine.action(draft, from, action, ctx));
  }

  tick() {
    if (this.snap.status !== 'PLAYING' || !this.snap.game) return;
    const plugin = getGame(this.snap.gameSlug);
    const now = this.now();
    const participants = this.snap.players.filter((p) => !this.snap.kicked.includes(p.id));
    const online = participants.filter((p) => this.isOnline(p.id)).length;
    const pause = this.snap.pause;

    if (pause?.reason === 'min_players') {
      if (online >= plugin.minPlayers) return this.resume();
      if (pause.until && now > pause.until) {
        return this.toLobby('Jogadores insuficientes — partida encerrada (placar da sessão preservado)');
      }
      return;
    }
    if (pause) return;
    if (online < plugin.minPlayers && Object.keys(this.presence).length > 0) {
      this.snap.pause = { since: now, until: now + MIN_PLAYERS_GRACE_MS, reason: 'min_players' };
      this.pushLog('Jogadores insuficientes: aguardando reconexão por 30s');
      return this.commit(false);
    }
    this.runEngine((draft, ctx, p) => p.engine.tick(draft, ctx));
  }

  private resume() {
    const pause = this.snap.pause;
    if (!pause) return;
    const delta = this.now() - pause.since;
    shiftTimestamps(this.snap.game, delta);
    shiftTimestamps(this.secret, delta);
    this.snap.pause = null;
    this.pushLog('Partida retomada');
    this.commit();
  }

  private nick(id: string) {
    return this.snap.players.find((p) => p.id === id)?.nickname ?? 'Jogador';
  }

  private leave(from: string) {
    let changed = false;
    if (from === this.snap.hostId) {
      const next = this.snap.players
        .filter((p) => p.id !== from)
        .sort((a, b) => Number(this.isOnline(b.id)) - Number(this.isOnline(a.id)) || a.joinedAt - b.joinedAt)[0];
      if (next) {
        this.snap.hostId = next.id;
        this.pushLog(`${next.nickname} agora é o anfitrião`);
        changed = true;
      }
    }
    const p = this.snap.players.find((x) => x.id === from);
    if (p && this.snap.status === 'LOBBY') {
      this.snap.players = this.snap.players.filter((x) => x.id !== from);
      this.pushLog(`${p.nickname} saiu da sala`);
      changed = true;
    }
    if (changed) this.commit(false);
  }

  private kick(id: string) {
    if (id === this.snap.hostId) return;
    const p = this.snap.players.find((x) => x.id === id);
    if (!p) return;
    this.snap.players = this.snap.players.filter((x) => x.id !== id);
    this.snap.kicked = [...this.snap.kicked, id];
    this.pushLog(`${p.nickname} foi removido pelo anfitrião`);
    this.commit();
  }

  private makeCtx(players: Player[], config: GameConfig, logs: string[]): EngineCtx {
    const used = new Set(this.snap.usedPromptIds);
    const byId = (id: string) => players.find((p) => p.id === id);
    return {
      now: this.now(),
      rng: Math.random,
      config,
      players,
      hostId: this.snap.hostId,
      catalog: this.catalog,
      // para os motores, jogador expulso conta como desconectado (nunca recebe a vez)
      isOnline: (id) => !this.snap.kicked.includes(id) && this.isOnline(id),
      onlineIds: () => players.filter((p) => !this.snap.kicked.includes(p.id) && this.isOnline(p.id)).map((p) => p.id),
      award: (id, pts) => {
        const p = byId(id);
        if (!p || !pts) return;
        p.matchScore += pts;
        p.sessionScore += pts;
      },
      stat: (id, kind, responseMs) => {
        const p = byId(id);
        if (!p) return;
        if (kind === 'perfect') {
          p.stats.perfect += 1;
          p.stats.streak += 1;
          p.stats.bestStreak = Math.max(p.stats.bestStreak, p.stats.streak);
        } else if (kind === 'miss') {
          p.stats.streak = 0;
        } else if (kind === 'bluff') {
          p.stats.bluffs += 1;
        }
        if (typeof responseMs === 'number' && responseMs >= 0) {
          p.stats.respTotal += responseMs;
          p.stats.respCount += 1;
        }
      },
      log: (text) => logs.push(text),
      isUsed: (id) => used.has(id),
      markUsed: (id) => {
        used.add(id);
        this.snap.usedPromptIds = Array.from(used).slice(-600);
      },
    };
  }

  private runEngine(
    fn: (draft: GameDraft<BasePublicState, unknown>, ctx: EngineCtx, plugin: ReturnType<typeof getGame>) => boolean,
  ) {
    if (!this.snap.game) return;
    const plugin = getGame(this.snap.gameSlug);
    const draft = { pub: structuredClone(this.snap.game), sec: structuredClone(this.secret) };
    const players = structuredClone(this.snap.players);
    const logs: string[] = [];
    const ctx = this.makeCtx(players, this.snap.configs[this.snap.gameSlug] ?? defaultConfigFor(this.snap.gameSlug), logs);
    let changed: boolean;
    try {
      changed = fn(draft, ctx, plugin);
    } catch (err) {
      // Transacional: o rascunho é descartado e o estado da sala continua íntegro.
      console.warn('[Mascarenhas Hub] ação ignorada por erro no motor do jogo', err);
      return;
    }
    if (!changed) return;
    this.snap.game = draft.pub;
    this.secret = draft.sec;
    this.snap.players = players;
    logs.forEach((l) => this.pushLog(l));
    if (draft.pub.phase === 'FINISHED') this.finishMatch();
    this.commit();
  }

  private starting = false;

  private async startGame() {
    if (this.snap.status !== 'LOBBY' || this.starting) return;
    const plugin = getGame(this.snap.gameSlug);
    const eligible = () => this.snap.players.filter((p) => this.isOnline(p.id) || Object.keys(this.presence).length === 0);
    if (eligible().length < plugin.minPlayers || eligible().length > plugin.maxPlayers) return;
    const config = { ...defaultConfigFor(plugin.slug), ...(this.snap.configs[plugin.slug] ?? {}) };

    let external: unknown;
    if (plugin.prepare) {
      // Conteúdo externo buscado UMA vez aqui (anfitrião); os demais recebem o desafio já pronto.
      this.starting = true;
      this.snap.preparing = true;
      this.commit(false);
      try {
        external = await Promise.race([
          plugin.prepare(config, eligible()),
          new Promise((resolve) => setTimeout(() => resolve(undefined), 6000)),
        ]);
      } catch {
        external = undefined;
      }
      this.starting = false;
      this.snap.preparing = false;
      if (this.snap.status !== 'LOBBY' || this.snap.gameSlug !== plugin.slug) return this.commit(false);
    }

    const participants = eligible();
    if (participants.length < plugin.minPlayers || participants.length > plugin.maxPlayers) return this.commit(false);
    // jogadores desconectados não entram na partida
    this.snap.players.forEach((p) => {
      p.matchScore = 0;
      p.stats = emptyStats();
    });
    const logs: string[] = [];
    const players = structuredClone(participants);
    const ctx = this.makeCtx(players, config, logs);
    ctx.external = external;
    const draft = plugin.createInitialState(players, config, ctx);
    this.snap.game = draft.pub;
    this.secret = draft.sec;
    this.snap.status = 'PLAYING';
    this.snap.pause = null;
    this.snap.podium = null;
    this.pushLog(`Partida de ${plugin.title} iniciada!`);
    logs.forEach((l) => this.pushLog(l));
    this.commit();
  }

  private toLobby(reason: string | null) {
    this.snap.status = 'LOBBY';
    this.snap.game = null;
    this.snap.pause = null;
    this.snap.podium = null;
    this.secret = null;
    if (reason) this.pushLog(reason);
    this.commit();
  }

  private finishMatch() {
    const players = this.snap.players.filter((p) => !this.snap.kicked.includes(p.id));
    const avg = (p: Player) => (p.stats.respCount ? p.stats.respTotal / p.stats.respCount : Number.POSITIVE_INFINITY);
    const forced = this.snap.game?.forcedWinnerIds ?? [];
    const won = (p: Player) => (forced.includes(p.id) ? 1 : 0);
    const sorted = [...players].sort(
      (a, b) => won(b) - won(a) || b.matchScore - a.matchScore || b.stats.perfect - a.stats.perfect || avg(a) - avg(b),
    );
    const same = (a: Player, b: Player) => won(a) === won(b) && a.matchScore === b.matchScore && a.stats.perfect === b.stats.perfect && avg(a) === avg(b);
    let rank = 0;
    const entries = sorted.map((p, i) => {
      if (i === 0 || !same(sorted[i - 1], p)) rank = i + 1;
      return { playerId: p.id, rank, score: p.matchScore, crown: false };
    });
    if (sorted.length && (sorted[0].matchScore > 0 || won(sorted[0]))) {
      entries.forEach((e) => {
        if (e.rank === 1) {
          e.crown = true;
          const pl = this.snap.players.find((p) => p.id === e.playerId);
          if (pl) pl.crowns += 1;
        }
      });
    }
    const highlights: PodiumData['highlights'] = [];
    const best = <T,>(list: Player[], score: (p: Player) => T, cmp: (a: T, b: T) => boolean) =>
      list.reduce<Player | null>((acc, p) => (acc === null || cmp(score(p), score(acc)) ? p : acc), null);
    const bluffer = best(players.filter((p) => p.stats.bluffs > 0), (p) => p.stats.bluffs, (a, b) => a > b);
    if (bluffer) highlights.push({ title: 'Mestre do Blefe', playerId: bluffer.id, detail: `${bluffer.stats.bluffs} blefe(s) bem-sucedido(s)` });
    const fastest = best(players.filter((p) => p.stats.respCount > 0), avg, (a, b) => a < b);
    if (fastest) highlights.push({ title: 'Dedos Mais Rápidos', playerId: fastest.id, detail: `média de ${(avg(fastest) / 1000).toFixed(1)}s por resposta` });
    const streaker = best(players.filter((p) => p.stats.bestStreak >= 2), (p) => p.stats.bestStreak, (a, b) => a > b);
    if (streaker) highlights.push({ title: 'Maior Sequência', playerId: streaker.id, detail: `${streaker.stats.bestStreak} acertos seguidos` });
    const perfect = best(players.filter((p) => p.stats.perfect > 0), (p) => p.stats.perfect, (a, b) => a > b);
    if (perfect && !highlights.some((h) => h.playerId === perfect.id && h.title === 'Maior Sequência')) {
      highlights.push({ title: 'Acertos Perfeitos', playerId: perfect.id, detail: `${perfect.stats.perfect} rodada(s) perfeita(s)` });
    }
    this.snap.podium = { game: this.snap.gameSlug, entries, highlights };
    this.snap.status = 'PODIUM';
    const winners = entries.filter((e) => e.crown).map((e) => this.nick(e.playerId));
    this.pushLog(winners.length ? `Vitória de ${winners.join(' e ')}!` : 'Partida encerrada');
  }
}
