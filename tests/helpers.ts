import { REGISTERED_GAMES, defaultConfigFor } from '../src/core/registry/gameRegistry';
import { DEFAULT_CATALOG } from '../src/data/defaultPacks';
import type { EngineCtx, GameConfig, GameDraft, GameSlug, MascarenhasGamePlugin, Player } from '../src/types/game.types';

export const T0 = 1_700_000_000_000;

export function mkPlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    nickname: `P${i}`,
    avatar: 'neon-fox',
    joinedAt: i,
    matchScore: 0,
    sessionScore: 0,
    crowns: 0,
    stats: { perfect: 0, respTotal: 0, respCount: 0, streak: 0, bestStreak: 0, bluffs: 0 },
  }));
}

/** Mesa de teste: relógio controlado, presença controlada e o mesmo contrato de EngineCtx da RoomAuthority. */
export class Table<S = any, X = any> {
  now = T0;
  used = new Set<string>();
  offline = new Set<string>();
  hostId: string;
  rngSeq: number[] | null = null;
  d!: GameDraft<S, X>;
  readonly plugin: MascarenhasGamePlugin<any, any, any>;

  constructor(
    slug: GameSlug,
    public players: Player[],
    public config: GameConfig = {},
  ) {
    this.plugin = REGISTERED_GAMES.find((g) => g.slug === slug)!;
    this.config = { ...defaultConfigFor(slug), ...config };
    this.hostId = players[0].id;
  }

  ctx(extra: Partial<EngineCtx> = {}): EngineCtx {
    const players = this.players;
    return {
      now: this.now,
      rng: Math.random,
      config: this.config,
      players,
      hostId: this.hostId,
      catalog: DEFAULT_CATALOG,
      isOnline: (id) => players.some((p) => p.id === id) && !this.offline.has(id),
      onlineIds: () => players.filter((p) => !this.offline.has(p.id)).map((p) => p.id),
      award: (id, pts) => {
        const p = players.find((x) => x.id === id);
        if (p) {
          p.matchScore += pts;
          p.sessionScore += pts;
        }
      },
      stat: () => {},
      log: () => {},
      isUsed: (id) => this.used.has(id),
      markUsed: (id) => void this.used.add(id),
      ...extra,
    };
  }

  start(extra: Partial<EngineCtx> = {}) {
    this.d = this.plugin.createInitialState(this.players, this.config, this.ctx(extra)) as GameDraft<S, X>;
    return this;
  }

  act(from: string, action: Record<string, unknown> & { type: string }) {
    return this.plugin.engine.action(this.d as any, from, action, this.ctx());
  }

  tick(ms = 0) {
    this.now += ms;
    return this.plugin.engine.tick(this.d as any, this.ctx());
  }

  /** Avança o relógio até o fim da fase atual (endsAt) e dá um tick. */
  expire() {
    const endsAt = (this.d.pub as any).endsAt as number | null;
    if (endsAt) this.now = Math.max(this.now, endsAt);
    return this.tick();
  }

  views() {
    return this.plugin.engine.views(this.d as any, this.players) as Record<string, any>;
  }

  get pub(): any {
    return this.d.pub;
  }

  get sec(): any {
    return this.d.sec;
  }
}

/** Jogos dentro do escopo da auditoria (Sabe ou Perde é desenvolvido à parte e fica de fora). */
export const IN_SCOPE = REGISTERED_GAMES.filter((g) => g.slug !== 'sabe-ou-perde');
