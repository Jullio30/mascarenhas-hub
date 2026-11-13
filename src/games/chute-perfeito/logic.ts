/**
 * Chute Perfeito — palpites numéricos secretos.
 * GUESSING_PHASE (valor correto e palpites só no segredo) → REVEAL_AND_SCORING → próxima pergunta / FINISHED.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, customContent, mergePools, pickUnused } from '../../core/engine/helpers';
import { CHUTE_CATALOG, CHUTE_CATEGORY_LABEL, type ChuteQuestion } from './catalog';

export type ChutePhase = 'GUESSING_PHASE' | 'REVEAL_AND_SCORING' | 'FINISHED';
export const REVEAL_MS = 14_000;
export const EXACT_BONUS = 200;
export const PLACEMENT_POINTS = [300, 200, 100];
const MAX_ABS = 1e15;

export interface ChuteRow {
  playerId: string;
  guess: number;
  error: number;
  relError: number;
  placement: number | null;
  precisionPoints: number;
  placementPoints: number;
  exact: boolean;
  total: number;
}

export interface ChuteState extends BasePublicState {
  phase: ChutePhase;
  participants: string[];
  question: { id: string; text: string; unit: string; isYear: boolean; categoryLabel: string };
  answeredIds: string[];
  reveal: { correctValue: number; note: string | null; rows: ChuteRow[]; noGuess: string[] } | null;
}

export interface ChuteSecret {
  correctValue: number;
  note: string | null;
  guesses: Record<string, number>;
  pool: ChuteQuestion[];
  scored: string[];
}

export interface ChuteView {
  myGuess: number | null;
}

type Draft = GameDraft<ChuteState, ChuteSecret>;

/**
 * Fórmula oficial:
 *  E = |palpite − correto|; S = 500 para anos, senão max(|correto|, 1); R = E / S.
 *  Precisão: E = 0 → 500 + 200 (cravada); 0 < R ≤ 1 → round(500·(1−R)²); 1 < R ≤ 2 → round(50·(2−R)); R > 2 → 0.
 *  Colocação (só R ≤ 5), por menor E: 1º +300, 2º +200, 3º +100. Empate de E → mesma colocação e mesmos pontos
 *  (ranking de competição: 1º, 1º, 3º).
 */
export function scoreGuesses(guesses: Record<string, number>, correct: number, isYear: boolean): ChuteRow[] {
  const S = isYear ? 500 : Math.max(Math.abs(correct), 1);
  const rows: ChuteRow[] = Object.entries(guesses).map(([playerId, guess]) => {
    const error = Math.abs(guess - correct);
    const relError = error / S;
    const exact = error === 0;
    let precisionPoints = 0;
    if (exact) precisionPoints = 500 + EXACT_BONUS;
    else if (relError <= 1) precisionPoints = Math.round(500 * Math.pow(1 - relError, 2));
    else if (relError <= 2) precisionPoints = Math.round(50 * (2 - relError));
    return { playerId, guess, error, relError, placement: null, precisionPoints, placementPoints: 0, exact, total: 0 };
  });
  const eligible = rows.filter((r) => r.relError <= 5).sort((a, b) => a.error - b.error);
  eligible.forEach((r, i) => {
    const prev = eligible[i - 1];
    r.placement = prev && prev.error === r.error ? prev.placement : i + 1;
    r.placementPoints = r.placement !== null && r.placement <= 3 ? PLACEMENT_POINTS[r.placement - 1] : 0;
  });
  rows.forEach((r) => (r.total = r.precisionPoints + r.placementPoints));
  return rows.sort((a, b) => a.error - b.error || a.playerId.localeCompare(b.playerId));
}

function startRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const cat = cfgStr(ctx, 'category', 'all');
  const filtered = cat === 'all' ? sec.pool : sec.pool.filter((q) => q.category === cat || q.id.startsWith('cp:'));
  const q = pickUnused(filtered.length ? filtered : sec.pool, (x) => x.id, ctx);
  sec.correctValue = q.value;
  sec.note = q.note ?? null;
  sec.guesses = {};
  pub.phase = 'GUESSING_PHASE';
  pub.question = { id: q.id, text: q.text, unit: q.unit, isYear: Boolean(q.isYear), categoryLabel: q.id.startsWith('cp:') ? CHUTE_CATEGORY_LABEL.custom : CHUTE_CATEGORY_LABEL[q.category] };
  pub.answeredIds = [];
  pub.reveal = null;
  pub.endsAt = ctx.now + cfgNum(ctx, 'guessTimeSeconds', 25) * 1000;
}

function reveal(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const rows = scoreGuesses(sec.guesses, sec.correctValue, pub.question.isYear);
  const key = `scored_round_${pub.round}`;
  if (!sec.scored.includes(key)) {
    sec.scored = [...sec.scored, key];
    rows.forEach((r) => {
      ctx.award(r.playerId, r.total);
      ctx.stat(r.playerId, r.placement === 1 || r.exact ? 'perfect' : 'miss');
    });
  }
  pub.reveal = { correctValue: sec.correctValue, note: sec.note, rows, noGuess: pub.participants.filter((id) => !(id in sec.guesses)) };
  pub.phase = 'REVEAL_AND_SCORING';
  pub.endsAt = ctx.now + REVEAL_MS;
}

export function createChute(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const { mode, items } = customContent(ctx);
  const custom: ChuteQuestion[] = items
    .filter((it) => Number.isFinite(Number(it.parts[1])))
    .map((it) => ({ id: it.id, category: 'cultura', text: it.text, value: Number(it.parts[1]), unit: it.parts[2] || '', isYear: it.parts[3] === 'ano' }));
  const pool = mergePools(CHUTE_CATALOG, custom, mode);
  const pub = {
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 8),
    endsAt: null,
    participants: players.map((p) => p.id),
  } as ChuteState;
  const d: Draft = { pub, sec: { correctValue: 0, note: null, guesses: {}, pool, scored: [] } };
  startRound(d, ctx);
  return d;
}

export const chuteEngine: GameEngine<ChuteState, ChuteSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (a.type !== 'GUESS' || pub.phase !== 'GUESSING_PHASE' || !pub.participants.includes(from)) return false;
    if (from in sec.guesses) return false; // idempotente: 1 palpite por jogador
    const value = Number(a.value);
    if (!Number.isFinite(value) || Math.abs(value) > MAX_ABS) return false;
    sec.guesses[from] = value;
    pub.answeredIds = [...pub.answeredIds, from];
    const pending = pub.participants.filter((id) => !(id in sec.guesses) && ctx.isOnline(id));
    if (pending.length === 0) reveal(d, ctx);
    return true;
  },
  tick(d, ctx) {
    const { pub } = d;
    if (!pub.endsAt || ctx.now < pub.endsAt) return false;
    if (pub.phase === 'GUESSING_PHASE') {
      reveal(d, ctx);
      return true;
    }
    if (pub.phase === 'REVEAL_AND_SCORING') {
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
    const out: Record<string, ChuteView> = {};
    players.forEach((p) => (out[p.id] = { myGuess: d.sec.guesses[p.id] ?? null }));
    return out;
  },
};
