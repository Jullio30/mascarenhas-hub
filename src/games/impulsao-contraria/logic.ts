/**
 * Impulsão Contrária — dedução social com 1 Impostor secreto.
 *
 * MATCH_SETUP (host sorteia 1 impostor, guardado só no segredo)
 * Por rodada: SECRET_PREFERENCE_INPUT → STANCE_AND_DEBATE → SECRET_VOTING → VOTE_RESOLUTION
 * Final: FINAL_CONTRADICTION_REVEAL → FINISHED.
 *
 * Regras inegociáveis:
 *  - exatamente 1 impostor; `truePreference` de cada jogador é privada;
 *  - normal defende a preferência verdadeira; impostor defende a opção CONTRÁRIA;
 *  - voto secreto; o mais votado (sem empate no topo) fica com `canVote = false` nas votações seguintes;
 *  - o impostor continua jogando todas as rodadas, mesmo se for o mais votado.
 *
 * Integridade: os pontos de cada rodada ficam no segredo e só entram no placar na revelação final —
 * caso contrário o placar ao vivo denunciaria quem é o impostor.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, customContent, mergePools, pickUnused } from '../../core/engine/helpers';
import { sanitizeShortText } from '../../lib/textUtils';
import { DILEMMAS, type Dilemma } from './catalog';

export type IcPhase = 'SECRET_PREFERENCE_INPUT' | 'STANCE_AND_DEBATE' | 'SECRET_VOTING' | 'VOTE_RESOLUTION' | 'FINAL_CONTRADICTION_REVEAL' | 'FINISHED';
export type Opt = 'A' | 'B';

export const PREF_MS = 20_000;
export const VOTE_MS = 25_000;
export const RESOLUTION_MS = 9_000;
export const FINAL_MS = 25_000;
export const NORMAL_HIT_POINTS = 200;
export const IMPOSTOR_PER_MISS = 150;
export const IMPOSTOR_SURVIVE_MIN = 300;
export const MAX_JUSTIFY = 140;

export interface IcHistory {
  round: number;
  dilemma: { text: string; a: string; b: string };
  impostorTrue: Opt;
  impostorDefended: Opt;
}

export interface IcState extends BasePublicState {
  phase: IcPhase;
  participants: string[];
  dilemma: { text: string; a: string; b: string };
  preferenceIds: string[];
  /** Postura PÚBLICA de defesa (publicada só no debate). */
  stances: Record<string, Opt> | null;
  justifications: Record<string, string>;
  canVote: Record<string, boolean>;
  eliminated: string[];
  voters: string[];
  votedIds: string[];
  resolution: { votes: Record<string, string>; counts: Record<string, number>; mostVoted: string | null; tie: boolean } | null;
  /** Só na revelação final. */
  final: { impostorId: string; history: IcHistory[]; delta: Record<string, number> } | null;
}

export interface IcSecret {
  impostorPlayerId: string;
  truePreference: Record<string, Opt>;
  /** Preferências sorteadas automaticamente para quem não escolheu a tempo. */
  autoAssigned: string[];
  votes: Record<string, string>;
  history: IcHistory[];
  /** Pontos acumulados (aplicados só no final). */
  pending: Record<string, number>;
  pool: Dilemma[];
  scored: string[];
}

export interface IcView {
  role: 'normal' | 'impostor' | null;
  myTruePreference: Opt | null;
  myDefended: Opt | null;
  autoAssigned: boolean;
  myVote: string | null;
}

type Draft = GameDraft<IcState, IcSecret>;

const flip = (o: Opt): Opt => (o === 'A' ? 'B' : 'A');

/** Postura obrigatória: normal = preferência verdadeira; impostor = o contrário. */
export function defendedOption(playerId: string, impostorId: string, truePref: Opt): Opt {
  return playerId === impostorId ? flip(truePref) : truePref;
}

function startRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const q = pickUnused(sec.pool, (x) => x.id, ctx);
  sec.truePreference = {};
  sec.autoAssigned = [];
  sec.votes = {};
  Object.assign(pub, {
    phase: 'SECRET_PREFERENCE_INPUT',
    dilemma: { text: q.text, a: q.a, b: q.b },
    preferenceIds: [],
    stances: null,
    justifications: {},
    voters: [],
    votedIds: [],
    resolution: null,
    endsAt: ctx.now + PREF_MS,
  } satisfies Partial<IcState>);
}

function toDebate(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  // quem não escolheu a tempo recebe uma preferência sorteada (avisada só a ele)
  pub.participants.forEach((id) => {
    if (!sec.truePreference[id]) {
      sec.truePreference[id] = ctx.rng() < 0.5 ? 'A' : 'B';
      sec.autoAssigned.push(id);
    }
  });
  const stances: Record<string, Opt> = {};
  pub.participants.forEach((id) => (stances[id] = defendedOption(id, sec.impostorPlayerId, sec.truePreference[id])));
  pub.stances = stances;
  sec.history = [
    ...sec.history,
    { round: pub.round, dilemma: { ...pub.dilemma }, impostorTrue: sec.truePreference[sec.impostorPlayerId], impostorDefended: stances[sec.impostorPlayerId] },
  ];
  pub.phase = 'STANCE_AND_DEBATE';
  pub.endsAt = ctx.now + cfgNum(ctx, 'debateSeconds', 45) * 1000;
}

function toVoting(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  pub.voters = pub.participants.filter((id) => pub.canVote[id] !== false);
  pub.votedIds = [];
  pub.phase = 'SECRET_VOTING';
  pub.endsAt = ctx.now + VOTE_MS;
  if (pub.voters.filter((id) => ctx.isOnline(id)).length === 0) resolve(d, ctx);
}

/**
 * Pontuação da rodada (acumulada em segredo):
 *  - jogador normal que votou no impostor: +200;
 *  - impostor: +150 por jogador normal apto que NÃO votou nele, com mínimo de +300 se ele não foi o mais votado.
 */
export function scoreRound(impostorId: string, eligibleVoters: string[], votes: Record<string, string>, mostVoted: string | null) {
  const delta: Record<string, number> = {};
  const normals = eligibleVoters.filter((id) => id !== impostorId);
  normals.forEach((id) => {
    if (votes[id] === impostorId) delta[id] = NORMAL_HIT_POINTS;
  });
  const misses = normals.filter((id) => votes[id] !== impostorId).length;
  let imp = misses * IMPOSTOR_PER_MISS;
  if (mostVoted !== impostorId) imp = Math.max(imp, IMPOSTOR_SURVIVE_MIN);
  if (imp > 0) delta[impostorId] = imp;
  return delta;
}

function resolve(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const counts: Record<string, number> = {};
  Object.values(sec.votes).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1));
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((id) => counts[id] === max);
  const mostVoted = max > 0 && top.length === 1 ? top[0] : null;
  const key = `scored_round_${pub.round}`;
  if (!sec.scored.includes(key)) {
    sec.scored = [...sec.scored, key];
    const delta = scoreRound(sec.impostorPlayerId, pub.voters, sec.votes, mostVoted);
    Object.entries(delta).forEach(([id, pts]) => (sec.pending[id] = (sec.pending[id] ?? 0) + pts));
    if (mostVoted) {
      // identificado/eliminado na votação: perde o direito de votar nas próximas (mas continua jogando)
      pub.canVote = { ...pub.canVote, [mostVoted]: false };
      if (!pub.eliminated.includes(mostVoted)) pub.eliminated = [...pub.eliminated, mostVoted];
    }
  }
  pub.resolution = { votes: { ...sec.votes }, counts, mostVoted, tie: max > 0 && top.length > 1 };
  pub.phase = 'VOTE_RESOLUTION';
  pub.endsAt = ctx.now + RESOLUTION_MS;
}

function eligibleNormals(pub: IcState, impostorId: string) {
  return pub.participants.filter((id) => id !== impostorId && pub.canVote[id] !== false);
}

function finalReveal(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const key = 'scored_final';
  if (!sec.scored.includes(key)) {
    sec.scored = [...sec.scored, key];
    Object.entries(sec.pending).forEach(([id, pts]) => ctx.award(id, pts));
    pub.participants.forEach((id) => {
      if (id === sec.impostorPlayerId) return;
      const hits = Object.keys(sec.pending).includes(id);
      ctx.stat(id, hits ? 'perfect' : 'miss');
    });
    ctx.stat(sec.impostorPlayerId, 'bluff');
  }
  pub.final = { impostorId: sec.impostorPlayerId, history: [...sec.history], delta: { ...sec.pending } };
  pub.phase = 'FINAL_CONTRADICTION_REVEAL';
  pub.endsAt = ctx.now + FINAL_MS;
  ctx.log(`O impostor era ${ctx.players.find((p) => p.id === sec.impostorPlayerId)?.nickname ?? '?'}!`);
}

function afterResolution(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  // fim: última rodada ou só 1 jogador normal ainda apto a votar
  if (pub.round >= pub.totalRounds || eligibleNormals(pub, sec.impostorPlayerId).length <= 1) return finalReveal(d, ctx);
  pub.round += 1;
  startRound(d, ctx);
}

export function createIc(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const { mode, items } = customContent(ctx);
  const custom: Dilemma[] = items.filter((it) => it.parts[1] && it.parts[2]).map((it) => ({ id: it.id, text: it.text, a: it.parts[1], b: it.parts[2] }));
  const pool = mergePools(DILEMMAS, custom, mode);
  const participants = players.map((p) => p.id);
  // MATCH_SETUP: exatamente 1 impostor, só no segredo do anfitrião
  const impostorPlayerId = participants[Math.floor(ctx.rng() * participants.length)];
  const canVote: Record<string, boolean> = {};
  participants.forEach((id) => (canVote[id] = true));
  const pub = {
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 3),
    endsAt: null,
    participants,
    canVote,
    eliminated: [],
    final: null,
  } as unknown as IcState;
  const d: Draft = { pub, sec: { impostorPlayerId, truePreference: {}, autoAssigned: [], votes: {}, history: [], pending: {}, pool, scored: [] } };
  startRound(d, ctx);
  return d;
}

export const icEngine: GameEngine<IcState, IcSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    switch (a.type) {
      case 'PREFERENCE': {
        const opt = String(a.option) as Opt;
        if (pub.phase !== 'SECRET_PREFERENCE_INPUT' || sec.truePreference[from] || (opt !== 'A' && opt !== 'B')) return false;
        sec.truePreference[from] = opt;
        pub.preferenceIds = [...pub.preferenceIds, from];
        const pending = pub.participants.filter((id) => !sec.truePreference[id] && ctx.isOnline(id));
        if (pending.length === 0) toDebate(d, ctx);
        return true;
      }
      case 'JUSTIFY': {
        if (pub.phase !== 'STANCE_AND_DEBATE') return false;
        const text = sanitizeShortText(String(a.text ?? ''), MAX_JUSTIFY);
        if (!text || pub.justifications[from] === text) return false;
        pub.justifications = { ...pub.justifications, [from]: text };
        return true;
      }
      case 'VOTE': {
        const target = String(a.target ?? '');
        // votação secreta: só quem ainda pode votar; proibido votar em si mesmo; 1 voto por rodada
        if (pub.phase !== 'SECRET_VOTING' || !pub.voters.includes(from) || pub.canVote[from] === false || sec.votes[from]) return false;
        if (target === from || !pub.participants.includes(target)) return false;
        sec.votes[from] = target;
        pub.votedIds = [...pub.votedIds, from];
        const pending = pub.voters.filter((id) => !sec.votes[id] && ctx.isOnline(id));
        if (pending.length === 0) resolve(d, ctx);
        return true;
      }
      default:
        return false;
    }
  },
  tick(d, ctx) {
    const { pub } = d;
    if (!pub.endsAt || ctx.now < pub.endsAt) return false;
    switch (pub.phase) {
      case 'SECRET_PREFERENCE_INPUT':
        toDebate(d, ctx);
        return true;
      case 'STANCE_AND_DEBATE':
        toVoting(d, ctx);
        return true;
      case 'SECRET_VOTING':
        resolve(d, ctx);
        return true;
      case 'VOTE_RESOLUTION':
        afterResolution(d, ctx);
        return true;
      case 'FINAL_CONTRADICTION_REVEAL':
        pub.phase = 'FINISHED';
        pub.endsAt = null;
        return true;
      default:
        return false;
    }
  },
  skip(d, ctx) {
    d.pub.endsAt = ctx.now;
    return icEngine.tick(d, ctx);
  },
  views(d, players) {
    const { pub, sec } = d;
    // Rodada 1: o papel só aparece DEPOIS do registro da preferência verdadeira (integridade)
    const roleVisible = !(pub.round === 1 && pub.phase === 'SECRET_PREFERENCE_INPUT');
    const out: Record<string, IcView> = {};
    players.forEach((p) => {
      const pref = sec.truePreference[p.id] ?? null;
      out[p.id] = {
        role: roleVisible ? (p.id === sec.impostorPlayerId ? 'impostor' : 'normal') : null,
        myTruePreference: pref,
        myDefended: pub.stances?.[p.id] ?? null,
        autoAssigned: sec.autoAssigned.includes(p.id),
        myVote: sec.votes[p.id] ?? null,
      };
    });
    return out;
  },
};
