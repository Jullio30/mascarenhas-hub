/**
 * Adivinhe a Música — modalidades:
 *  - `dicas`     (original): adivinhar a música por 4 dicas progressivas (15/10/7/4 + First Blood).
 *  - `artista`   : quem interpreta a música?            (múltipla escolha)
 *  - `info`      : complete a informação (ano, parceria, curiosidade)
 *  - `contexto`  : identifique a música pela descrição/contexto
 *  - `decadas`   : perguntas sobre décadas musicais
 *  - `generos`   : perguntas sobre gêneros e estilos
 *  - `mix`       : alterna todas as modalidades (padrão)
 * O filtro de gênero (Funk, Sertanejo, Pop, Rock, Rap/Trap, Internacional, Anime, Games, Clássicos/MPB/Pagode)
 * cria rodadas temáticas. Nada de letras literais nem áudio: só descrições e curiosidades parafraseadas.
 */
import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import type { Song } from '../../data/defaultPacks';
import { cfgNum, cfgStr, drawFromBag, pickUnused, shuffle } from '../../core/engine/helpers';
import { isSongMatch, sanitizeShortText } from '../../lib/textUtils';
import { MUSIC_QUIZ, QUIZ_KIND_LABEL, matchesFilter, type MusicQuizItem, type QuizKind } from '../../data/musicExpansion';

export const STAGE_MS = 12_000;
export const STAGE_POINTS = [15, 10, 7, 4];
export const ROUND_MS = STAGE_MS * 4;
export const QUIZ_MS = 20_000;
export const QUIZ_BASE = 10;
export const QUIZ_SPEED_MAX = 5;
const SUMMARY_MS = 7_000;
const FIRST_BLOOD = 3;
const MAX_GUESSES_PER_STAGE = 2;

export type MusicModality = 'mix' | 'dicas' | QuizKind;

export interface MusicClues {
  stage1?: { era: string; genre: string; hint: string };
  stage2?: string;
  stage3?: { artist: string; theme: string };
  stage4?: string[];
}

export interface MusicQuizPublic {
  kind: QuizKind;
  kindLabel: string;
  question: string;
  options: string[];
}

export interface MusicState extends BasePublicState {
  phase: 'ROUND_ACTIVE' | 'ROUND_SUMMARY' | 'FINISHED';
  participants: string[];
  genreFilter: string;
  /** Tipo da rodada atual. */
  mode: 'song' | 'quiz';
  startedAt: number;
  stage: number;
  clues: MusicClues;
  correct: Record<string, { stage: number; points: number; at: number; firstBlood: boolean }>;
  firstBlood: string | null;
  attempts: Record<string, { stage: number; used: number }>;
  wrongAt: Record<string, number>;
  answer: { title: string; artist: string } | null;
  /** Rodadas de quiz: pergunta pública (sem a alternativa correta). */
  quiz: MusicQuizPublic | null;
  quizAnswered: string[];
  /** Publicado só no resumo da rodada. */
  quizResult: { correctIndex: number; note: string; picks: Record<string, number> } | null;
}

export interface MusicSecret {
  song: Song | null;
  options: string[];
  quizCorrect?: number;
  quizNote?: string;
  quizPicks?: Record<string, number>;
  /** Acertos do quiz (secretos até a revelação, para não entregar a resposta). */
  quizScores?: MusicState['correct'];
  quizFirst?: string | null;
  kindBag?: MusicModality[];
  scored?: string[];
}

export interface MusicView {
  myPick: number | null;
}

type Draft = GameDraft<MusicState, MusicSecret>;

const MIX_BAG: MusicModality[] = ['dicas', 'dicas', 'artista', 'info', 'contexto', 'decadas', 'generos', 'info'];

function songPool(ctx: EngineCtx): Song[] {
  const g = cfgStr(ctx, 'genre', 'all');
  const pool = ctx.catalog.songs.filter((s) => matchesFilter(s, g));
  return pool.length >= 4 ? pool : ctx.catalog.songs;
}

function stageAt(pub: MusicState, now: number) {
  return Math.min(4, Math.max(1, Math.floor((now - pub.startedAt) / STAGE_MS) + 1));
}

function revealUpTo(d: Draft, stage: number) {
  const { pub, sec } = d;
  const s = sec.song;
  if (!s) return;
  const clues: MusicClues = { stage1: { era: s.era, genre: s.genre, hint: s.hint } };
  if (stage >= 2) clues.stage2 = s.curiosity;
  if (stage >= 3) clues.stage3 = { artist: s.artist, theme: s.theme };
  if (stage >= 4) clues.stage4 = sec.options;
  pub.clues = clues;
  pub.stage = stage;
}

function resetRound(pub: MusicState, ctx: EngineCtx) {
  pub.phase = 'ROUND_ACTIVE';
  pub.startedAt = ctx.now;
  pub.correct = {};
  pub.firstBlood = null;
  pub.attempts = {};
  pub.wrongAt = {};
  pub.answer = null;
  pub.quiz = null;
  pub.quizAnswered = [];
  pub.quizResult = null;
  pub.clues = {};
  pub.stage = 1;
}

function startSongRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const pool = songPool(ctx);
  const song = pickUnused(pool, (s) => 'mus:' + s.id, ctx);
  const sameGenre = ctx.catalog.songs.filter((s) => s.id !== song.id && s.genre === song.genre);
  const others = ctx.catalog.songs.filter((s) => s.id !== song.id && s.genre !== song.genre);
  const distractors = [...shuffle(sameGenre, ctx.rng), ...shuffle(others, ctx.rng)]
    .map((s) => s.title)
    .filter((t, i, arr) => t !== song.title && arr.indexOf(t) === i)
    .slice(0, 3);
  sec.song = song;
  sec.options = shuffle([song.title, ...distractors], ctx.rng);
  resetRound(pub, ctx);
  pub.mode = 'song';
  pub.endsAt = ctx.now + ROUND_MS;
  revealUpTo(d, 1);
}

/** Alternativas distintas: a correta + 3 distratores (preferindo os do mesmo gênero). */
function optionsFrom(correct: string, preferred: string[], fallback: string[], ctx: EngineCtx): { options: string[]; correctIndex: number } {
  const seen = new Set([correct.toLowerCase()]);
  const distractors: string[] = [];
  for (const o of [...shuffle(preferred, ctx.rng), ...shuffle(fallback, ctx.rng)]) {
    if (distractors.length >= 3) break;
    if (!o || seen.has(o.toLowerCase())) continue;
    seen.add(o.toLowerCase());
    distractors.push(o);
  }
  const options = shuffle([correct, ...distractors], ctx.rng);
  return { options, correctIndex: options.indexOf(correct) };
}

interface BuiltQuiz {
  kind: QuizKind;
  question: string;
  options: string[];
  correctIndex: number;
  note: string;
}

function fromBank(item: MusicQuizItem, ctx: EngineCtx): BuiltQuiz {
  const correct = item.options[item.answer];
  const options = shuffle([...item.options], ctx.rng);
  return { kind: item.kind, question: item.question, options, correctIndex: options.indexOf(correct), note: item.note };
}

function buildQuiz(kind: QuizKind, ctx: EngineCtx): BuiltQuiz {
  const filter = cfgStr(ctx, 'genre', 'all');
  const songs = songPool(ctx);
  const all = ctx.catalog.songs;
  const bank = MUSIC_QUIZ.filter((q) => q.kind === kind && (filter === 'all' || q.filters.some((f) => f === filter)));
  const freshBank = bank.filter((q) => !ctx.isUsed(q.id));

  // info/décadas/gêneros: banco curado primeiro; décadas e gêneros também são gerados a partir das músicas
  if (kind === 'info' && freshBank.length) return fromBank(pickUnused(freshBank, (q) => q.id, ctx), ctx);
  if ((kind === 'decadas' || kind === 'generos') && freshBank.length && ctx.rng() < 0.6) return fromBank(pickUnused(freshBank, (q) => q.id, ctx), ctx);

  const song = pickUnused(songs, (s) => `mq-${kind}:${s.id}`, ctx);
  const same = songs.filter((s) => s.id !== song.id);
  switch (kind) {
    case 'decadas': {
      const { options, correctIndex } = optionsFrom(song.era, ['Anos 1960', 'Anos 1970', 'Anos 1980', 'Anos 1990', 'Anos 2000', 'Anos 2010', 'Anos 2020'], [], ctx);
      return { kind, question: `Em que década foi lançada “${song.title}” (${song.artist})?`, options, correctIndex, note: `${song.title} é dos ${song.era.replace('Anos ', 'anos ')}. ${song.curiosity}.` };
    }
    case 'generos': {
      const label = (s: Song) => (s.genre === 'Games & Animes' ? (s.id === 'g05' || s.id === 'g10' ? 'Videogames' : 'Anime') : s.genre);
      const genres = Array.from(new Set(all.map(label)));
      const { options, correctIndex } = optionsFrom(label(song), genres, [], ctx);
      return { kind, question: `Em qual gênero / estilo se encaixa “${song.title}”, de ${song.artist}?`, options, correctIndex, note: `${song.title} (${song.era}) — ${song.curiosity}.` };
    }
    case 'contexto': {
      const { options, correctIndex } = optionsFrom(song.title, same.map((s) => s.title), all.map((s) => s.title), ctx);
      return { kind, question: `Qual música é esta? ${song.era} • “${song.hint}”`, options, correctIndex, note: `Era “${song.title}”, de ${song.artist}. ${song.curiosity}.` };
    }
    case 'artista':
    case 'info':
    default: {
      const { options, correctIndex } = optionsFrom(song.artist, same.map((s) => s.artist), all.map((s) => s.artist), ctx);
      return { kind: 'artista', question: `Quem é o artista por trás de “${song.title}” (${song.era})?`, options, correctIndex, note: `“${song.title}” é de ${song.artist}. ${song.curiosity}.` };
    }
  }
}

function startQuizRound(d: Draft, kind: QuizKind, ctx: EngineCtx) {
  const { pub, sec } = d;
  const q = buildQuiz(kind, ctx);
  sec.song = null;
  sec.options = [];
  sec.quizCorrect = q.correctIndex;
  sec.quizNote = q.note;
  sec.quizPicks = {};
  sec.quizScores = {};
  sec.quizFirst = null;
  resetRound(pub, ctx);
  pub.mode = 'quiz';
  pub.quiz = { kind: q.kind, kindLabel: QUIZ_KIND_LABEL[q.kind], question: q.question, options: q.options };
  pub.endsAt = ctx.now + QUIZ_MS;
}

function startRound(d: Draft, ctx: EngineCtx) {
  const modality = cfgStr(ctx, 'modality', 'mix') as MusicModality;
  let kind: MusicModality = modality;
  if (modality === 'mix') {
    // 1ª rodada sempre por dicas; depois alterna sem repetir até esgotar a "bolsa"
    if (d.pub.round === 1) kind = 'dicas';
    else {
      const drawn = drawFromBag(d.sec.kindBag ?? [], MIX_BAG, ctx.rng);
      d.sec.kindBag = drawn.bag;
      kind = drawn.item;
    }
  }
  if (kind === 'dicas' || !(kind in QUIZ_KIND_LABEL)) startSongRound(d, ctx);
  else startQuizRound(d, kind as QuizKind, ctx);
}

function endRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  if (pub.mode === 'quiz') {
    const key = `scored_quiz_${pub.round}`;
    const picks = sec.quizPicks ?? {};
    const correctIndex = sec.quizCorrect ?? -1;
    pub.quizResult = { correctIndex, note: sec.quizNote ?? '', picks: { ...picks } };
    pub.correct = { ...(sec.quizScores ?? {}) };
    pub.firstBlood = sec.quizFirst ?? null;
    if (!(sec.scored ?? []).includes(key)) {
      sec.scored = [...(sec.scored ?? []), key];
      pub.participants.forEach((id) => {
        if (!pub.correct[id]) ctx.stat(id, 'miss');
      });
      Object.entries(pub.correct).forEach(([id, c]) => ctx.award(id, c.points));
    }
  } else {
    pub.participants.forEach((id) => {
      if (!pub.correct[id]) ctx.stat(id, 'miss');
    });
    revealUpTo(d, 4);
    pub.answer = sec.song ? { title: sec.song.title, artist: sec.song.artist } : null;
  }
  pub.phase = 'ROUND_SUMMARY';
  pub.endsAt = ctx.now + SUMMARY_MS;
}

export function createMusic(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const pub = {
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 8),
    participants: players.map((p) => p.id),
    genreFilter: cfgStr(ctx, 'genre', 'all'),
    stage: 1,
    clues: {},
    mode: 'song',
    quiz: null,
    quizAnswered: [],
    quizResult: null,
  } as unknown as MusicState;
  const d: Draft = { pub, sec: { song: null, options: [], kindBag: [], scored: [] } };
  startRound(d, ctx);
  return d;
}

function quizAnswer(d: Draft, from: string, index: number, ctx: EngineCtx): boolean {
  const { pub, sec } = d;
  if (!pub.quiz || !Number.isInteger(index) || index < 0 || index >= pub.quiz.options.length) return false;
  sec.quizPicks = sec.quizPicks ?? {};
  if (from in sec.quizPicks) return false; // 1 resposta por jogador (idempotente)
  sec.quizPicks[from] = index;
  pub.quizAnswered = [...pub.quizAnswered, from];
  if (index === sec.quizCorrect) {
    const remaining = Math.max(0, (pub.endsAt ?? ctx.now) - ctx.now);
    const firstBlood = !sec.quizFirst;
    const points = QUIZ_BASE + Math.round((QUIZ_SPEED_MAX * remaining) / QUIZ_MS) + (firstBlood ? FIRST_BLOOD : 0);
    if (firstBlood) sec.quizFirst = from;
    // acertos e pontos ficam no segredo e só entram no placar na revelação
    sec.quizScores = { ...(sec.quizScores ?? {}), [from]: { stage: 0, points, at: ctx.now, firstBlood } };
    ctx.stat(from, 'perfect', ctx.now - pub.startedAt);
  }
  const pending = pub.participants.filter((id) => !(id in (sec.quizPicks ?? {})) && ctx.isOnline(id));
  if (pending.length === 0) endRound(d, ctx);
  return true;
}

export const musicEngine: GameEngine<MusicState, MusicSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (pub.phase !== 'ROUND_ACTIVE' || !pub.participants.includes(from)) return false;
    if (ctx.now > (pub.endsAt ?? 0)) return false;
    if (pub.mode === 'quiz') {
      if (a.type !== 'QUIZ_ANSWER') return false;
      return quizAnswer(d, from, Number(a.index), ctx);
    }
    if (a.type !== 'GUESS' || !sec.song || pub.correct[from]) return false;
    const stage = stageAt(pub, ctx.now);
    const att = pub.attempts[from];
    const used = att && att.stage === stage ? att.used : 0;
    if (used >= MAX_GUESSES_PER_STAGE) return false;
    pub.attempts = { ...pub.attempts, [from]: { stage, used: used + 1 } };
    const guess = sanitizeShortText(String(a.text ?? ''), 60);
    if (!isSongMatch(guess, sec.song.title, sec.song.aliases)) {
      pub.wrongAt = { ...pub.wrongAt, [from]: ctx.now };
      return true;
    }
    const firstBlood = pub.firstBlood === null;
    const points = STAGE_POINTS[stage - 1] + (firstBlood ? FIRST_BLOOD : 0);
    if (firstBlood) pub.firstBlood = from;
    pub.correct = { ...pub.correct, [from]: { stage, points, at: ctx.now, firstBlood } };
    ctx.award(from, points);
    ctx.stat(from, stage <= 2 ? 'perfect' : 'miss', ctx.now - pub.startedAt);
    const pending = pub.participants.filter((id) => !pub.correct[id] && ctx.isOnline(id));
    if (pending.length === 0) endRound(d, ctx);
    return true;
  },
  tick(d, ctx) {
    const { pub } = d;
    if (pub.phase === 'ROUND_ACTIVE') {
      if (ctx.now >= (pub.endsAt ?? 0)) {
        endRound(d, ctx);
        return true;
      }
      if (pub.mode === 'quiz') return false;
      const stage = stageAt(pub, ctx.now);
      if (stage !== pub.stage) {
        revealUpTo(d, stage);
        return true;
      }
      return false;
    }
    if (pub.phase === 'ROUND_SUMMARY' && ctx.now >= (pub.endsAt ?? 0)) {
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
    if (d.pub.phase === 'ROUND_ACTIVE') {
      endRound(d, ctx);
      return true;
    }
    if (d.pub.phase === 'ROUND_SUMMARY') {
      d.pub.endsAt = ctx.now;
      return musicEngine.tick(d, ctx);
    }
    return false;
  },
  views(d, players) {
    const out: Record<string, MusicView> = {};
    players.forEach((p) => (out[p.id] = { myPick: d.sec.quizPicks?.[p.id] ?? null }));
    return out;
  },
};

/** Para a UI: rótulo de cada modalidade. */
export const MODALITY_OPTIONS: { label: string; value: MusicModality }[] = [
  { label: 'Misturar todas as modalidades', value: 'mix' },
  { label: 'Adivinhar a música (dicas progressivas)', value: 'dicas' },
  { label: 'Adivinhar o artista / banda', value: 'artista' },
  { label: 'Completar informações', value: 'info' },
  { label: 'Identificar pelo contexto', value: 'contexto' },
  { label: 'Décadas musicais', value: 'decadas' },
  { label: 'Gêneros e estilos', value: 'generos' },
];

