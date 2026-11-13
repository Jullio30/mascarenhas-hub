/**
 * Telefone de Palavras — corrente de associações.
 * INITIAL_WORD_SETUP → CHAIN_PROGRESSION (1 elo por vez, 15s; desconectado/timeout pula mantendo a última palavra)
 * → CONNECTION_EVALUATION (nota 1–5 + voto opcional no elo mais criativo) → ROUND_SUMMARY → próxima rodada (início rotaciona).
 * Repetições de palavras são permitidas.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, customContent, mergePools, pickUnused, shuffle } from '../../core/engine/helpers';
import { sanitizeShortText } from '../../lib/textUtils';
import { INITIAL_WORDS } from './catalog';

export type TpPhase = 'INITIAL_WORD_SETUP' | 'CHAIN_PROGRESSION' | 'CONNECTION_EVALUATION' | 'ROUND_SUMMARY' | 'FINISHED';
export type InitialMode = 'catalog' | 'free' | 'hybrid';

export const MAX_WORD = 30;
export const EVAL_MS = 20_000;
export const CREATIVE_POINTS = 50;
const SETUP_CATALOG_MS = 4_000;
const SUMMARY_MS = 10_000;
const OFFLINE_SKIP_MS = 2_000;

export interface ChainLink {
  word: string;
  /** null = palavra sorteada pelo sistema. */
  authorId: string | null;
}

export interface TpState extends BasePublicState {
  phase: TpPhase;
  participants: string[];
  initialMode: InitialMode;
  /** Ordem dos jogadores na rodada (rotaciona a cada rodada). */
  order: string[];
  /** Quem joga em cada elo da corrente. */
  slots: string[];
  slotPos: number;
  activeId: string | null;
  setterId: string;
  chain: ChainLink[];
  skipped: string[];
  turnStartedAt: number;
  ratedIds: string[];
  result: {
    avg: number;
    label: string;
    ratings: Record<string, number>;
    creative: Record<string, number>;
    delta: Record<string, number>;
  } | null;
}

export interface TpSecret {
  ratings: Record<string, { stars: number; creative: number | null }>;
  pool: { id: string; text: string }[];
  scored: string[];
}

export interface TpView {
  myRating: { stars: number; creative: number | null } | null;
}

type Draft = GameDraft<TpState, TpSecret>;

export function connectionLabel(avg: number): string {
  if (avg >= 4.5) return 'Conexão Absurdamente Genial!';
  if (avg >= 3.5) return 'Conexão Muito Boa!';
  if (avg >= 2.5) return 'Faz algum sentido…';
  if (avg >= 1.5) return 'Forçou a barra!';
  return 'Nada a ver — quebrou tudo!';
}

function lapsFor(ctx: EngineCtx, n: number): number {
  const laps = cfgStr(ctx, 'laps', 'auto');
  if (laps === '1') return 1;
  if (laps === '2') return 2;
  return n <= 4 ? 2 : 1;
}

function drawWord(d: Draft, ctx: EngineCtx): string {
  return pickUnused(d.sec.pool.length ? d.sec.pool : INITIAL_WORDS.map((w, i) => ({ id: `tp:${i}`, text: w })), (w) => w.id, ctx).text;
}

function startRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const base = pub.participants;
  const online = base.filter((id) => ctx.isOnline(id));
  const rot = (pub.round - 1) % base.length;
  const rotated = [...base.slice(rot), ...base.slice(0, rot)];
  const order = online.length >= 2 ? rotated.filter((id) => online.includes(id)) : rotated;
  const laps = lapsFor(ctx, order.length);
  const total = order.length * laps;
  const setter = order[0];
  sec.ratings = {};
  Object.assign(pub, {
    order,
    setterId: setter,
    chain: [],
    skipped: [],
    ratedIds: [],
    result: null,
    slotPos: 0,
    activeId: setter,
    turnStartedAt: ctx.now,
  } satisfies Partial<TpState>);
  if (pub.initialMode === 'catalog') {
    // palavra sorteada pelo sistema; todos os jogadores adicionam elos
    pub.chain = [{ word: drawWord(d, ctx), authorId: null }];
    pub.slots = Array.from({ length: total }, (_, i) => order[i % order.length]);
    pub.phase = 'INITIAL_WORD_SETUP';
    pub.activeId = null;
    pub.endsAt = ctx.now + SETUP_CATALOG_MS;
  } else {
    // o 1º jogador define a palavra inicial (que conta como o elo dele)
    pub.slots = Array.from({ length: total - 1 }, (_, i) => order[(i + 1) % order.length]);
    pub.phase = 'INITIAL_WORD_SETUP';
    pub.endsAt = ctx.now + cfgNum(ctx, 'turnSeconds', 15) * 1000;
  }
}

function beginChain(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'CHAIN_PROGRESSION';
  d.pub.slotPos = -1;
  nextTurn(d, ctx);
}

function nextTurn(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  pub.slotPos += 1;
  if (pub.slotPos >= pub.slots.length) return toEvaluation(d, ctx);
  pub.activeId = pub.slots[pub.slotPos];
  pub.turnStartedAt = ctx.now;
  pub.endsAt = ctx.now + cfgNum(ctx, 'turnSeconds', 15) * 1000;
}

function skipTurn(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  if (pub.activeId) pub.skipped = [...pub.skipped, pub.activeId];
  nextTurn(d, ctx);
}

function toEvaluation(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  pub.activeId = null;
  if (pub.chain.length < 2) {
    ctx.log('A corrente não andou — rodada sem avaliação');
    pub.result = { avg: 0, label: 'Corrente vazia', ratings: {}, creative: {}, delta: {} };
    pub.phase = 'ROUND_SUMMARY';
    pub.endsAt = ctx.now + SUMMARY_MS;
    return;
  }
  pub.phase = 'CONNECTION_EVALUATION';
  pub.ratedIds = [];
  pub.endsAt = ctx.now + EVAL_MS;
}

/** Base coletiva round(média × 20) para cada membro da corrente + 50 por voto de “Elo Mais Criativo”. */
export function scoreChain(chain: ChainLink[], ratings: Record<string, { stars: number; creative: number | null }>) {
  const stars = Object.values(ratings).map((r) => r.stars).filter((n) => n >= 1 && n <= 5);
  const avg = stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : 0;
  const base = Math.round(avg * 20);
  const delta: Record<string, number> = {};
  const members = Array.from(new Set(chain.map((l) => l.authorId).filter((x): x is string => Boolean(x))));
  if (base > 0) members.forEach((id) => (delta[id] = base));
  const creative: Record<string, number> = {};
  Object.entries(ratings).forEach(([voter, r]) => {
    if (r.creative === null || r.creative === undefined) return;
    const link = chain[r.creative];
    if (!link?.authorId || link.authorId === voter) return;
    creative[link.authorId] = (creative[link.authorId] ?? 0) + 1;
    delta[link.authorId] = (delta[link.authorId] ?? 0) + CREATIVE_POINTS;
  });
  return { avg: Math.round(avg * 10) / 10, delta, creative };
}

function finishEvaluation(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const { avg, delta, creative } = scoreChain(pub.chain, sec.ratings);
  const ratings: Record<string, number> = {};
  Object.entries(sec.ratings).forEach(([id, r]) => (ratings[id] = r.stars));
  pub.result = { avg, label: avg ? connectionLabel(avg) : 'Ninguém avaliou', ratings, creative, delta };
  const key = `scored_round_${pub.round}`;
  if (!sec.scored.includes(key)) {
    sec.scored = [...sec.scored, key];
    Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
    Object.keys(creative).forEach((id) => ctx.stat(id, 'perfect'));
  }
  pub.phase = 'ROUND_SUMMARY';
  pub.endsAt = ctx.now + SUMMARY_MS;
}

export function createTp(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const { mode, items } = customContent(ctx);
  const official = INITIAL_WORDS.map((w, i) => ({ id: `tp:${i}`, text: w }));
  const pool = mergePools(official, items.map((it) => ({ id: it.id, text: it.text.slice(0, MAX_WORD) })), mode);
  const mode0 = cfgStr(ctx, 'initialMode', 'catalog');
  const pub = {
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 3),
    endsAt: null,
    participants: shuffle(players.map((p) => p.id), ctx.rng),
    initialMode: (['catalog', 'free', 'hybrid'].includes(mode0) ? mode0 : 'catalog') as InitialMode,
  } as TpState;
  const d: Draft = { pub, sec: { ratings: {}, pool, scored: [] } };
  startRound(d, ctx);
  return d;
}

export const tpEngine: GameEngine<TpState, TpSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    switch (a.type) {
      case 'SET_INITIAL': {
        if (pub.phase !== 'INITIAL_WORD_SETUP' || pub.initialMode === 'catalog' || from !== pub.setterId) return false;
        const random = Boolean(a.random) && pub.initialMode === 'hybrid';
        const word = random ? drawWord(d, ctx) : sanitizeShortText(String(a.word ?? ''), MAX_WORD);
        if (!word) return false;
        pub.chain = [{ word, authorId: random ? null : from }];
        // sorteou em vez de digitar: o 1º jogador também ganha um elo na corrente
        if (random) pub.slots = [from, ...pub.slots];
        beginChain(d, ctx);
        return true;
      }
      case 'WORD': {
        if (pub.phase !== 'CHAIN_PROGRESSION' || from !== pub.activeId) return false;
        const word = sanitizeShortText(String(a.word ?? ''), MAX_WORD);
        if (!word) return false; // repetições são permitidas
        pub.chain = [...pub.chain, { word, authorId: from }];
        nextTurn(d, ctx);
        return true;
      }
      case 'RATE': {
        if (pub.phase !== 'CONNECTION_EVALUATION' || sec.ratings[from]) return false;
        const stars = Math.round(Number(a.stars));
        if (!(stars >= 1 && stars <= 5)) return false;
        const c = a.creative === null || a.creative === undefined ? null : Number(a.creative);
        const valid = c !== null && Number.isInteger(c) && pub.chain[c]?.authorId && pub.chain[c].authorId !== from ? c : null;
        sec.ratings[from] = { stars, creative: valid };
        pub.ratedIds = [...pub.ratedIds, from];
        const pending = pub.participants.filter((id) => !sec.ratings[id] && ctx.isOnline(id));
        if (pending.length === 0) finishEvaluation(d, ctx);
        return true;
      }
      default:
        return false;
    }
  },
  tick(d, ctx) {
    const { pub } = d;
    if (pub.phase === 'FINISHED' || !pub.endsAt) return false;
    if (pub.phase === 'INITIAL_WORD_SETUP') {
      if (ctx.now < pub.endsAt) {
        // 1º jogador desconectado: não trava, sorteia a palavra
        if (pub.initialMode !== 'catalog' && !ctx.isOnline(pub.setterId) && ctx.now - pub.turnStartedAt > OFFLINE_SKIP_MS) {
          pub.chain = [{ word: drawWord(d, ctx), authorId: null }];
          beginChain(d, ctx);
          return true;
        }
        return false;
      }
      if (pub.initialMode !== 'catalog') pub.chain = [{ word: drawWord(d, ctx), authorId: null }];
      beginChain(d, ctx);
      return true;
    }
    if (pub.phase === 'CHAIN_PROGRESSION') {
      const offline = pub.activeId && !ctx.isOnline(pub.activeId) && ctx.now - pub.turnStartedAt > OFFLINE_SKIP_MS;
      if (ctx.now < pub.endsAt && !offline) return false;
      skipTurn(d, ctx);
      return true;
    }
    if (ctx.now < pub.endsAt) return false;
    if (pub.phase === 'CONNECTION_EVALUATION') {
      finishEvaluation(d, ctx);
      return true;
    }
    if (pub.phase === 'ROUND_SUMMARY') {
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
  skip(d, ctx) {
    const { pub } = d;
    if (pub.phase === 'CHAIN_PROGRESSION') {
      skipTurn(d, ctx);
      return true;
    }
    pub.endsAt = ctx.now;
    return tpEngine.tick(d, ctx);
  },
  views(d, players) {
    const out: Record<string, TpView> = {};
    players.forEach((p) => (out[p.id] = { myRating: d.sec.ratings[p.id] ?? null }));
    return out;
  },
};
