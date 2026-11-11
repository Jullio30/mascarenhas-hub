import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgBool, cfgNum, pickUnused, shuffle } from '../../core/engine/helpers';
import { normalizeWord, sanitizeShortText } from '../../lib/textUtils';

export const CONTEST_MS = 6_000;
const INTRO_MS = 4_000;
const SUMMARY_MS = 8_000;
const TOLERANCE_MS = 3_000;
const MAX_LAPS = 3;
const LETTER_POOL = 'ABCDEFGILMPRST'.split('');

export interface CatWord {
  id: string;
  pid: string;
  word: string;
  norm: string;
  contestUntil: number;
  contests: string[];
  annulled: boolean;
}

export interface CatState extends BasePublicState {
  phase: 'ROUND_INTRO' | 'BOMB_TURN' | 'ROUND_SUMMARY' | 'FINISHED';
  participants: string[];
  category: string;
  letters: string[] | null;
  order: string[];
  turnPos: number;
  lap: number;
  activeId: string;
  turnMs: number;
  turnStartedAt: number;
  lives: Record<string, number>;
  used: CatWord[];
  reject: { pid: string; msg: string; at: number } | null;
  explodedAt: number | null;
  roundPoints: Record<string, number>;
  bonuses: Record<string, number>;
}

type Draft = GameDraft<CatState, Record<string, never>>;

function alive(pub: CatState) {
  return pub.order.filter((id) => (pub.lives[id] ?? 0) > 0);
}

function turnDuration(pub: CatState, base: number) {
  return pub.lap >= 2 ? Math.min(base, 7) * 1000 : base * 1000;
}

function beginTurn(d: Draft, ctx: EngineCtx, base: number) {
  const { pub } = d;
  pub.activeId = pub.order[pub.turnPos];
  pub.turnMs = turnDuration(pub, base);
  pub.turnStartedAt = ctx.now;
  pub.endsAt = ctx.now + pub.turnMs;
  pub.phase = 'BOMB_TURN';
}

function advance(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  const base = cfgNum(ctx, 'turnSeconds', 10);
  if (alive(pub).length <= 1 && pub.order.length > 1) return endRound(d, ctx);
  if (alive(pub).length === 0) return endRound(d, ctx);
  let pos = pub.turnPos;
  for (let i = 0; i < pub.order.length; i++) {
    const nextPos = (pos + 1) % pub.order.length;
    if (nextPos <= pos) pub.lap += 1;
    pos = nextPos;
    if ((pub.lives[pub.order[pos]] ?? 0) > 0) break;
  }
  if (pub.lap >= MAX_LAPS) return endRound(d, ctx);
  pub.turnPos = pos;
  beginTurn(d, ctx, base);
}

function loseLife(d: Draft, ctx: EngineCtx, id: string) {
  const { pub } = d;
  pub.lives = { ...pub.lives, [id]: Math.max(0, (pub.lives[id] ?? 0) - 1) };
  ctx.stat(id, 'miss');
}

function endRound(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  const survivors = alive(pub);
  const bonuses: Record<string, number> = {};
  survivors.forEach((id) => {
    const lives = pub.lives[id];
    const lastSurvivor = survivors.length === 1 && pub.order.length > 1;
    bonuses[id] = lives >= 2 || lastSurvivor ? 10 : 5;
    ctx.award(id, bonuses[id]);
    if (lives >= 2) ctx.stat(id, 'perfect');
  });
  pub.bonuses = bonuses;
  pub.phase = 'ROUND_SUMMARY';
  pub.endsAt = ctx.now + SUMMARY_MS;
}

function startRound(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  const prompt = pickUnused(ctx.catalog.categories, (c) => 'cat:' + c.id, ctx);
  const online = pub.participants.filter((id) => ctx.isOnline(id));
  const order = shuffle(online.length >= 2 ? online : pub.participants, ctx.rng);
  const lives: Record<string, number> = {};
  order.forEach((id) => (lives[id] = 2));
  Object.assign(pub, {
    phase: 'ROUND_INTRO',
    category: prompt.text,
    letters: cfgBool(ctx, 'letterRestriction', false) ? shuffle(LETTER_POOL, ctx.rng).slice(0, 5).sort() : null,
    order,
    turnPos: 0,
    lap: 0,
    activeId: order[0],
    turnMs: 0,
    turnStartedAt: 0,
    lives,
    used: [],
    reject: null,
    explodedAt: null,
    roundPoints: {},
    bonuses: {},
    endsAt: ctx.now + INTRO_MS,
  } satisfies Partial<CatState>);
}

export function createCategorias(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const pub = {
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 3),
    participants: players.map((p) => p.id),
  } as CatState;
  const d: Draft = { pub, sec: {} };
  startRound(d, ctx);
  return d;
}

export const categoriasEngine: GameEngine<CatState, Record<string, never>> = {
  action(d, from, a, ctx) {
    const { pub } = d;
    if (a.type === 'WORD') {
      if (pub.phase !== 'BOMB_TURN' || from !== pub.activeId) return false;
      const word = sanitizeShortText(String(a.text ?? ''), 30);
      const norm = normalizeWord(word);
      if (!norm) return false;
      if (pub.letters && !pub.letters.map((l) => l.toLowerCase()).includes(norm[0])) {
        pub.reject = { pid: from, msg: `Precisa começar com: ${pub.letters.join(', ')}`, at: ctx.now };
        return true;
      }
      if (pub.used.some((u) => !u.annulled && u.norm === norm)) {
        pub.reject = { pid: from, msg: 'Palavra já utilizada! Tente outra rápido!', at: ctx.now };
        return true;
      }
      pub.used = [
        { id: crypto.randomUUID(), pid: from, word, norm, contestUntil: ctx.now + CONTEST_MS, contests: [], annulled: false },
        ...pub.used,
      ];
      pub.reject = null;
      pub.roundPoints = { ...pub.roundPoints, [from]: (pub.roundPoints[from] ?? 0) + 2 };
      ctx.award(from, 2);
      ctx.stat(from, 'perfect', ctx.now - pub.turnStartedAt);
      advance(d, ctx);
      return true;
    }
    if (a.type === 'CONTEST') {
      if (pub.phase !== 'BOMB_TURN') return false;
      const w = pub.used.find((u) => u.id === a.wordId);
      if (!w || w.annulled || w.pid === from || ctx.now > w.contestUntil || w.contests.includes(from)) return false;
      if (!pub.participants.includes(from)) return false;
      const contests = [...w.contests, from];
      const others = pub.participants.filter((id) => id !== w.pid && ctx.isOnline(id)).length;
      const needed = Math.max(1, Math.ceil(others * 0.5));
      const annul = contests.length >= needed;
      pub.used = pub.used.map((u) => (u.id === w.id ? { ...u, contests, annulled: annul } : u));
      if (annul) {
        ctx.award(w.pid, -2);
        pub.roundPoints = { ...pub.roundPoints, [w.pid]: (pub.roundPoints[w.pid] ?? 0) - 2 };
        loseLife(d, ctx, w.pid);
        ctx.log(`Palavra “${w.word}” anulada por contestação`);
        if (alive(pub).length <= 1 && pub.order.length > 1) endRound(d, ctx);
        else if (pub.lives[pub.activeId] <= 0) advance(d, ctx);
      }
      return true;
    }
    return false;
  },
  tick(d, ctx) {
    const { pub } = d;
    if (!pub.endsAt || pub.phase === 'FINISHED') return false;
    if (pub.phase === 'ROUND_INTRO') {
      if (ctx.now < pub.endsAt) return false;
      pub.turnPos = 0;
      beginTurn(d, ctx, cfgNum(ctx, 'turnSeconds', 10));
      return true;
    }
    if (pub.phase === 'BOMB_TURN') {
      const limit = pub.endsAt + (ctx.isOnline(pub.activeId) ? 0 : TOLERANCE_MS);
      if (ctx.now < limit) return false;
      pub.explodedAt = ctx.now;
      ctx.log('💣 A bomba explodiu!');
      loseLife(d, ctx, pub.activeId);
      advance(d, ctx);
      return true;
    }
    if (pub.phase === 'ROUND_SUMMARY') {
      if (ctx.now < pub.endsAt) return false;
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
  views() {
    return {};
  },
};
