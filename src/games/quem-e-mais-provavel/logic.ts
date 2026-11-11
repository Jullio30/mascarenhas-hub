import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, pickUnused } from '../../core/engine/helpers';
import { MOST_LIKELY_CATALOG } from './mostLikelyCatalog';

export type QmpPhase = 'SECRET_VOTING' | 'SIMULTANEOUS_REVEAL' | 'FINISHED';

export interface QmpState extends BasePublicState {
  phase: QmpPhase;
  participants: string[];
  promptId: string;
  prompt: string;
  votedIds: string[];
  /** Revelados só em SIMULTANEOUS_REVEAL. */
  votes: Record<string, string> | null;
  received: Record<string, number> | null;
  winners: string[] | null;
  pointsDelta: Record<string, number>;
}

export interface QmpSecret {
  votes: Record<string, string>;
  /** chaves de idempotência `scored_round_${n}` */
  scored: string[];
}

export interface QmpView {
  myVote: string | null;
}

type Draft = GameDraft<QmpState, QmpSecret>;

export const REVEAL_MS = 12_000;

/**
 * Pontuação exata (imutável):
 *  - +1 por voto recebido
 *  - +2 para quem votou (no tempo) em alguém do conjunto W dos mais votados (empates no topo contam todos, sem duplicar)
 */
export function scoreRound(participants: string[], votes: Record<string, string>) {
  const received: Record<string, number> = {};
  participants.forEach((id) => (received[id] = 0));
  Object.entries(votes).forEach(([voter, target]) => {
    if (voter === target || !(target in received)) return;
    received[target] += 1;
  });
  const M = Math.max(0, ...Object.values(received));
  const W = M > 0 ? participants.filter((id) => received[id] === M) : [];
  const delta: Record<string, number> = {};
  participants.forEach((id) => {
    const bonus = votes[id] && votes[id] !== id && W.includes(votes[id]) ? 2 : 0;
    delta[id] = received[id] * 1 + bonus;
  });
  return { received, W, delta };
}

function startRound(d: Draft, ctx: EngineCtx) {
  const vibe = cfgStr(ctx, 'vibe', 'todas');
  const pool = vibe === 'todas' ? MOST_LIKELY_CATALOG : MOST_LIKELY_CATALOG.filter((p) => p.vibe === vibe);
  const prompt = pickUnused(pool.length ? pool : MOST_LIKELY_CATALOG, (p) => p.id, ctx);
  d.sec.votes = {};
  Object.assign(d.pub, {
    phase: 'SECRET_VOTING',
    promptId: prompt.id,
    prompt: prompt.text,
    votedIds: [],
    votes: null,
    received: null,
    winners: null,
    pointsDelta: {},
    endsAt: ctx.now + cfgNum(ctx, 'voteTimeSeconds', 20) * 1000,
  } satisfies Partial<QmpState>);
}

function reveal(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const key = `scored_round_${pub.round}`;
  const { received, W, delta } = scoreRound(pub.participants, sec.votes);
  pub.votes = { ...sec.votes };
  pub.received = received;
  pub.winners = W;
  pub.phase = 'SIMULTANEOUS_REVEAL';
  pub.endsAt = ctx.now + REVEAL_MS;
  if (sec.scored.includes(key)) return; // idempotência
  sec.scored = [...sec.scored, key];
  pub.pointsDelta = delta;
  Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
  pub.participants.forEach((id) => {
    if (!sec.votes[id]) return;
    ctx.stat(id, W.includes(sec.votes[id]) ? 'perfect' : 'miss');
  });
  if (W.length) ctx.log(`Mais provável: ${W.map((id) => ctx.players.find((p) => p.id === id)?.nickname ?? '?').join(' e ')}`);
}

export function createQmp(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const pub: QmpState = {
    phase: 'SECRET_VOTING',
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 8),
    endsAt: null,
    participants: players.map((p) => p.id),
    promptId: '',
    prompt: '',
    votedIds: [],
    votes: null,
    received: null,
    winners: null,
    pointsDelta: {},
  };
  const d: Draft = { pub, sec: { votes: {}, scored: [] } };
  startRound(d, ctx);
  return d;
}

export const qmpEngine: GameEngine<QmpState, QmpSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (a.type !== 'VOTE' || pub.phase !== 'SECRET_VOTING') return false;
    const target = String(a.target ?? '');
    // validador: participante, alvo válido, PROIBIDO votar em si mesmo, 1 voto por jogador (idempotente)
    if (!pub.participants.includes(from) || !pub.participants.includes(target) || target === from) return false;
    if (sec.votes[from]) return false;
    sec.votes[from] = target;
    pub.votedIds = [...pub.votedIds, from];
    const pending = pub.participants.filter((id) => !sec.votes[id] && ctx.isOnline(id));
    if (pending.length === 0) reveal(d, ctx);
    return true;
  },
  tick(d, ctx) {
    const { pub } = d;
    if (!pub.endsAt || ctx.now < pub.endsAt) return false;
    if (pub.phase === 'SECRET_VOTING') {
      reveal(d, ctx);
      return true;
    }
    if (pub.phase === 'SIMULTANEOUS_REVEAL') {
      if (pub.round >= pub.totalRounds) {
        pub.phase = 'FINISHED';
        pub.endsAt = null;
      } else {
        pub.round += 1;
        startRound(d, ctx);
      }
      return true;
    }
    return false;
  },
  views(d, players) {
    const out: Record<string, QmpView> = {};
    players.forEach((p) => (out[p.id] = { myVote: d.sec.votes[p.id] ?? null }));
    return out;
  },
};
