import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, pick, pickUnused, shuffle } from '../../core/engine/helpers';
import { normalize, sanitizeShortText } from '../../lib/textUtils';

export type ImpPhase =
  | 'ROLE_REVEAL'
  | 'CLUE_ROTATION'
  | 'DISCUSSION_AND_VOTING'
  | 'VOTE_REVELATION'
  | 'IMPOSTOR_LAST_GUESS'
  | 'ROUND_SUMMARY'
  | 'FINISHED';

export interface ImpClue {
  pid: string;
  text: string;
  skipped?: boolean;
}

export interface ImpState extends BasePublicState {
  phase: ImpPhase;
  participants: string[];
  category: string;
  clueMode: 'typed' | 'spoken';
  order: string[];
  clueIndex: number;
  clues: ImpClue[];
  votedIds: string[];
  votes: Record<string, string> | null;
  tally: Record<string, number> | null;
  caughtId: string | null;
  escaped: boolean | null;
  guessOptions: string[] | null;
  guessedWord: string | null;
  guessCorrect: boolean | null;
  impostorIds: string[] | null;
  secretWord: string | null;
  annulled: boolean;
  pointsDelta: Record<string, number>;
}

export interface ImpSecret {
  word: string;
  category: string;
  impostorIds: string[];
  votes: Record<string, string>;
  offlineSince: number | null;
}

export interface ImpView {
  role: 'IMPOSTOR' | 'CITIZEN' | 'SPECTATOR';
  category: string;
  secret_word: string | null;
  partners?: string[];
}

type Draft = GameDraft<ImpState, ImpSecret>;

export const REVEAL_MS = 15_000;
export const CLUE_MS = 30_000;
export const VOTE_MS = 60_000;
export const LAST_GUESS_MS = 15_000;
const REVELATION_MS = 6_000;
const SUMMARY_MS = 9_000;
const TOLERANCE_MS = 3_000;
const IMPOSTOR_DC_MS = 20_000;

function startRound(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const catCfg = cfgStr(ctx, 'category', 'all');
  const pool = catCfg === 'all' ? ctx.catalog.impostor : ctx.catalog.impostor.filter((c) => c.name === catCfg);
  const category = pick(pool.length ? pool : ctx.catalog.impostor, ctx.rng);
  const word = pickUnused(category.words, (w) => `imp:${category.name}:${w}`, ctx);

  const active = pub.participants.filter((id) => ctx.isOnline(id));
  const roster = active.length >= 3 ? active : pub.participants;
  const wanted = cfgNum(ctx, 'impostorCount', 1);
  const count = roster.length >= 7 && wanted >= 2 ? 2 : 1;
  const impostorIds = shuffle(roster, ctx.rng).slice(0, count);

  // Ordem de dicas: o impostor tem no máximo 25% de chance de falar primeiro.
  const citizens = roster.filter((id) => !impostorIds.includes(id));
  const impFirstChance = Math.min(0.25, impostorIds.length / roster.length);
  const first = ctx.rng() < impFirstChance ? pick(impostorIds, ctx.rng) : pick(citizens, ctx.rng);
  const order = [first, ...shuffle(roster.filter((id) => id !== first), ctx.rng)];

  sec.word = word;
  sec.category = category.name;
  sec.impostorIds = impostorIds;
  sec.votes = {};
  sec.offlineSince = null;

  Object.assign(pub, {
    phase: 'ROLE_REVEAL',
    category: category.name,
    order,
    clueIndex: 0,
    clues: [],
    votedIds: [],
    votes: null,
    tally: null,
    caughtId: null,
    escaped: null,
    guessOptions: null,
    guessedWord: null,
    guessCorrect: null,
    impostorIds: null,
    secretWord: null,
    annulled: false,
    pointsDelta: {},
    endsAt: ctx.now + REVEAL_MS,
  } satisfies Partial<ImpState>);
}

function beginClueTurn(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  while (pub.clueIndex < pub.order.length && !ctx.isOnline(pub.order[pub.clueIndex])) {
    pub.clues = [...pub.clues, { pid: pub.order[pub.clueIndex], text: '—', skipped: true }];
    pub.clueIndex += 1;
  }
  if (pub.clueIndex >= pub.order.length) {
    pub.phase = 'DISCUSSION_AND_VOTING';
    pub.endsAt = ctx.now + VOTE_MS;
    return;
  }
  pub.phase = 'CLUE_ROTATION';
  pub.endsAt = ctx.now + CLUE_MS;
}

function addClue(d: Draft, ctx: EngineCtx, text: string, skipped = false) {
  const { pub } = d;
  pub.clues = [...pub.clues, { pid: pub.order[pub.clueIndex], text, skipped }];
  pub.clueIndex += 1;
  beginClueTurn(d, ctx);
}

function settleVotes(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const tally: Record<string, number> = {};
  Object.values(sec.votes).forEach((t) => (tally[t] = (tally[t] ?? 0) + 1));
  const max = Math.max(0, ...Object.values(tally));
  const top = Object.keys(tally).filter((k) => tally[k] === max);
  pub.votes = { ...sec.votes };
  pub.tally = tally;
  pub.impostorIds = [...sec.impostorIds];
  const caught = max > 0 && top.length === 1 && sec.impostorIds.includes(top[0]) ? top[0] : null;
  pub.caughtId = caught;
  pub.escaped = !caught;
  pub.phase = 'VOTE_REVELATION';
  pub.endsAt = ctx.now + REVELATION_MS;
  if (!caught) {
    const delta: Record<string, number> = {};
    sec.impostorIds.forEach((id) => {
      delta[id] = 15;
      ctx.stat(id, 'bluff');
      ctx.stat(id, 'perfect');
    });
    Object.entries(sec.votes).forEach(([voter, target]) => {
      if (sec.impostorIds.includes(voter)) return;
      if (sec.impostorIds.includes(target)) {
        delta[voter] = (delta[voter] ?? 0) + 3;
      } else ctx.stat(voter, 'miss');
    });
    applyDelta(pub, delta, ctx);
  }
}

function applyDelta(pub: ImpState, delta: Record<string, number>, ctx: EngineCtx) {
  Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
  pub.pointsDelta = delta;
}

function settleGuess(d: Draft, ctx: EngineCtx, guess: string | null) {
  const { pub, sec } = d;
  const correct = guess !== null && normalize(guess) === normalize(sec.word);
  pub.guessedWord = guess;
  pub.guessCorrect = correct;
  const delta: Record<string, number> = {};
  const citizens = pub.order.filter((id) => !sec.impostorIds.includes(id));
  const votedRight = (id: string) => sec.impostorIds.includes(sec.votes[id] ?? '');
  if (correct) {
    sec.impostorIds.forEach((id) => {
      delta[id] = 10;
      ctx.stat(id, 'bluff');
    });
    citizens.forEach((id) => votedRight(id) && (delta[id] = 5));
  } else {
    sec.impostorIds.forEach((id) => ctx.stat(id, 'miss'));
    citizens.forEach((id) => {
      delta[id] = 10 + (votedRight(id) ? 3 : 0);
      if (votedRight(id)) ctx.stat(id, 'perfect');
    });
  }
  applyDelta(pub, delta, ctx);
  toSummary(d, ctx);
}

function toSummary(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'ROUND_SUMMARY';
  d.pub.secretWord = d.sec.word;
  d.pub.impostorIds = [...d.sec.impostorIds];
  d.pub.endsAt = ctx.now + SUMMARY_MS;
}

export function createImpostor(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const pub: ImpState = {
    phase: 'ROLE_REVEAL',
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 5),
    endsAt: null,
    participants: players.map((p) => p.id),
    category: '',
    clueMode: cfgStr(ctx, 'clueMode', 'typed') === 'spoken' ? 'spoken' : 'typed',
    order: [],
    clueIndex: 0,
    clues: [],
    votedIds: [],
    votes: null,
    tally: null,
    caughtId: null,
    escaped: null,
    guessOptions: null,
    guessedWord: null,
    guessCorrect: null,
    impostorIds: null,
    secretWord: null,
    annulled: false,
    pointsDelta: {},
  };
  const d: Draft = { pub, sec: { word: '', category: '', impostorIds: [], votes: {}, offlineSince: null } };
  startRound(d, ctx);
  return d;
}

export const impostorEngine: GameEngine<ImpState, ImpSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    switch (a.type) {
      case 'CLUE': {
        if (pub.phase !== 'CLUE_ROTATION' || pub.order[pub.clueIndex] !== from) return false;
        const text = pub.clueMode === 'spoken' ? '🗣️ dica falada' : sanitizeShortText(String(a.text ?? ''), 30);
        if (!text) return false;
        if (pub.clueMode === 'typed' && !sec.impostorIds.includes(from) && normalize(text).includes(normalize(sec.word))) return false;
        addClue(d, ctx, text);
        return true;
      }
      case 'VOTE': {
        const target = String(a.target ?? '');
        if (pub.phase !== 'DISCUSSION_AND_VOTING' || !pub.order.includes(from) || pub.votedIds.includes(from)) return false;
        if (target === from || !pub.order.includes(target)) return false;
        sec.votes[from] = target;
        pub.votedIds = [...pub.votedIds, from];
        const pending = pub.order.filter((id) => !pub.votedIds.includes(id) && ctx.isOnline(id));
        if (pending.length === 0) settleVotes(d, ctx);
        return true;
      }
      case 'LAST_GUESS': {
        if (pub.phase !== 'IMPOSTOR_LAST_GUESS' || from !== pub.caughtId) return false;
        settleGuess(d, ctx, sanitizeShortText(String(a.word ?? ''), 40));
        return true;
      }
      default:
        return false;
    }
  },
  tick(d, ctx) {
    const { pub, sec } = d;
    if (pub.phase === 'FINISHED' || !pub.endsAt) return false;

    // Desconexão crítica do(s) impostor(es) antes da votação => rodada anulada.
    if (pub.phase === 'ROLE_REVEAL' || pub.phase === 'CLUE_ROTATION') {
      const anyOnline = sec.impostorIds.some((id) => ctx.isOnline(id));
      if (!anyOnline) {
        if (sec.offlineSince === null) {
          sec.offlineSince = ctx.now;
          return true;
        }
        if (ctx.now - sec.offlineSince > IMPOSTOR_DC_MS) {
          ctx.log('Impostor desconectado — rodada anulada, nova palavra sorteada');
          startRound(d, ctx);
          pub.annulled = true;
          return true;
        }
      } else if (sec.offlineSince !== null) {
        sec.offlineSince = null;
        return true;
      }
    }

    switch (pub.phase) {
      case 'ROLE_REVEAL':
        if (ctx.now < pub.endsAt) return false;
        pub.annulled = false;
        beginClueTurn(d, ctx);
        return true;
      case 'CLUE_ROTATION': {
        const active = pub.order[pub.clueIndex];
        const offlineSkip = !ctx.isOnline(active) && ctx.now > pub.endsAt - CLUE_MS + TOLERANCE_MS;
        if (!offlineSkip && ctx.now < pub.endsAt + TOLERANCE_MS) return false;
        addClue(d, ctx, '⏱️ sem dica', true);
        return true;
      }
      case 'DISCUSSION_AND_VOTING':
        if (ctx.now < pub.endsAt) return false;
        settleVotes(d, ctx);
        return true;
      case 'VOTE_REVELATION': {
        if (ctx.now < pub.endsAt) return false;
        if (pub.caughtId) {
          const cat = ctx.catalog.impostor.find((c) => c.name === sec.category);
          const distractors = shuffle((cat?.words ?? []).filter((w) => w !== sec.word), ctx.rng).slice(0, 7);
          pub.guessOptions = shuffle([sec.word, ...distractors], ctx.rng);
          pub.phase = 'IMPOSTOR_LAST_GUESS';
          pub.endsAt = ctx.now + LAST_GUESS_MS;
        } else {
          toSummary(d, ctx);
        }
        return true;
      }
      case 'IMPOSTOR_LAST_GUESS':
        if (ctx.now < pub.endsAt) return false;
        settleGuess(d, ctx, null);
        return true;
      case 'ROUND_SUMMARY':
        if (ctx.now < pub.endsAt) return false;
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
    const out: Record<string, ImpView> = {};
    const { sec, pub } = d;
    players.forEach((p) => {
      if (!pub.order.includes(p.id)) {
        out[p.id] = { role: 'SPECTATOR', category: sec.category, secret_word: null };
      } else if (sec.impostorIds.includes(p.id)) {
        out[p.id] = { role: 'IMPOSTOR', category: sec.category, secret_word: null, partners: sec.impostorIds.filter((x) => x !== p.id) };
      } else {
        out[p.id] = { role: 'CITIZEN', category: sec.category, secret_word: sec.word };
      }
    });
    return out;
  },
};
