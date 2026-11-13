/**
 * Duas Verdades e Uma Mentira — host-authoritative.
 * WRITING_STATEMENTS → (para cada autor) SHOWCASE_VOTING → STATEMENT_REVEAL → ROUND_SUMMARY → próximo ciclo / FINISHED.
 * `lieIndex` de cada trio vive só no segredo do anfitrião até a revelação daquele autor.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, customContent, mergePools, pick, shuffle } from '../../core/engine/helpers';
import { sanitizeShortText } from '../../lib/textUtils';
import { pushNotice, type PrivateNotice } from '../_shared/notice';
import { DV_LIES, DV_TRUTHS } from './catalog';

export type DvPhase = 'WRITING_STATEMENTS' | 'SHOWCASE_VOTING' | 'STATEMENT_REVEAL' | 'ROUND_SUMMARY' | 'FINISHED';
export type DvKey = 'A' | 'B' | 'C';
export const DV_KEYS: DvKey[] = ['A', 'B', 'C'];

export const MAX_STATEMENT = 120;
export const CORRECT_POINTS = 100;
export const FOOLED_POINTS = 50;
export const REVEAL_MS = 9_000;
const SUMMARY_MS = 8_000;

export interface DvReveal {
  authorId: string;
  lieKey: DvKey;
  votes: Record<string, DvKey>;
  correct: string[];
  fooled: string[];
  delta: Record<string, number>;
}

export interface DvState extends BasePublicState {
  phase: DvPhase;
  participants: string[];
  submittedIds: string[];
  /** Fila de autores (embaralhada pelo anfitrião) e posição atual. */
  queue: string[];
  queuePos: number;
  currentAuthorId: string | null;
  /** Afirmações do autor da vez, embaralhadas como A/B/C — sem indicar a mentira. */
  statements: { key: DvKey; text: string }[];
  votedIds: string[];
  reveal: DvReveal | null;
  /** Pontos acumulados no ciclo (resumo). */
  cycleDelta: Record<string, number>;
}

interface Trio {
  statements: [string, string, string];
  lieIndex: number;
}

export interface DvSecret {
  trios: Record<string, Trio>;
  /** Para o autor atual: chave pública → índice original. */
  keyMap: Record<DvKey, number> | null;
  votes: Record<string, DvKey>;
  suggestions: Record<string, Trio & { count: number }>;
  notices: Record<string, PrivateNotice>;
  truths: string[];
  lies: string[];
  scored: string[];
}

export interface DvView {
  myTrio: Trio | null;
  suggestion: (Trio & { count: number }) | null;
  myVote: DvKey | null;
  notice: PrivateNotice | null;
}

type Draft = GameDraft<DvState, DvSecret>;

function startCycle(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  sec.trios = {};
  sec.keyMap = null;
  sec.votes = {};
  sec.suggestions = {};
  Object.assign(pub, {
    phase: 'WRITING_STATEMENTS',
    submittedIds: [],
    queue: [],
    queuePos: 0,
    currentAuthorId: null,
    statements: [],
    votedIds: [],
    reveal: null,
    cycleDelta: {},
    roundLabel: `Ciclo ${pub.round} de ${pub.totalRounds}`,
    endsAt: ctx.now + cfgNum(ctx, 'writeTimeSeconds', 60) * 1000,
  } satisfies Partial<DvState>);
}

function voters(pub: DvState) {
  return pub.participants.filter((id) => id !== pub.currentAuthorId);
}

function showAuthor(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const author = pub.queue[pub.queuePos];
  const trio = sec.trios[author];
  const order = shuffle([0, 1, 2], ctx.rng);
  sec.keyMap = { A: order[0], B: order[1], C: order[2] };
  sec.votes = {};
  pub.currentAuthorId = author;
  pub.statements = DV_KEYS.map((k) => ({ key: k, text: trio.statements[sec.keyMap![k]] }));
  pub.votedIds = [];
  pub.reveal = null;
  pub.phase = 'SHOWCASE_VOTING';
  pub.endsAt = ctx.now + cfgNum(ctx, 'voteTimeSeconds', 25) * 1000;
}

function closeWriting(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  pub.queue = shuffle(Object.keys(sec.trios).filter((id) => pub.participants.includes(id)), ctx.rng);
  pub.queuePos = 0;
  if (pub.queue.length === 0) {
    ctx.log('Ninguém enviou afirmações neste ciclo');
    toSummary(d, ctx);
    return;
  }
  showAuthor(d, ctx);
}

/** Pontuação: votante que achou a mentira +100; autor +50 por votante enganado. */
export function scoreShowcase(author: string, lieKey: DvKey, votes: Record<string, DvKey>) {
  const delta: Record<string, number> = {};
  const correct: string[] = [];
  const fooled: string[] = [];
  Object.entries(votes).forEach(([voter, key]) => {
    if (voter === author) return;
    if (key === lieKey) {
      correct.push(voter);
      delta[voter] = (delta[voter] ?? 0) + CORRECT_POINTS;
    } else {
      fooled.push(voter);
      delta[author] = (delta[author] ?? 0) + FOOLED_POINTS;
    }
  });
  return { delta, correct, fooled };
}

function revealAuthor(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const author = pub.currentAuthorId!;
  const trio = sec.trios[author];
  const lieKey = DV_KEYS.find((k) => sec.keyMap?.[k] === trio.lieIndex) ?? 'A';
  const { delta, correct, fooled } = scoreShowcase(author, lieKey, sec.votes);
  const key = `scored_${pub.round}_${author}`;
  if (!sec.scored.includes(key)) {
    sec.scored = [...sec.scored, key];
    Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
    correct.forEach((id) => ctx.stat(id, 'perfect'));
    fooled.forEach((id) => {
      ctx.stat(id, 'miss');
      ctx.stat(author, 'bluff');
    });
    const cd = { ...pub.cycleDelta };
    Object.entries(delta).forEach(([id, pts]) => (cd[id] = (cd[id] ?? 0) + pts));
    pub.cycleDelta = cd;
  }
  pub.reveal = { authorId: author, lieKey, votes: { ...sec.votes }, correct, fooled, delta };
  pub.phase = 'STATEMENT_REVEAL';
  pub.endsAt = ctx.now + REVEAL_MS;
}

function toSummary(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'ROUND_SUMMARY';
  d.pub.currentAuthorId = null;
  d.pub.endsAt = ctx.now + SUMMARY_MS;
}

function afterReveal(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  if (pub.queuePos + 1 < pub.queue.length) {
    pub.queuePos += 1;
    showAuthor(d, ctx);
  } else toSummary(d, ctx);
}

function afterSummary(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  if (pub.round >= pub.totalRounds) {
    pub.phase = 'FINISHED';
    pub.endsAt = null;
    return;
  }
  pub.round += 1;
  startCycle(d, ctx);
}

export function createDv(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const { mode, items } = customContent(ctx);
  const customTruths = items.filter((it) => it.parts[1] !== 'mentira').map((it) => it.text);
  const customLies = items.filter((it) => it.parts[1] === 'mentira').map((it) => it.text);
  const truths = mergePools(DV_TRUTHS, customTruths, mode);
  const lies = mergePools(DV_LIES, customLies, customLies.length ? mode : 'official');
  const pub = {
    round: 1,
    totalRounds: cfgNum(ctx, 'cycles', 1),
    endsAt: null,
    participants: players.map((p) => p.id),
  } as DvState;
  const d: Draft = { pub, sec: { trios: {}, keyMap: null, votes: {}, suggestions: {}, notices: {}, truths, lies, scored: [] } };
  startCycle(d, ctx);
  return d;
}

function makeSuggestion(sec: DvSecret, ctx: EngineCtx): Trio {
  const t = shuffle(sec.truths.length >= 2 ? sec.truths : DV_TRUTHS, ctx.rng).slice(0, 2);
  const lie = pick(sec.lies.length ? sec.lies : DV_LIES, ctx.rng);
  const lieIndex = Math.floor(ctx.rng() * 3);
  const statements = [...t];
  statements.splice(lieIndex, 0, lie);
  return { statements: statements.slice(0, 3) as [string, string, string], lieIndex };
}

export const dvEngine: GameEngine<DvState, DvSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    switch (a.type) {
      case 'SUGGEST': {
        if (pub.phase !== 'WRITING_STATEMENTS' || sec.trios[from]) return false;
        const prev = sec.suggestions[from];
        if (prev && prev.count >= 5) return false;
        sec.suggestions[from] = { ...makeSuggestion(sec, ctx), count: (prev?.count ?? 0) + 1 };
        return true;
      }
      case 'SUBMIT': {
        if (pub.phase !== 'WRITING_STATEMENTS' || sec.trios[from]) return false;
        const raw = Array.isArray(a.statements) ? (a.statements as unknown[]) : [];
        const statements = [0, 1, 2].map((i) => sanitizeShortText(String(raw[i] ?? ''), MAX_STATEMENT));
        const lieIndex = Number(a.lieIndex);
        if (statements.some((s) => !s) || ![0, 1, 2].includes(lieIndex)) {
          pushNotice(sec.notices, from, ctx.now, 'Preencha as 3 afirmações e marque qual delas é a MENTIRA.');
          return true;
        }
        sec.trios[from] = { statements: statements as [string, string, string], lieIndex };
        pub.submittedIds = [...pub.submittedIds, from];
        const pending = pub.participants.filter((id) => !sec.trios[id] && ctx.isOnline(id));
        if (pending.length === 0) closeWriting(d, ctx);
        return true;
      }
      case 'VOTE': {
        if (pub.phase !== 'SHOWCASE_VOTING' || from === pub.currentAuthorId || sec.votes[from]) return false;
        const key = String(a.key) as DvKey;
        if (!DV_KEYS.includes(key)) return false;
        sec.votes[from] = key;
        pub.votedIds = [...pub.votedIds, from];
        const pending = voters(pub).filter((id) => !sec.votes[id] && ctx.isOnline(id));
        if (pending.length === 0) revealAuthor(d, ctx);
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
      case 'WRITING_STATEMENTS':
        closeWriting(d, ctx);
        return true;
      case 'SHOWCASE_VOTING':
        revealAuthor(d, ctx);
        return true;
      case 'STATEMENT_REVEAL':
        afterReveal(d, ctx);
        return true;
      case 'ROUND_SUMMARY':
        afterSummary(d, ctx);
        return true;
      default:
        return false;
    }
  },
  skip(d, ctx) {
    d.pub.endsAt = ctx.now;
    return dvEngine.tick(d, ctx);
  },
  views(d, players) {
    const { sec } = d;
    const out: Record<string, DvView> = {};
    players.forEach((p) => {
      out[p.id] = {
        myTrio: sec.trios[p.id] ?? null,
        suggestion: sec.suggestions[p.id] ?? null,
        myVote: sec.votes[p.id] ?? null,
        notice: sec.notices[p.id] ?? null,
      };
    });
    return out;
  },
};
