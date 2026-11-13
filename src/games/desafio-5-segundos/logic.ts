/**
 * Desafio dos 10 Segundos (slug interno mantido: `desafio-5-segundos`, para não quebrar salas/configs salvas).
 *
 * Fluxo: TURN_PREPARATION → COUNTDOWN_ACTIVE (jogador da vez digita até N respostas em T segundos;
 * o rascunho é enviado ao vivo e tudo que estiver digitado quando o tempo zera entra na submissão)
 * → PEER_VALIDATION (UMA única fase: cada outro jogador marca 👍/👎 em cada resposta)
 * → ROUND_SUMMARY (+1 ponto por voto favorável recebido em cada resposta) → próximo jogador.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import type { FiveSecCategory, FiveSecPrompt } from '../../data/defaultPacks';
import { cfgNum, cfgStr, customContent, mergePools, pickUnused, shuffle } from '../../core/engine/helpers';
import { normalize, sanitizeShortText } from '../../lib/textUtils';

export type D5Phase = 'TURN_PREPARATION' | 'COUNTDOWN_ACTIVE' | 'PEER_VALIDATION' | 'ROUND_SUMMARY' | 'FINISHED';
export type D10Prompt = Omit<FiveSecPrompt, 'category'> & { category: FiveSecCategory | 'Personalizado' };

export interface D5State extends BasePublicState {
  phase: D5Phase;
  order: string[];
  turnIndex: number;
  hotSeat: string;
  prompt: D10Prompt | null;
  countdownMs: number;
  answersPerTurn: number;
  /** Respostas do jogador da vez (atualizadas ao vivo durante o cronômetro). */
  answers: string[];
  finishedEarly: boolean;
  voters: string[];
  votedIds: string[];
  /** Votos por jogador, publicados no resumo: votes[voterId][i] = true (👍) | false (👎). */
  votes: Record<string, boolean[]> | null;
  /** 👍 recebidos por resposta (resumo). */
  upCounts: number[] | null;
  verdict: 'scored' | 'skipped' | 'empty' | null;
  points: number;
}

export interface D5Secret {
  nextPrompt: D10Prompt | null;
  votes: Record<string, boolean[]>;
  pool: D10Prompt[];
  /** chaves `scored_turn_${n}` (idempotência da pontuação) */
  scored: string[];
}

export interface D5View {
  myVotes: boolean[] | null;
}

type Draft = GameDraft<D5State, D5Secret>;

export const PREP_MS = 15_000;
export const VALIDATION_MS = 25_000;
const SUMMARY_MS = 7_000;
const TOLERANCE_MS = 3_000;
/** Janela para chegar o último rascunho digitado depois que o cronômetro zera. */
export const GRACE_MS = 1_200;
const MAX_ANSWER = 40;

/** "Cite 3 frutas vermelhas" → "Cite 5 frutas vermelhas"; temas personalizados ganham o "Cite N". */
export function promptText(p: D10Prompt, n: number): string {
  if (/^cite\s+\d+/i.test(p.text)) return p.text.replace(/^cite\s+\d+/i, `Cite ${n}`);
  if (/^(cite|diga|fale|nomeie|liste)\b/i.test(p.text)) return p.text;
  return `Cite ${n}: ${p.text}`;
}

function startTurn(d: Draft, index: number, ctx: EngineCtx) {
  const { pub, sec } = d;
  pub.turnIndex = index;
  pub.round = index + 1;
  pub.hotSeat = pub.order[index % pub.order.length];
  pub.phase = 'TURN_PREPARATION';
  pub.prompt = null;
  pub.answers = [];
  pub.finishedEarly = false;
  pub.voters = [];
  pub.votedIds = [];
  pub.votes = null;
  pub.upCounts = null;
  pub.verdict = null;
  pub.points = 0;
  pub.endsAt = ctx.now + PREP_MS;
  const cat = cfgStr(ctx, 'category', 'all');
  const filtered = cat === 'all' ? sec.pool : sec.pool.filter((p) => p.category === cat || p.category === 'Personalizado');
  const pool = filtered.length ? filtered : sec.pool;
  sec.nextPrompt = pickUnused(pool, (p) => 'd5:' + p.id, ctx);
  sec.votes = {};
}

function reveal(d: Draft, ctx: EngineCtx) {
  d.pub.prompt = d.sec.nextPrompt;
  d.pub.phase = 'COUNTDOWN_ACTIVE';
  d.pub.endsAt = ctx.now + d.pub.countdownMs;
}

function toValidation(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  // Remove vazias e respostas repetidas do mesmo jogador (sem diferenciar maiúsculas/acentos):
  // a mesma resposta digitada duas vezes não pode pontuar em dobro.
  const seen = new Set<string>();
  pub.answers = pub.answers
    .map((a) => (a ?? '').trim())
    .filter((a) => {
      if (!a) return false;
      const k = normalize(a) || a.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  if (pub.answers.length === 0) {
    pub.verdict = 'empty';
    pub.phase = 'ROUND_SUMMARY';
    pub.endsAt = ctx.now + SUMMARY_MS;
    ctx.stat(pub.hotSeat, 'miss');
    return;
  }
  pub.phase = 'PEER_VALIDATION';
  pub.voters = ctx.onlineIds().filter((id) => id !== pub.hotSeat && pub.order.includes(id));
  pub.votedIds = [];
  pub.endsAt = ctx.now + VALIDATION_MS;
  if (pub.voters.length === 0) resolve(d, ctx);
}

/** Pontuação exata: soma dos votos favoráveis recebidos por todas as respostas (👎 = 0). */
export function scoreAnswers(answerCount: number, votes: Record<string, boolean[]>, author: string) {
  const upCounts = Array.from({ length: answerCount }, () => 0);
  Object.entries(votes).forEach(([voter, list]) => {
    if (voter === author) return; // autor nunca vota nas próprias respostas
    list.slice(0, answerCount).forEach((up, i) => {
      if (up === true) upCounts[i] += 1;
    });
  });
  return { upCounts, points: upCounts.reduce((a, b) => a + b, 0) };
}

function resolve(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const key = `scored_turn_${pub.turnIndex}`;
  const { upCounts, points } = scoreAnswers(pub.answers.length, sec.votes, pub.hotSeat);
  pub.upCounts = upCounts;
  pub.votes = { ...sec.votes };
  pub.points = points;
  pub.verdict = 'scored';
  pub.phase = 'ROUND_SUMMARY';
  pub.endsAt = ctx.now + SUMMARY_MS;
  if (sec.scored.includes(key)) return;
  sec.scored = [...sec.scored, key];
  ctx.award(pub.hotSeat, points);
  const max = pub.answers.length * Math.max(1, pub.voters.length);
  ctx.stat(pub.hotSeat, points >= max * 0.75 && points > 0 ? 'perfect' : 'miss');
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
  const turns = cfgNum(ctx, 'turnsPerPlayer', 1);
  const { mode, items } = customContent(ctx);
  const custom: D10Prompt[] = items.map((it) => ({ id: it.id, category: 'Personalizado', text: it.text }));
  const pool = mergePools<D10Prompt>(ctx.catalog.fiveSec, custom, mode);
  const pub: D5State = {
    phase: 'TURN_PREPARATION',
    round: 1,
    totalRounds: order.length * turns,
    endsAt: null,
    order,
    turnIndex: 0,
    hotSeat: order[0],
    prompt: null,
    countdownMs: cfgNum(ctx, 'timerSeconds', 10) * 1000,
    answersPerTurn: Math.min(7, Math.max(1, cfgNum(ctx, 'answersPerTurn', 5))),
    answers: [],
    finishedEarly: false,
    voters: [],
    votedIds: [],
    votes: null,
    upCounts: null,
    verdict: null,
    points: 0,
  };
  const draft: Draft = { pub, sec: { nextPrompt: null, votes: {}, pool, scored: [] } };
  startTurn(draft, 0, ctx);
  return draft;
}

function acceptsDraft(pub: D5State, now: number) {
  return pub.phase === 'COUNTDOWN_ACTIVE' && now <= (pub.endsAt ?? 0) + GRACE_MS;
}

export const d5Engine: GameEngine<D5State, D5Secret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    switch (a.type) {
      case 'READY':
        if (pub.phase !== 'TURN_PREPARATION' || from !== pub.hotSeat) return false;
        reveal(d, ctx);
        return true;
      case 'ANSWERS': {
        // rascunho completo (idempotente: substitui a lista inteira)
        if (from !== pub.hotSeat || !acceptsDraft(pub, ctx.now) || !Array.isArray(a.answers)) return false;
        const answers = (a.answers as unknown[]).slice(0, pub.answersPerTurn).map((x) => sanitizeShortText(String(x ?? ''), MAX_ANSWER));
        if (JSON.stringify(answers) === JSON.stringify(pub.answers) && !a.final) return false;
        pub.answers = answers;
        const filled = answers.filter((x) => x).length;
        if (a.final || filled >= pub.answersPerTurn) {
          pub.finishedEarly = ctx.now < (pub.endsAt ?? 0);
          toValidation(d, ctx);
        }
        return true;
      }
      case 'VOTE': {
        if (pub.phase !== 'PEER_VALIDATION' || !pub.voters.includes(from) || from === pub.hotSeat || sec.votes[from]) return false;
        if (!Array.isArray(a.votes)) return false;
        const list = pub.answers.map((_, i) => (a.votes as unknown[])[i] === true);
        sec.votes[from] = list;
        pub.votedIds = [...pub.votedIds, from];
        const pendingOnline = pub.voters.filter((id) => !sec.votes[id] && ctx.isOnline(id));
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
        ctx.log('Turno pulado: jogador da vez desconectado');
        pub.verdict = 'skipped';
        pub.phase = 'ROUND_SUMMARY';
        pub.endsAt = ctx.now + 3000;
        return true;
      case 'COUNTDOWN_ACTIVE':
        // espera a janela de tolerância para o último rascunho chegar
        if (ctx.now < pub.endsAt + GRACE_MS) return false;
        toValidation(d, ctx);
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
  skip(d, ctx) {
    const { pub } = d;
    switch (pub.phase) {
      case 'TURN_PREPARATION':
        pub.verdict = 'skipped';
        pub.phase = 'ROUND_SUMMARY';
        pub.endsAt = ctx.now + 3000;
        return true;
      case 'COUNTDOWN_ACTIVE':
        toValidation(d, ctx);
        return true;
      case 'PEER_VALIDATION':
        resolve(d, ctx);
        return true;
      case 'ROUND_SUMMARY':
        next(d, ctx);
        return true;
      default:
        return false;
    }
  },
  views(d, players) {
    const out: Record<string, D5View> = {};
    players.forEach((p) => (out[p.id] = { myVotes: d.sec.votes[p.id] ?? null }));
    return out;
  },
};
