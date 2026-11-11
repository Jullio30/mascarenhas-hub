import type { BasePublicState, EngineCtx, GameConfig, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, pickUnused, shuffle } from '../../core/engine/helpers';
import { capitalizeFirst, isSameAnswer, normalizeAnswer, sanitizeShortText } from '../../lib/textUtils';
import { fetchOnThisDay, fetchRandomPokemon } from '../../services/externalApis';
import { FALLBACK_POKEMON } from '../../data/fallbackCatalogs/pokemon';
import { pushNotice, type PrivateNotice } from '../_shared/notice';
import { BLEFE_CATALOG, BLEFE_CATEGORY_LABEL, historyBlefeQuestion, pokemonBlefeQuestion, type BlefeCategory, type BlefeQuestion } from './blefeCatalog';

export type BlefePhase = 'QUESTION_INTRO' | 'WRITING_BLUFFS' | 'VOTING' | 'DRAMATIC_REVEAL' | 'ROUND_SCOREBOARD' | 'FINISHED';

/** Opção pública durante a votação: SEM autoria e SEM marcação de verdade. */
export interface BlefeOptionPublic {
  optionId: string;
  text: string;
}

export interface BlefeRevealOption extends BlefeOptionPublic {
  isTrue: boolean;
  isHouse: boolean;
  authorPlayerIds: string[];
  voters: string[];
}

export interface BlefeState extends BasePublicState {
  phase: BlefePhase;
  participants: string[];
  question: { id: string; categoryLabel: string; text: string };
  submittedIds: string[];
  options: BlefeOptionPublic[] | null;
  votedIds: string[];
  /** Publicados só na transição para DRAMATIC_REVEAL. */
  reveal: BlefeRevealOption[] | null;
  revealStartedAt: number | null;
  trueAnswer: string | null;
  factExplanation: string | null;
  didNotSubmit: string[];
  pointsDelta: Record<string, number>;
}

interface SecretOption extends BlefeOptionPublic {
  norm: string;
  isTrue: boolean;
  isHouse: boolean;
  authorPlayerIds: string[];
}

export interface BlefeSecret {
  question: BlefeQuestion;
  queue: BlefeQuestion[];
  bluffs: Record<string, string>;
  suggestions: Record<string, string>;
  options: SecretOption[];
  votes: Record<string, string>;
  notices: Record<string, PrivateNotice>;
}

export interface BlefeView {
  myBluff: string | null;
  suggestion: string | null;
  myVote: string | null;
  ownOptionIds: string[];
  notice: PrivateNotice | null;
}

type Draft = GameDraft<BlefeState, BlefeSecret>;

export const INTRO_MS = 4_000;
export const SCOREBOARD_MS = 8_000;
export const REVEAL_STEP_MS = 3_500;
export const REVEAL_TRUTH_MS = 6_500;
export const TRUTH_POINTS = 1000;
export const FOOL_POINTS = 500;

export const revealDuration = (fooledLies: number) => fooledLies * REVEAL_STEP_MS + REVEAL_TRUTH_MS;

const TRUTH_MSG = 'Você acertou a resposta verdadeira! Mas aqui no BLEFE você precisa escrever uma MENTIRA para enganar a sala. Digite outra resposta!';
const DUP_MSG = 'Outro jogador já escreveu exatamente esse blefe! Tente uma mentira diferente!';

function isTruth(text: string, q: BlefeQuestion) {
  return [q.trueAnswer, ...q.acceptedSynonyms].some((t) => isSameAnswer(text, t));
}

function nextQuestion(d: Draft, ctx: EngineCtx): BlefeQuestion {
  while (d.sec.queue.length) {
    const q = d.sec.queue.shift()!;
    if (!ctx.isUsed(q.id)) {
      ctx.markUsed(q.id);
      return q;
    }
  }
  const cat = cfgStr(ctx, 'category', 'misto');
  const pool = cat === 'misto' ? BLEFE_CATALOG : BLEFE_CATALOG.filter((q) => q.category === cat);
  return pickUnused(pool.length ? pool : BLEFE_CATALOG, (q) => q.id, ctx);
}

function startRound(d: Draft, ctx: EngineCtx) {
  const q = nextQuestion(d, ctx);
  Object.assign(d.sec, { question: q, bluffs: {}, suggestions: {}, options: [], votes: {} });
  Object.assign(d.pub, {
    phase: 'QUESTION_INTRO',
    question: { id: q.id, categoryLabel: BLEFE_CATEGORY_LABEL[q.category], text: q.question },
    submittedIds: [],
    options: null,
    votedIds: [],
    reveal: null,
    revealStartedAt: null,
    trueAnswer: null,
    factExplanation: null,
    didNotSubmit: [],
    pointsDelta: {},
    endsAt: ctx.now + INTRO_MS,
  } satisfies Partial<BlefeState>);
}

function buildOptions(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const q = sec.question;
  const opts: SecretOption[] = [];
  // agrupa blefes idênticos (envio simultâneo) num único botão com coautoria
  Object.entries(sec.bluffs).forEach(([pid, text]) => {
    const norm = normalizeAnswer(text);
    const same = opts.find((o) => o.norm === norm || isSameAnswer(o.text, text));
    if (same) same.authorPlayerIds.push(pid);
    else opts.push({ optionId: '', text: capitalizeFirst(text), norm, isTrue: false, isHouse: false, authorPlayerIds: [pid] });
  });
  // menos de 3 mentiras na sala → completa com distratores da casa (sempre ≥ 4 opções)
  for (const hb of shuffle(q.houseBluffs, ctx.rng)) {
    if (opts.length >= 3) break;
    if (opts.some((o) => isSameAnswer(o.text, hb)) || isTruth(hb, q)) continue;
    opts.push({ optionId: '', text: capitalizeFirst(hb), norm: normalizeAnswer(hb), isTrue: false, isHouse: true, authorPlayerIds: [] });
  }
  // último recurso: distratores de outras cartas da mesma categoria (nunca menos de 4 opções)
  for (const other of shuffle(BLEFE_CATALOG.filter((x) => x.category === q.category && x.id !== q.id), ctx.rng)) {
    if (opts.length >= 3) break;
    const hb = other.houseBluffs[0];
    if (opts.some((o) => isSameAnswer(o.text, hb)) || isTruth(hb, q)) continue;
    opts.push({ optionId: '', text: capitalizeFirst(hb), norm: normalizeAnswer(hb), isTrue: false, isHouse: true, authorPlayerIds: [] });
  }
  opts.push({ optionId: '', text: capitalizeFirst(q.trueAnswer), norm: normalizeAnswer(q.trueAnswer), isTrue: true, isHouse: false, authorPlayerIds: [] });
  const shuffled = shuffle(opts, ctx.rng).map((o, i) => ({ ...o, optionId: `op${pub.round}-${i + 1}` }));
  sec.options = shuffled;
  pub.didNotSubmit = pub.participants.filter((id) => !sec.bluffs[id]);
  pub.options = shuffled.map((o) => ({ optionId: o.optionId, text: o.text }));
  pub.phase = 'VOTING';
  pub.endsAt = ctx.now + cfgNum(ctx, 'voteTimeSeconds', 30) * 1000;
}

function settle(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const delta: Record<string, number> = {};
  const add = (id: string, pts: number) => (delta[id] = (delta[id] ?? 0) + pts);
  const reveal: BlefeRevealOption[] = sec.options.map((o) => ({
    optionId: o.optionId,
    text: o.text,
    isTrue: o.isTrue,
    isHouse: o.isHouse,
    authorPlayerIds: [...o.authorPlayerIds],
    voters: Object.keys(sec.votes).filter((v) => sec.votes[v] === o.optionId),
  }));
  reveal.forEach((o) => {
    if (o.isTrue) {
      o.voters.forEach((v) => {
        add(v, TRUTH_POINTS);
        ctx.stat(v, 'perfect');
      });
    } else {
      // +500 por vítima para CADA coautor; distrator da casa não pontua ninguém
      o.authorPlayerIds.forEach((author) =>
        o.voters.forEach((v) => {
          if (v === author) return;
          add(author, FOOL_POINTS);
          ctx.stat(author, 'bluff');
        }),
      );
      o.voters.forEach((v) => ctx.stat(v, 'miss'));
    }
  });
  Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
  pub.pointsDelta = delta;
  // ordem dramática: mentiras com votos (menos votadas primeiro) e, por último, a verdade
  const fooled = reveal.filter((o) => !o.isTrue && o.voters.length > 0).sort((a, b) => a.voters.length - b.voters.length);
  const rest = reveal.filter((o) => !o.isTrue && o.voters.length === 0);
  pub.reveal = [...fooled, ...rest, ...reveal.filter((o) => o.isTrue)];
  pub.trueAnswer = capitalizeFirst(sec.question.trueAnswer);
  pub.factExplanation = sec.question.factExplanation;
  pub.phase = 'DRAMATIC_REVEAL';
  pub.revealStartedAt = ctx.now;
  pub.endsAt = ctx.now + revealDuration(fooled.length);
}

export function createBlefe(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const external = Array.isArray(ctx.external) ? (ctx.external as BlefeQuestion[]) : [];
  const pub = {
    phase: 'QUESTION_INTRO',
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 5),
    endsAt: null,
    participants: players.map((p) => p.id),
  } as unknown as BlefeState;
  const d: Draft = { pub, sec: { question: BLEFE_CATALOG[0], queue: external, bluffs: {}, suggestions: {}, options: [], votes: {}, notices: {} } };
  startRound(d, ctx);
  return d;
}

export const blefeEngine: GameEngine<BlefeState, BlefeSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    switch (a.type) {
      case 'SUGGEST': {
        // "Me Salva!": 1 sugestão por rodada, entregue só na visão privada do jogador
        if (pub.phase !== 'WRITING_BLUFFS' || sec.suggestions[from] || sec.bluffs[from]) return false;
        const taken = new Set([...Object.values(sec.suggestions), ...Object.values(sec.bluffs)].map(normalizeAnswer));
        const options = sec.question.houseBluffs.filter((h) => !taken.has(normalizeAnswer(h)));
        sec.suggestions[from] = (options.length ? options : sec.question.houseBluffs)[Math.floor(ctx.rng() * (options.length || 3))];
        return true;
      }
      case 'BLUFF': {
        if (pub.phase !== 'WRITING_BLUFFS' || sec.bluffs[from]) return false;
        const text = sanitizeShortText(String(a.text ?? ''), 60);
        if (!normalizeAnswer(text)) {
          pushNotice(sec.notices, from, ctx.now, 'Escreva um blefe com letras ou números — não vale enviar vazio!');
          return true;
        }
        if (isTruth(text, sec.question)) {
          pushNotice(sec.notices, from, ctx.now, TRUTH_MSG);
          return true;
        }
        if (Object.values(sec.bluffs).some((b) => isSameAnswer(b, text))) {
          pushNotice(sec.notices, from, ctx.now, DUP_MSG);
          return true;
        }
        sec.bluffs[from] = text;
        pub.submittedIds = [...pub.submittedIds, from];
        const pending = pub.participants.filter((id) => !sec.bluffs[id] && ctx.isOnline(id));
        if (pending.length === 0) buildOptions(d, ctx);
        return true;
      }
      case 'VOTE': {
        if (pub.phase !== 'VOTING' || sec.votes[from]) return false;
        const opt = sec.options.find((o) => o.optionId === a.optionId);
        // validador: proibido votar na própria mentira
        if (!opt || opt.authorPlayerIds.includes(from)) return false;
        sec.votes[from] = opt.optionId;
        pub.votedIds = [...pub.votedIds, from];
        const pending = pub.participants.filter((id) => !sec.votes[id] && ctx.isOnline(id) && sec.options.some((o) => !o.authorPlayerIds.includes(id)));
        if (pending.length === 0) settle(d, ctx);
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
      case 'QUESTION_INTRO':
        pub.phase = 'WRITING_BLUFFS';
        pub.endsAt = ctx.now + cfgNum(ctx, 'writeTimeSeconds', 45) * 1000;
        return true;
      case 'WRITING_BLUFFS':
        buildOptions(d, ctx);
        return true;
      case 'VOTING':
        settle(d, ctx);
        return true;
      case 'DRAMATIC_REVEAL':
        pub.phase = 'ROUND_SCOREBOARD';
        pub.endsAt = ctx.now + SCOREBOARD_MS;
        return true;
      case 'ROUND_SCOREBOARD':
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
    const out: Record<string, BlefeView> = {};
    players.forEach((p) => {
      out[p.id] = {
        myBluff: sec.bluffs[p.id] ?? null,
        suggestion: sec.suggestions[p.id] ?? null,
        myVote: sec.votes[p.id] ?? null,
        ownOptionIds: sec.options.filter((o) => o.authorPlayerIds.includes(p.id)).map((o) => o.optionId),
        notice: sec.notices[p.id] ?? null,
      };
    });
    return out;
  },
};

/** Anfitrião: gera algumas perguntas extras via PokéAPI e Wikipédia (com fallback local). */
export async function prepareBlefe(config: GameConfig): Promise<BlefeQuestion[]> {
  const cat = String(config.category ?? 'misto') as BlefeCategory | 'misto';
  const rng = Math.random;
  const out: BlefeQuestion[] = [];
  const jobs: Promise<void>[] = [];
  if (cat === 'misto' || cat === 'geek') {
    jobs.push(
      fetchRandomPokemon(3, rng).then((list) => {
        const pool = list.length ? list : shuffle(FALLBACK_POKEMON, rng).slice(0, 2);
        pool.slice(0, cat === 'geek' ? 2 : 1).forEach((p) => {
          const q = pokemonBlefeQuestion(p, rng);
          if (q) out.push(q);
        });
      }),
    );
  }
  if (cat === 'misto' || cat === 'historia') {
    jobs.push(
      fetchOnThisDay().then((events) => {
        const q = events.length ? historyBlefeQuestion(events[Math.floor(rng() * events.length)], rng) : null;
        if (q) out.push(q);
      }),
    );
  }
  await Promise.all(jobs.map((j) => j.catch(() => undefined)));
  // as perguntas dinâmicas entram em rodadas aleatórias no meio do catálogo local
  const rounds = Number(config.rounds) || 5;
  const local = shuffle(cat === 'misto' ? BLEFE_CATALOG : BLEFE_CATALOG.filter((q) => q.category === cat), rng).slice(0, rounds);
  return shuffle([...out, ...local], rng).slice(0, Math.max(rounds, out.length));
}
