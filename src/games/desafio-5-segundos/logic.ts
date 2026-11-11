import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import type { FiveSecPrompt } from '../../data/defaultPacks';
import { cfgBool, cfgNum, cfgStr, pickUnused, shuffle } from '../../core/engine/helpers';
import { sanitizeShortText } from '../../lib/textUtils';

export type D5Vote = 'valid' | 'partial' | 'fail';
export type D5Phase = 'TURN_PREPARATION' | 'COUNTDOWN_ACTIVE' | 'PEER_VALIDATION' | 'ROUND_SUMMARY' | 'FINISHED';

export interface D5State extends BasePublicState {
  phase: D5Phase;
  order: string[];
  turnIndex: number;
  hotSeat: string;
  answerMode: 'voice' | 'typing';
  allowPartial: boolean;
  prompt: FiveSecPrompt | null;
  countdownMs: number;
  remainingAtDone: number | null;
  finishedEarly: boolean;
  answers: string[];
  voters: string[];
  votedIds: string[];
  votes: Record<string, D5Vote> | null;
  verdict: D5Vote | 'skipped' | null;
  points: number;
  bonus: boolean;
}

export interface D5Secret {
  nextPrompt: FiveSecPrompt | null;
  votes: Record<string, D5Vote>;
}

type Draft = GameDraft<D5State, D5Secret>;

export const PREP_MS = 15_000;
export const VALIDATION_MS = 15_000;
const SUMMARY_MS = 5_000;
const TOLERANCE_MS = 3_000;

function startTurn(d: Draft, index: number, ctx: EngineCtx) {
  const { pub, sec } = d;
  pub.turnIndex = index;
  pub.round = index + 1;
  pub.hotSeat = pub.order[index % pub.order.length];
  pub.phase = 'TURN_PREPARATION';
  pub.prompt = null;
  pub.answers = [];
  pub.remainingAtDone = null;
  pub.finishedEarly = false;
  pub.voters = [];
  pub.votedIds = [];
  pub.votes = null;
  pub.verdict = null;
  pub.points = 0;
  pub.bonus = false;
  pub.endsAt = ctx.now + PREP_MS;
  const cat = cfgStr(ctx, 'category', 'all');
  const pool = cat === 'all' ? ctx.catalog.fiveSec : ctx.catalog.fiveSec.filter((p) => p.category === cat);
  sec.nextPrompt = pickUnused(pool.length ? pool : ctx.catalog.fiveSec, (p) => 'd5:' + p.id, ctx);
  sec.votes = {};
}

function reveal(d: Draft, ctx: EngineCtx) {
  d.pub.prompt = d.sec.nextPrompt;
  d.pub.phase = 'COUNTDOWN_ACTIVE';
  d.pub.endsAt = ctx.now + d.pub.countdownMs;
}

function toValidation(d: Draft, ctx: EngineCtx, remaining: number) {
  const { pub } = d;
  pub.remainingAtDone = Math.max(0, remaining);
  pub.phase = 'PEER_VALIDATION';
  pub.voters = ctx.onlineIds().filter((id) => id !== pub.hotSeat && pub.order.includes(id));
  pub.votedIds = [];
  pub.endsAt = ctx.now + VALIDATION_MS;
  if (pub.voters.length === 0) resolve(d, ctx);
}

function resolve(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const votes = Object.values(sec.votes).filter((v) => pub.allowPartial || v !== 'partial');
  const counts: Record<D5Vote, number> = { valid: 0, partial: 0, fail: 0 };
  votes.forEach((v) => counts[v]++);
  const max = Math.max(counts.valid, counts.partial, counts.fail);
  const top = (['valid', 'partial', 'fail'] as D5Vote[]).filter((k) => counts[k] === max);
  let verdict: D5Vote = top[0];
  if (top.length > 1) {
    const hostVote = sec.votes[ctx.hostId];
    verdict = hostVote && top.includes(hostVote) ? hostVote : top[0]; // empate: Host ou validação positiva
  }
  let points = 0;
  let bonus = false;
  if (verdict === 'valid') {
    points = 10;
    if (pub.finishedEarly && (pub.remainingAtDone ?? 0) > 1500) {
      points += 2;
      bonus = true;
    }
    ctx.stat(pub.hotSeat, 'perfect', pub.finishedEarly ? pub.countdownMs - (pub.remainingAtDone ?? 0) : undefined);
  } else if (verdict === 'partial') {
    points = 5;
    ctx.stat(pub.hotSeat, 'miss');
  } else {
    ctx.stat(pub.hotSeat, 'miss');
  }
  ctx.award(pub.hotSeat, points);
  pub.verdict = verdict;
  pub.points = points;
  pub.bonus = bonus;
  pub.votes = { ...sec.votes };
  pub.phase = 'ROUND_SUMMARY';
  pub.endsAt = ctx.now + SUMMARY_MS;
}

function next(d: Draft, ctx: EngineCtx) {
  const nextIndex = d.pub.turnIndex + 1;
  if (nextIndex >= d.pub.totalRounds) {
    d.pub.phase = 'FINISHED';
    d.pub.endsAt = null;
    return;
  }
  startTurn(d, nextIndex, ctx);
}

export function createD5(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const order = shuffle(players.map((p) => p.id), ctx.rng);
  const turns = cfgNum(ctx, 'turnsPerPlayer', 2);
  const answerMode = cfgStr(ctx, 'answerMode', 'voice') === 'typing' ? 'typing' : 'voice';
  const pub: D5State = {
    phase: 'TURN_PREPARATION',
    round: 1,
    totalRounds: order.length * turns,
    endsAt: null,
    order,
    turnIndex: 0,
    hotSeat: order[0],
    answerMode,
    allowPartial: cfgBool(ctx, 'allowPartial', true),
    prompt: null,
    countdownMs: answerMode === 'typing' ? 8000 : 5000,
    remainingAtDone: null,
    finishedEarly: false,
    answers: [],
    voters: [],
    votedIds: [],
    votes: null,
    verdict: null,
    points: 0,
    bonus: false,
  };
  const draft: Draft = { pub, sec: { nextPrompt: null, votes: {} } };
  startTurn(draft, 0, ctx);
  return draft;
}

export const d5Engine: GameEngine<D5State, D5Secret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    switch (a.type) {
      case 'READY':
        if (pub.phase !== 'TURN_PREPARATION' || from !== pub.hotSeat) return false;
        reveal(d, ctx);
        return true;
      case 'DONE':
        if (pub.phase !== 'COUNTDOWN_ACTIVE' || from !== pub.hotSeat) return false;
        pub.finishedEarly = true;
        toValidation(d, ctx, (pub.endsAt ?? ctx.now) - ctx.now);
        return true;
      case 'ANSWER_PART': {
        if (pub.phase !== 'COUNTDOWN_ACTIVE' || from !== pub.hotSeat || pub.answerMode !== 'typing') return false;
        const idx = Number(a.index);
        if (!(idx >= 0 && idx < 3)) return false;
        const answers = [...pub.answers];
        answers[idx] = sanitizeShortText(String(a.text ?? ''), 40);
        pub.answers = answers;
        if ([0, 1, 2].every((i) => answers[i])) {
          pub.finishedEarly = true;
          toValidation(d, ctx, (pub.endsAt ?? ctx.now) - ctx.now);
        }
        return true;
      }
      case 'VOTE': {
        const v = a.vote as D5Vote;
        if (pub.phase !== 'PEER_VALIDATION' || !pub.voters.includes(from) || pub.votedIds.includes(from)) return false;
        if (!['valid', 'partial', 'fail'].includes(v) || (v === 'partial' && !pub.allowPartial)) return false;
        sec.votes[from] = v;
        pub.votedIds = [...pub.votedIds, from];
        const pendingOnline = pub.voters.filter((id) => !pub.votedIds.includes(id) && ctx.isOnline(id));
        if (pendingOnline.length === 0) resolve(d, ctx);
        return true;
      }
      default:
        return false;
    }
  },
  tick(d, ctx) {
    const { pub } = d;
    if (!pub.endsAt || pub.phase === 'FINISHED') return false;
    switch (pub.phase) {
      case 'TURN_PREPARATION':
        if (ctx.now < pub.endsAt) return false;
        if (ctx.isOnline(pub.hotSeat)) {
          reveal(d, ctx);
          return true;
        }
        if (ctx.now < pub.endsAt + TOLERANCE_MS) return false;
        ctx.log(`Turno pulado: jogador da vez desconectado`);
        pub.verdict = 'skipped';
        pub.phase = 'ROUND_SUMMARY';
        pub.endsAt = ctx.now + 3000;
        return true;
      case 'COUNTDOWN_ACTIVE':
        if (ctx.now < pub.endsAt) return false;
        toValidation(d, ctx, 0);
        return true;
      case 'PEER_VALIDATION':
        if (ctx.now < pub.endsAt) return false;
        resolve(d, ctx);
        return true;
      case 'ROUND_SUMMARY':
        if (ctx.now < pub.endsAt) return false;
        next(d, ctx);
        return true;
      default:
        return false;
    }
  },
  views() {
    return {};
  },
};
