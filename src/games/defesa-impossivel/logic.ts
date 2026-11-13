/**
 * Defesa Impossível — o Defensor da vez defende uma tese absurda; o júri avalia.
 * THESIS_ASSIGNMENT (15s, troca 1x) → DEFENSE_PRESENTATION (30–90s, quadro de argumentos ao vivo)
 * → JURY_VOTING (20s) → VERDICT_REVEAL → próximo Defensor / FINISHED.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, customContent, mergePools, pickUnused, shuffle } from '../../core/engine/helpers';
import { sanitizeShortText } from '../../lib/textUtils';
import { ABSURD_THESES } from './catalog';

export type DiPhase = 'THESIS_ASSIGNMENT' | 'DEFENSE_PRESENTATION' | 'JURY_VOTING' | 'VERDICT_REVEAL' | 'FINISHED';
export type JuryLevel = 'genial' | 'bem' | 'forcou' | 'vergonha';

export const JURY_LEVELS: { key: JuryLevel; emoji: string; label: string; points: number }[] = [
  { key: 'genial', emoji: '🏆', label: 'Absolvição Total / Argumento Genial', points: 100 },
  { key: 'bem', emoji: '👏', label: 'Mandou Bem / Quase Me Convenceu', points: 70 },
  { key: 'forcou', emoji: '🤨', label: 'Forçou a Barra, mas Tentou', points: 40 },
  { key: 'vergonha', emoji: '🍅', label: 'Sem Chance / Passou Vergonha', points: 10 },
];
const POINTS: Record<JuryLevel, number> = { genial: 100, bem: 70, forcou: 40, vergonha: 10 };

export const ASSIGN_MS = 15_000;
export const JURY_MS = 20_000;
const VERDICT_MS = 8_000;
const MAX_NOTES = 8;
export const MAX_NOTE = 140;

export interface DiState extends BasePublicState {
  phase: DiPhase;
  participants: string[];
  order: string[];
  turnIndex: number;
  defenderId: string;
  thesis: string;
  swapUsed: boolean;
  defenseMs: number;
  notes: string[];
  jurors: string[];
  votedIds: string[];
  verdict: { votes: Record<string, JuryLevel>; points: number; avg: number; skipped: boolean } | null;
}

export interface DiSecret {
  votes: Record<string, JuryLevel>;
  pool: { id: string; text: string }[];
  scored: string[];
}

export interface DiView {
  myVote: JuryLevel | null;
}

type Draft = GameDraft<DiState, DiSecret>;

function draw(d: Draft, ctx: EngineCtx) {
  return pickUnused(d.sec.pool, (t) => t.id, ctx).text;
}

function startTurn(d: Draft, index: number, ctx: EngineCtx) {
  const { pub, sec } = d;
  sec.votes = {};
  Object.assign(pub, {
    phase: 'THESIS_ASSIGNMENT',
    turnIndex: index,
    round: index + 1,
    defenderId: pub.order[index % pub.order.length],
    thesis: draw(d, ctx),
    swapUsed: false,
    notes: [],
    jurors: [],
    votedIds: [],
    verdict: null,
    endsAt: ctx.now + ASSIGN_MS,
  } satisfies Partial<DiState>);
}

function startDefense(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'DEFENSE_PRESENTATION';
  d.pub.endsAt = ctx.now + d.pub.defenseMs;
}

function toJury(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  pub.jurors = pub.participants.filter((id) => id !== pub.defenderId && ctx.isOnline(id));
  pub.votedIds = [];
  pub.phase = 'JURY_VOTING';
  pub.endsAt = ctx.now + JURY_MS;
  if (pub.jurors.length === 0) verdict(d, ctx);
}

/** Média (padrão) ou soma direta dos pontos dados pelos jurados. */
export function juryScore(votes: Record<string, JuryLevel>, mode: 'average' | 'sum') {
  const values = Object.values(votes).map((v) => POINTS[v]).filter((n) => Number.isFinite(n));
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? sum / values.length : 0;
  return { points: mode === 'sum' ? sum : Math.round(avg), avg: Math.round(avg * 10) / 10 };
}

function verdict(d: Draft, ctx: EngineCtx, skipped = false) {
  const { pub, sec } = d;
  const mode = cfgStr(ctx, 'scoring', 'average') === 'sum' ? 'sum' : 'average';
  const { points, avg } = juryScore(sec.votes, mode);
  const key = `scored_turn_${pub.turnIndex}`;
  if (!skipped && !sec.scored.includes(key)) {
    sec.scored = [...sec.scored, key];
    ctx.award(pub.defenderId, points);
    ctx.stat(pub.defenderId, avg >= 70 ? 'perfect' : 'miss');
  }
  pub.verdict = { votes: { ...sec.votes }, points: skipped ? 0 : points, avg, skipped };
  pub.phase = 'VERDICT_REVEAL';
  pub.endsAt = ctx.now + VERDICT_MS;
}

function next(d: Draft, ctx: EngineCtx) {
  const i = d.pub.turnIndex + 1;
  if (i >= d.pub.totalRounds) {
    d.pub.phase = 'FINISHED';
    d.pub.endsAt = null;
    return;
  }
  startTurn(d, i, ctx);
}

export function createDi(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const { mode, items } = customContent(ctx);
  const official = ABSURD_THESES.map((t, i) => ({ id: `di:${i}`, text: t }));
  const pool = mergePools(official, items.map((it) => ({ id: it.id, text: it.text })), mode);
  const order = shuffle(players.map((p) => p.id), ctx.rng);
  const pub = {
    round: 1,
    totalRounds: order.length * cfgNum(ctx, 'thesesPerPlayer', 1),
    endsAt: null,
    participants: order,
    order,
    defenseMs: Math.min(90, Math.max(30, cfgNum(ctx, 'defenseSeconds', 45))) * 1000,
  } as DiState;
  const d: Draft = { pub, sec: { votes: {}, pool, scored: [] } };
  startTurn(d, 0, ctx);
  return d;
}

export const diEngine: GameEngine<DiState, DiSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    switch (a.type) {
      case 'SWAP':
        if (pub.phase !== 'THESIS_ASSIGNMENT' || from !== pub.defenderId || pub.swapUsed) return false;
        pub.thesis = draw(d, ctx);
        pub.swapUsed = true;
        return true;
      case 'START':
        if (pub.phase !== 'THESIS_ASSIGNMENT' || from !== pub.defenderId) return false;
        startDefense(d, ctx);
        return true;
      case 'NOTE': {
        if (pub.phase !== 'DEFENSE_PRESENTATION' || from !== pub.defenderId || pub.notes.length >= MAX_NOTES) return false;
        const text = sanitizeShortText(String(a.text ?? ''), MAX_NOTE);
        if (!text) return false;
        pub.notes = [...pub.notes, text];
        return true;
      }
      case 'END_DEFENSE':
        if (pub.phase !== 'DEFENSE_PRESENTATION' || from !== pub.defenderId) return false;
        toJury(d, ctx);
        return true;
      case 'VOTE': {
        const level = String(a.level) as JuryLevel;
        if (pub.phase !== 'JURY_VOTING' || !pub.jurors.includes(from) || sec.votes[from] || !(level in POINTS)) return false;
        sec.votes[from] = level;
        pub.votedIds = [...pub.votedIds, from];
        const pending = pub.jurors.filter((id) => !sec.votes[id] && ctx.isOnline(id));
        if (pending.length === 0) verdict(d, ctx);
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
      case 'THESIS_ASSIGNMENT':
        // Defensor desconectado: turno pulado sem travar
        if (!ctx.isOnline(pub.defenderId)) {
          ctx.log('Defensor desconectado — turno pulado');
          verdict(d, ctx, true);
        } else startDefense(d, ctx);
        return true;
      case 'DEFENSE_PRESENTATION':
        toJury(d, ctx);
        return true;
      case 'JURY_VOTING':
        verdict(d, ctx);
        return true;
      case 'VERDICT_REVEAL':
        next(d, ctx);
        return true;
      default:
        return false;
    }
  },
  skip(d, ctx) {
    d.pub.endsAt = ctx.now;
    return diEngine.tick(d, ctx);
  },
  views(d, players) {
    const out: Record<string, DiView> = {};
    players.forEach((p) => (out[p.id] = { myVote: d.sec.votes[p.id] ?? null }));
    return out;
  },
};
