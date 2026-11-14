/**
 * Quem Escreveu? — anonimato host-authoritative.
 * WRITING_SECRET_ANSWERS → GUESSING_AUTHORS (só `{ anonymousId, text }` no estado público) → REVEAL_AUTHORS.
 * O mapa `{ anonymousId: authorPlayerId }` fica exclusivamente no segredo até a revelação.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, customContent, mergePools, pickUnused, shuffle } from '../../core/engine/helpers';
import { sanitizeShortText } from '../../lib/textUtils';
import { WHO_WROTE_QUESTIONS } from './catalog';

export type WwPhase = 'WRITING_SECRET_ANSWERS' | 'GUESSING_AUTHORS' | 'REVEAL_AUTHORS' | 'FINISHED';
export const MAX_ANSWER = 140;
export const CORRECT_POINTS = 100;
export const DISGUISE_POINTS = 50;
export const REVEAL_STEP_MS = 4_500;
const REVEAL_TAIL_MS = 6_000;

export interface WwAnswer {
  anonymousId: string;
  text: string;
}

export interface WwRevealItem extends WwAnswer {
  authorId: string;
  right: string[];
  wrong: string[];
}

export interface WwState extends BasePublicState {
  phase: WwPhase;
  participants: string[];
  question: string;
  submittedIds: string[];
  answers: WwAnswer[] | null;
  guessedIds: string[];
  reveal: { items: WwRevealItem[]; delta: Record<string, number>; startedAt: number } | null;
}

export interface WwSecret {
  answers: Record<string, string>;
  anonMap: Record<string, string>;
  guesses: Record<string, Record<string, string>>;
  pool: { id: string; text: string }[];
  scored: string[];
}

export interface WwView {
  myAnswer: string | null;
  myAnonId: string | null;
  myGuesses: Record<string, string> | null;
}

type Draft = GameDraft<WwState, WwSecret>;

export const revealDuration = (n: number) => n * REVEAL_STEP_MS + REVEAL_TAIL_MS;

function startRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const q = pickUnused(sec.pool, (x) => x.id, ctx);
  sec.answers = {};
  sec.anonMap = {};
  sec.guesses = {};
  Object.assign(pub, {
    phase: 'WRITING_SECRET_ANSWERS',
    question: q.text,
    submittedIds: [],
    answers: null,
    guessedIds: [],
    reveal: null,
    endsAt: ctx.now + cfgNum(ctx, 'writeTimeSeconds', 40) * 1000,
  } satisfies Partial<WwState>);
}

function toGuessing(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const authors = shuffle(Object.keys(sec.answers), ctx.rng); // Fisher-Yates
  sec.anonMap = {};
  const list: WwAnswer[] = authors.map((pid, i) => {
    const anonymousId = `resp_${i + 1}`;
    sec.anonMap[anonymousId] = pid;
    return { anonymousId, text: sec.answers[pid] };
  });
  pub.answers = list;
  if (list.length < 2) {
    ctx.log('Respostas insuficientes para investigar a autoria');
    return reveal(d, ctx);
  }
  pub.phase = 'GUESSING_AUTHORS';
  pub.guessedIds = [];
  pub.endsAt = ctx.now + cfgNum(ctx, 'guessTimeSeconds', 45) * 1000;
}

/** +100 por autoria certa; autor +50 por participante que ERROU a autoria da resposta dele. */
export function scoreGuessesWw(anonMap: Record<string, string>, guesses: Record<string, Record<string, string>>) {
  const delta: Record<string, number> = {};
  const right: Record<string, string[]> = {};
  const wrong: Record<string, string[]> = {};
  Object.keys(anonMap).forEach((a) => ((right[a] = []), (wrong[a] = [])));
  Object.entries(guesses).forEach(([guesser, map]) => {
    Object.entries(map).forEach(([anon, guessed]) => {
      const author = anonMap[anon];
      if (!author || author === guesser) return;
      if (guessed === author) {
        right[anon].push(guesser);
        delta[guesser] = (delta[guesser] ?? 0) + CORRECT_POINTS;
      } else {
        wrong[anon].push(guesser);
        delta[author] = (delta[author] ?? 0) + DISGUISE_POINTS;
      }
    });
  });
  return { delta, right, wrong };
}

function reveal(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const { delta, right, wrong } = scoreGuessesWw(sec.anonMap, sec.guesses);
  const key = `scored_round_${pub.round}`;
  if (!sec.scored.includes(key)) {
    sec.scored = [...sec.scored, key];
    Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
    Object.values(right).flat().forEach((id) => ctx.stat(id, 'perfect'));
  }
  const items: WwRevealItem[] = (pub.answers ?? []).map((a) => ({ ...a, authorId: sec.anonMap[a.anonymousId], right: right[a.anonymousId] ?? [], wrong: wrong[a.anonymousId] ?? [] }));
  pub.reveal = { items, delta, startedAt: ctx.now };
  pub.phase = 'REVEAL_AUTHORS';
  pub.endsAt = ctx.now + revealDuration(items.length);
}

export function createWw(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const { mode, items } = customContent(ctx);
  const official = WHO_WROTE_QUESTIONS.map((t, i) => ({ id: `ww:${i}`, text: t }));
  const pool = mergePools(official, items.map((it) => ({ id: it.id, text: it.text })), mode);
  const pub = { round: 1, totalRounds: Math.max(1, Math.min(cfgNum(ctx, 'rounds', 5), pool.length)), endsAt: null, participants: players.map((p) => p.id) } as WwState;
  const d: Draft = { pub, sec: { answers: {}, anonMap: {}, guesses: {}, pool, scored: [] } };
  startRound(d, ctx);
  return d;
}

function myAnon(sec: WwSecret, pid: string) {
  return Object.keys(sec.anonMap).find((a) => sec.anonMap[a] === pid) ?? null;
}

/**
 * Normaliza a submissão de palpites (GUESSES). Tudo que for vazio, malformado ou inválido vira ABSTENÇÃO
 * ("passou a vez") naquele card — nunca bloqueia o envio nem gera pontos:
 *  - id anônimo inexistente (inclui chaves herdadas como "__proto__"/"constructor"), a própria resposta;
 *  - alvo que não é autor de nenhuma resposta da rodada, o próprio palpiteiro, ou valor não-string.
 * Palpites válidos de uma submissão parcial são preservados.
 */
export function sanitizeGuesses(raw: unknown, sec: Pick<WwSecret, 'anonMap'>, from: string): Record<string, string> {
  const clean: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  const authors = new Set(Object.values(sec.anonMap));
  const own = myAnon(sec as WwSecret, from);
  for (const [anon, pid] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof pid !== 'string' || !pid) continue;
    if (!Object.prototype.hasOwnProperty.call(sec.anonMap, anon) || anon === own) continue;
    if (pid === from || !authors.has(pid)) continue;
    clean[anon] = pid;
  }
  return clean;
}

/** Todos os participantes CONECTADOS já enviaram (ou passaram)? Recalculado também no tick (quedas no meio da fase). */
function everyoneOnlineDone(pub: WwState, done: (id: string) => boolean, ctx: EngineCtx) {
  return pub.participants.filter((id) => ctx.isOnline(id)).every(done);
}

export const wwEngine: GameEngine<WwState, WwSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    if (a.type === 'ANSWER') {
      if (pub.phase !== 'WRITING_SECRET_ANSWERS' || sec.answers[from]) return false;
      const text = sanitizeShortText(String(a.text ?? ''), MAX_ANSWER);
      if (!text) return false;
      sec.answers[from] = text;
      pub.submittedIds = [...pub.submittedIds, from];
      if (everyoneOnlineDone(pub, (id) => Boolean(sec.answers[id]), ctx)) toGuessing(d, ctx);
      return true;
    }
    if (a.type === 'GUESSES') {
      // 1 envio por jogador (idempotente). Vazio/parcial/inválido é aceito: os cards sem palpite válido contam como "passou a vez".
      if (pub.phase !== 'GUESSING_AUTHORS' || sec.guesses[from]) return false;
      sec.guesses[from] = sanitizeGuesses(a.guesses, sec, from);
      pub.guessedIds = [...pub.guessedIds, from];
      if (everyoneOnlineDone(pub, (id) => Boolean(sec.guesses[id]), ctx)) reveal(d, ctx);
      return true;
    }
    return false;
  },
  tick(d, ctx) {
    const { pub, sec } = d;
    // quórum dinâmico: se quem faltava caiu, a fase não fica esperando até o fim do tempo
    if (pub.phase === 'WRITING_SECRET_ANSWERS' && pub.submittedIds.length > 0 && everyoneOnlineDone(pub, (id) => Boolean(sec.answers[id]), ctx)) {
      toGuessing(d, ctx);
      return true;
    }
    if (pub.phase === 'GUESSING_AUTHORS' && pub.guessedIds.length > 0 && everyoneOnlineDone(pub, (id) => Boolean(sec.guesses[id]), ctx)) {
      reveal(d, ctx);
      return true;
    }
    if (!pub.endsAt || ctx.now < pub.endsAt) return false;
    switch (pub.phase) {
      case 'WRITING_SECRET_ANSWERS':
        toGuessing(d, ctx);
        return true;
      case 'GUESSING_AUTHORS':
        reveal(d, ctx);
        return true;
      case 'REVEAL_AUTHORS':
        if (pub.round >= pub.totalRounds) {
          pub.phase = 'FINISHED';
          pub.endsAt = null;
        } else {
          pub.round += 1;
          startRound(d, ctx);
        }
        return true;
      default:
        return false;
    }
  },
  views(d, players) {
    const { sec } = d;
    const out: Record<string, WwView> = {};
    players.forEach((p) => {
      out[p.id] = { myAnswer: sec.answers[p.id] ?? null, myAnonId: myAnon(sec, p.id), myGuesses: sec.guesses[p.id] ?? null };
    });
    return out;
  },
};
