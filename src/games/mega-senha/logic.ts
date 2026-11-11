import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import type { MegaSenhaWord } from '../../data/defaultPacks';
import { cfgNum, cfgStr, pickUnused, shuffle } from '../../core/engine/helpers';
import { isGuessCorrect, sanitizeShortText, validateClue } from '../../lib/textUtils';

export type MSPhase = 'TURN_INTRO' | 'CLUE' | 'GUESS' | 'WORD_RESULT' | 'TURN_SUMMARY' | 'FINISHED';

export interface MSWordResult {
  word: string;
  points: number;
  correct: boolean;
}

export interface MSState extends BasePublicState {
  phase: MSPhase;
  mode: 'rotating' | 'teams';
  teams: string[][] | null;
  schedule: [string, string][];
  turnIndex: number;
  giverId: string;
  guesserId: string;
  turnSeconds: number;
  turnEndsAt: number | null;
  wordsPerTurn: number;
  wordIndex: number;
  attempt: number;
  clues: string[];
  guesses: string[];
  wordLength: number;
  wordCategory: string;
  skipUsed: boolean;
  turnPoints: number;
  results: MSWordResult[];
  clueError: { at: number; msg: string } | null;
  skippedTurn: boolean;
}

export interface MSSecret {
  word: MegaSenhaWord | null;
  wordStartedAt: number;
}

export interface MSView {
  role: 'GIVER' | 'GUESSER' | 'SPECTATOR';
  secret_word: string | null;
  length: number;
  category: string;
}

type Draft = GameDraft<MSState, MSSecret>;

export const ATTEMPT_POINTS = [10, 7, 5];
export const STEP_MS = 15_000;
const INTRO_MS = 4_000;
const RESULT_MS = 3_000;
const SUMMARY_MS = 5_000;
const TOLERANCE_MS = 3_000;

function drawWord(d: Draft, ctx: EngineCtx) {
  const w = pickUnused(ctx.catalog.megaSenha, (x) => 'ms:' + x.word, ctx);
  d.sec.word = w;
  d.sec.wordStartedAt = ctx.now;
  d.pub.wordLength = w.word.replace(/\s/g, '').length;
  d.pub.wordCategory = w.category;
  d.pub.attempt = 1;
  d.pub.clues = [];
  d.pub.guesses = [];
  d.pub.clueError = null;
  d.pub.phase = 'CLUE';
  d.pub.endsAt = Math.min(ctx.now + STEP_MS, d.pub.turnEndsAt ?? Infinity);
}

function startTurn(d: Draft, index: number, ctx: EngineCtx) {
  const { pub } = d;
  const [giver, guesser] = pub.schedule[index];
  Object.assign(pub, {
    turnIndex: index,
    round: index + 1,
    giverId: giver,
    guesserId: guesser,
    phase: 'TURN_INTRO',
    endsAt: ctx.now + INTRO_MS,
    turnEndsAt: null,
    wordIndex: 0,
    attempt: 1,
    clues: [],
    guesses: [],
    wordLength: 0,
    wordCategory: '',
    skipUsed: false,
    turnPoints: 0,
    results: [],
    clueError: null,
    skippedTurn: false,
  } satisfies Partial<MSState>);
  d.sec.word = null;
}

function finishWord(d: Draft, ctx: EngineCtx, correct: boolean) {
  const { pub, sec } = d;
  const points = correct ? ATTEMPT_POINTS[pub.attempt - 1] ?? 0 : 0;
  if (correct) {
    ctx.award(pub.giverId, points);
    ctx.award(pub.guesserId, points);
    const resp = ctx.now - sec.wordStartedAt;
    if (pub.attempt === 1) {
      ctx.stat(pub.giverId, 'perfect');
      ctx.stat(pub.guesserId, 'perfect', resp);
    } else ctx.stat(pub.guesserId, 'miss', resp);
  } else {
    ctx.stat(pub.giverId, 'miss');
    ctx.stat(pub.guesserId, 'miss');
  }
  pub.turnPoints += points;
  pub.results = [...pub.results, { word: sec.word?.word ?? '?', points, correct }];
  pub.phase = 'WORD_RESULT';
  pub.endsAt = ctx.now + RESULT_MS;
}

function nextAttempt(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  if (pub.turnEndsAt && ctx.now >= pub.turnEndsAt) return finishWord(d, ctx, false);
  pub.attempt += 1;
  if (pub.attempt > 3) {
    pub.attempt = 3;
    return finishWord(d, ctx, false);
  }
  pub.phase = 'CLUE';
  pub.endsAt = Math.min(ctx.now + STEP_MS, pub.turnEndsAt ?? Infinity);
}

function toSummary(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'TURN_SUMMARY';
  d.pub.endsAt = ctx.now + SUMMARY_MS;
  d.sec.word = null;
}

export function createMegaSenha(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const order = shuffle(players.map((p) => p.id), ctx.rng);
  const laps = cfgNum(ctx, 'laps', 1);
  const wantTeams = cfgStr(ctx, 'mode', 'rotating') === 'teams' && order.length >= 4 && order.length % 2 === 0;
  const schedule: [string, string][] = [];
  let teams: string[][] | null = null;
  if (wantTeams) {
    teams = [];
    for (let i = 0; i < order.length; i += 2) teams.push([order[i], order[i + 1]]);
    const total = laps * teams.length * 2;
    for (let k = 0; k < total; k++) {
      const team = teams[k % teams.length];
      const swap = Math.floor(k / teams.length) % 2;
      schedule.push([team[swap], team[1 - swap]]);
    }
  } else {
    const total = laps * order.length;
    for (let k = 0; k < total; k++) schedule.push([order[k % order.length], order[(k + 1) % order.length]]);
  }
  const pub = {
    round: 1,
    totalRounds: schedule.length,
    mode: wantTeams ? 'teams' : 'rotating',
    teams,
    schedule,
    turnSeconds: cfgNum(ctx, 'turnSeconds', 60),
    wordsPerTurn: cfgNum(ctx, 'wordsPerTurn', 3),
  } as MSState;
  const d: Draft = { pub, sec: { word: null, wordStartedAt: 0 } };
  startTurn(d, 0, ctx);
  return d;
}

export const megaSenhaEngine: GameEngine<MSState, MSSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    switch (a.type) {
      case 'CLUE': {
        if (pub.phase !== 'CLUE' || from !== pub.giverId || !sec.word) return false;
        const clue = sanitizeShortText(String(a.text ?? ''), 24);
        const err = validateClue(clue, sec.word.word);
        if (err) {
          pub.clueError = { at: ctx.now, msg: err };
          return true; // não queima a tentativa
        }
        pub.clues = [...pub.clues, clue];
        pub.clueError = null;
        pub.phase = 'GUESS';
        pub.endsAt = Math.min(ctx.now + STEP_MS, pub.turnEndsAt ?? Infinity);
        return true;
      }
      case 'GUESS': {
        if (pub.phase !== 'GUESS' || from !== pub.guesserId || !sec.word) return false;
        const guess = sanitizeShortText(String(a.text ?? ''), 30);
        if (!guess) return false;
        pub.guesses = [...pub.guesses, guess];
        if (isGuessCorrect(guess, sec.word.word)) finishWord(d, ctx, true);
        else nextAttempt(d, ctx);
        return true;
      }
      case 'SKIP_WORD': {
        if ((pub.phase !== 'CLUE' && pub.phase !== 'GUESS') || from !== pub.giverId || pub.skipUsed) return false;
        pub.skipUsed = true;
        drawWord(d, ctx);
        return true;
      }
      default:
        return false;
    }
  },
  tick(d, ctx) {
    const { pub } = d;
    if (pub.phase === 'FINISHED' || !pub.endsAt) return false;
    const turnOver = pub.turnEndsAt !== null && ctx.now >= pub.turnEndsAt;
    switch (pub.phase) {
      case 'TURN_INTRO': {
        if (ctx.now < pub.endsAt) return false;
        const bothOnline = ctx.isOnline(pub.giverId) && ctx.isOnline(pub.guesserId);
        if (!bothOnline) {
          if (ctx.now < pub.endsAt + TOLERANCE_MS) return false;
          ctx.log('Turno da dupla pulado: jogador desconectado');
          pub.skippedTurn = true;
          toSummary(d, ctx);
          return true;
        }
        pub.turnEndsAt = ctx.now + pub.turnSeconds * 1000;
        drawWord(d, ctx);
        return true;
      }
      case 'CLUE':
      case 'GUESS':
        if (turnOver) {
          finishWord(d, ctx, false);
          return true;
        }
        if (ctx.now < pub.endsAt) return false;
        if (pub.phase === 'GUESS') pub.guesses = [...pub.guesses, '⏱️'];
        nextAttempt(d, ctx);
        return true;
      case 'WORD_RESULT':
        if (ctx.now < pub.endsAt) return false;
        pub.wordIndex += 1;
        if (pub.wordIndex >= pub.wordsPerTurn || turnOver) toSummary(d, ctx);
        else drawWord(d, ctx);
        return true;
      case 'TURN_SUMMARY':
        if (ctx.now < pub.endsAt) return false;
        if (pub.turnIndex + 1 >= pub.schedule.length) {
          pub.phase = 'FINISHED';
          pub.endsAt = null;
        } else startTurn(d, pub.turnIndex + 1, ctx);
        return true;
      default:
        return false;
    }
  },
  views(d, players) {
    const { pub, sec } = d;
    const out: Record<string, MSView> = {};
    players.forEach((p) => {
      const role = p.id === pub.giverId ? 'GIVER' : p.id === pub.guesserId ? 'GUESSER' : 'SPECTATOR';
      out[p.id] = {
        role,
        secret_word: role === 'GIVER' && sec.word ? sec.word.word : null,
        length: pub.wordLength,
        category: pub.wordCategory,
      };
    });
    return out;
  },
};
