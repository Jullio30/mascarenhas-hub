import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import type { Song } from '../../data/defaultPacks';
import { cfgNum, cfgStr, pickUnused, shuffle } from '../../core/engine/helpers';
import { isSongMatch, sanitizeShortText } from '../../lib/textUtils';

export const STAGE_MS = 12_000;
export const STAGE_POINTS = [15, 10, 7, 4];
export const ROUND_MS = STAGE_MS * 4;
const SUMMARY_MS = 7_000;
const FIRST_BLOOD = 3;
const MAX_GUESSES_PER_STAGE = 2;

export interface MusicClues {
  stage1?: { era: string; genre: string; hint: string };
  stage2?: string;
  stage3?: { artist: string; theme: string };
  stage4?: string[];
}

export interface MusicState extends BasePublicState {
  phase: 'ROUND_ACTIVE' | 'ROUND_SUMMARY' | 'FINISHED';
  participants: string[];
  genreFilter: string;
  startedAt: number;
  stage: number;
  clues: MusicClues;
  correct: Record<string, { stage: number; points: number; at: number; firstBlood: boolean }>;
  firstBlood: string | null;
  attempts: Record<string, { stage: number; used: number }>;
  wrongAt: Record<string, number>;
  answer: { title: string; artist: string } | null;
}

export interface MusicSecret {
  song: Song | null;
  options: string[];
}

type Draft = GameDraft<MusicState, MusicSecret>;

function songPool(ctx: EngineCtx): Song[] {
  const g = cfgStr(ctx, 'genre', 'all');
  const pool = g === 'all' ? ctx.catalog.songs : ctx.catalog.songs.filter((s) => s.genre === g);
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

function startRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const pool = songPool(ctx);
  const song = pickUnused(pool, (s) => 'mus:' + s.id, ctx);
  const sameGenre = ctx.catalog.songs.filter((s) => s.id !== song.id && s.genre === song.genre);
  const others = ctx.catalog.songs.filter((s) => s.id !== song.id && s.genre !== song.genre);
  const distractors = [...shuffle(sameGenre, ctx.rng), ...shuffle(others, ctx.rng)].slice(0, 3).map((s) => s.title);
  sec.song = song;
  sec.options = shuffle([song.title, ...distractors], ctx.rng);
  pub.phase = 'ROUND_ACTIVE';
  pub.startedAt = ctx.now;
  pub.endsAt = ctx.now + ROUND_MS;
  pub.correct = {};
  pub.firstBlood = null;
  pub.attempts = {};
  pub.wrongAt = {};
  pub.answer = null;
  revealUpTo(d, 1);
}

function endRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  pub.participants.forEach((id) => {
    if (!pub.correct[id]) ctx.stat(id, 'miss');
  });
  revealUpTo(d, 4);
  pub.answer = sec.song ? { title: sec.song.title, artist: sec.song.artist } : null;
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
  } as MusicState;
  const d: Draft = { pub, sec: { song: null, options: [] } };
  startRound(d, ctx);
  return d;
}

export const musicEngine: GameEngine<MusicState, MusicSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (a.type !== 'GUESS' || pub.phase !== 'ROUND_ACTIVE' || !sec.song) return false;
    if (!pub.participants.includes(from) || pub.correct[from]) return false;
    if (ctx.now > (pub.endsAt ?? 0)) return false;
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
  views() {
    return {};
  },
};
