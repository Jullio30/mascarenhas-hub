import type { BasePublicState, EngineCtx, GameConfig, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, pickUnused, shuffle } from '../../core/engine/helpers';
import { isSameAnswer, normalize, sanitizeShortText } from '../../lib/textUtils';
import { fetchEvolutionPairs } from '../../services/externalApis';
import { pushNotice, type PrivateNotice } from '../_shared/notice';
import { INFILTRADO_CATALOG, type InfiltradoPair } from './infiltradoCatalog';

export type InfPhase =
  | 'SECRET_WORD_DISTRIBUTION'
  | 'CLUE_ROUND'
  | 'DISCUSSION'
  | 'SECRET_VOTING'
  | 'TIE_DEFENSE_AND_REVOTE'
  | 'HOST_TIEBREAK'
  | 'NO_ELIMINATION'
  | 'ELIMINATION_REVEAL'
  | 'INFILTRADO_LAST_CHANCE_GUESS'
  | 'VICTORY_CHECK'
  | 'MATCH_RESULT'
  | 'FINISHED';

export interface InfClue {
  pid: string;
  cycle: number;
  text: string;
  skipped?: boolean;
}

export interface InfState extends BasePublicState {
  phase: InfPhase;
  participants: string[];
  alive: Record<string, boolean>;
  quickMode: boolean;
  undercoverCount: number;
  category: string;
  cycle: number;
  order: string[];
  clueIndex: number;
  clueMode: 'typed' | 'spoken';
  clues: InfClue[];
  readyIds: string[];
  votedIds: string[];
  tied: string[] | null;
  tieVoters: string[] | null;
  /** Resultado da última votação (revelado ao fim de cada votação). */
  lastTally: Record<string, number> | null;
  lastVotes: Record<string, string> | null;
  noElimStreak: number;
  eliminatedId: string | null;
  eliminatedRole: 'COMUM' | 'INFILTRADO' | null;
  eliminations: { pid: string; cycle: number; role: 'COMUM' | 'INFILTRADO' }[];
  guessText: string | null;
  guessCorrect: boolean | null;
  winner: 'COMUNS' | 'INFILTRADOS' | null;
  winReason: string | null;
  /** Revelados só em MATCH_RESULT. */
  majorityWord: string | null;
  undercoverWord: string | null;
  undercoverIds: string[] | null;
  pointsDelta: Record<string, number>;
  /** Motivo do último ciclo sem eliminação (texto da tela NO_ELIMINATION). Opcional: estados antigos não têm. */
  noElimReason?: 'tie' | 'impasse' | null;
  /** Último ciclo permitido: nele, empate sem decisão encerra a partida a favor dos Infiltrados. */
  maxCycles?: number;
}

export interface InfSecret {
  majorityWord: string;
  undercoverWord: string;
  undercoverIds: string[];
  votes: Record<string, string>;
  history: { cycle: number; voter: string; target: string }[];
  notices: Record<string, PrivateNotice>;
  queue: InfiltradoPair[];
}

export interface InfView {
  word: string | null;
  category: string;
  alive: boolean;
  myVote: string | null;
  notice: PrivateNotice | null;
}

type Draft = GameDraft<InfState, InfSecret>;

export const DISTRIBUTION_MS = 15_000;
export const CLUE_MS = 25_000;
export const DISCUSSION_MS = 45_000;
export const VOTE_MS = 30_000;
export const REVOTE_MS = 30_000;
export const TIEBREAK_MS = 20_000;
export const NO_ELIM_MS = 5_000;
export const ELIM_REVEAL_MS = 6_000;
export const GUESS_MS = 20_000;
export const CHECK_MS = 4_000;
export const RESULT_MS = 14_000;
const OFFLINE_SKIP_MS = 5_000;

/**
 * Teto de ciclos (trava contra partidas infinitas). Cada ciclo com eliminação tira 1 jogador, então
 * "participantes + 1" nunca corta uma partida que esteja progredindo normalmente.
 */
export const maxCyclesFor = (participants: number) => participants + 1;
export const IMPASSE_TEXT = 'Impasse no desempate! Ninguém foi eliminado nesta rodada';
export const ESCAPE_REASON = 'Fuga do Infiltrado: o grupo não chegou a um consenso na votação final, e a falta de acordo favorece os Infiltrados!';

/** 3 jogadores (modo rápido) e 4–6 → 1 infiltrado; 7–12 → 2 infiltrados. */
export function undercoverCountFor(n: number): number {
  return n >= 7 ? 2 : 1;
}

const living = (pub: InfState) => pub.participants.filter((id) => pub.alive[id]);

function label(pub: InfState) {
  const last = pub.maxCycles && pub.cycle >= pub.maxCycles ? ' (votação final)' : '';
  pub.roundLabel = `${pub.totalRounds > 1 ? `Partida ${pub.round}/${pub.totalRounds} • ` : ''}Ciclo ${pub.cycle}${last}`;
}

const isFinalCycle = (pub: InfState) => pub.cycle >= (pub.maxCycles ?? maxCyclesFor(pub.participants.length));

function startMatch(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const cat = cfgStr(ctx, 'category', 'all');
  let pair: InfiltradoPair | undefined;
  while (sec.queue.length && !pair) {
    const p = sec.queue.shift()!;
    if (cat === 'all' || p.category === cat) pair = p;
  }
  if (!pair) {
    const pool = cat === 'all' ? INFILTRADO_CATALOG : INFILTRADO_CATALOG.filter((p) => p.category === cat);
    pair = pickUnused(pool.length ? pool : INFILTRADO_CATALOG, (p) => p.id, ctx);
  }
  // sorteia qual palavra do par é a da maioria: conhecer o catálogo não entrega o papel
  const flip = ctx.rng() < 0.5;
  sec.majorityWord = flip ? pair.a : pair.b;
  sec.undercoverWord = flip ? pair.b : pair.a;
  const roster = pub.participants.filter((id) => ctx.isOnline(id));
  const players = roster.length >= 3 ? roster : pub.participants;
  pub.participants = players;
  pub.undercoverCount = undercoverCountFor(players.length);
  pub.quickMode = players.length === 3;
  sec.undercoverIds = shuffle(players, ctx.rng).slice(0, pub.undercoverCount);
  sec.votes = {};
  sec.history = [];
  Object.assign(pub, {
    phase: 'SECRET_WORD_DISTRIBUTION',
    alive: Object.fromEntries(players.map((id) => [id, true])),
    category: pair.category,
    cycle: 1,
    order: [],
    clueIndex: 0,
    clues: [],
    readyIds: [],
    votedIds: [],
    tied: null,
    tieVoters: null,
    lastTally: null,
    lastVotes: null,
    noElimStreak: 0,
    eliminatedId: null,
    eliminatedRole: null,
    eliminations: [],
    guessText: null,
    guessCorrect: null,
    winner: null,
    winReason: null,
    majorityWord: null,
    undercoverWord: null,
    undercoverIds: null,
    pointsDelta: {},
    noElimReason: null,
    maxCycles: maxCyclesFor(players.length),
    endsAt: ctx.now + DISTRIBUTION_MS,
  } satisfies Partial<InfState>);
  label(pub);
}

function startCycle(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  const alive = living(pub);
  // ordem de fala definida: rotaciona a cada ciclo
  const shift = (pub.cycle - 1) % alive.length;
  pub.order = pub.cycle === 1 ? shuffle(alive, ctx.rng) : [...alive.slice(shift), ...alive.slice(0, shift)];
  pub.clueIndex = 0;
  pub.readyIds = [];
  pub.votedIds = [];
  pub.tied = null;
  pub.tieVoters = null;
  pub.eliminatedId = null;
  pub.eliminatedRole = null;
  pub.guessText = null;
  pub.guessCorrect = null;
  d.sec.votes = {};
  label(pub);
  beginClueTurn(d, ctx);
}

function beginClueTurn(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  if (pub.clueIndex >= pub.order.length) {
    pub.phase = 'DISCUSSION';
    pub.endsAt = ctx.now + DISCUSSION_MS;
    return;
  }
  pub.phase = 'CLUE_ROUND';
  pub.endsAt = ctx.now + CLUE_MS;
}

function addClue(d: Draft, ctx: EngineCtx, text: string, skipped = false) {
  const { pub } = d;
  pub.clues = [...pub.clues, { pid: pub.order[pub.clueIndex], cycle: pub.cycle, text, skipped }];
  pub.clueIndex += 1;
  beginClueTurn(d, ctx);
}

function openVoting(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'SECRET_VOTING';
  d.pub.votedIds = [];
  d.sec.votes = {};
  d.pub.endsAt = ctx.now + VOTE_MS;
}

function tallyVotes(votes: Record<string, string>) {
  const tally: Record<string, number> = {};
  Object.values(votes).forEach((t) => (tally[t] = (tally[t] ?? 0) + 1));
  const max = Math.max(0, ...Object.values(tally));
  const top = max > 0 ? Object.keys(tally).filter((k) => tally[k] === max) : [];
  return { tally, top };
}

function recordVotes(d: Draft) {
  const { pub, sec } = d;
  Object.entries(sec.votes).forEach(([voter, target]) => sec.history.push({ cycle: pub.cycle, voter, target }));
  pub.lastVotes = { ...sec.votes };
}

function closeVoting(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  recordVotes(d);
  const { tally, top } = tallyVotes(sec.votes);
  pub.lastTally = tally;
  if (top.length === 1) return eliminate(d, ctx, top[0]);
  if (top.length === 0) {
    // ninguém votou: a partir do 4º ciclo, após um ciclo sem eliminação, o anfitrião decide (evita partida infinita)
    if (pub.cycle >= 4 && pub.noElimStreak >= 1) {
      pub.tied = living(pub);
      pub.phase = 'HOST_TIEBREAK';
      pub.endsAt = ctx.now + TIEBREAK_MS;
      return;
    }
    return noElimination(d, ctx);
  }
  // empate no topo → defesa + votação de desempate só entre os empatados
  const alive = living(pub);
  const others = alive.filter((id) => !top.includes(id));
  pub.tied = top;
  pub.tieVoters = others.length ? others : alive;
  pub.votedIds = [];
  sec.votes = {};
  pub.phase = 'TIE_DEFENSE_AND_REVOTE';
  pub.endsAt = ctx.now + REVOTE_MS;
}

function closeRevote(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  recordVotes(d);
  const { tally, top } = tallyVotes(sec.votes);
  pub.lastTally = tally;
  if (top.length === 1) return eliminate(d, ctx, top[0]);
  // empate persistente: a partir do 4º ciclo, 2 ciclos seguidos sem eliminação → voto de minerva do anfitrião
  if (pub.cycle >= 4 && pub.noElimStreak >= 1 && pub.tied?.length) {
    pub.phase = 'HOST_TIEBREAK';
    pub.endsAt = ctx.now + TIEBREAK_MS;
    return;
  }
  noElimination(d, ctx);
}

function noElimination(d: Draft, ctx: EngineCtx, reason: 'tie' | 'impasse' = 'tie') {
  // na votação final não há próximo ciclo: sem consenso, o(s) Infiltrado(s) escapa(m)
  if (isFinalCycle(d.pub)) return finishMatch(d, ctx, 'INFILTRADOS', ESCAPE_REASON);
  d.pub.noElimStreak += 1;
  d.pub.noElimReason = reason;
  d.pub.phase = 'NO_ELIMINATION';
  d.pub.endsAt = ctx.now + NO_ELIM_MS;
  ctx.log(reason === 'impasse' ? `Ciclo ${d.pub.cycle}: ${IMPASSE_TEXT}` : `Ciclo ${d.pub.cycle}: empate persistente, ninguém foi eliminado`);
}

/**
 * Tempo do voto de minerva esgotado (ou anfitrião desconectado): NUNCA sorteia um eliminado.
 * Impasse → ninguém sai e o jogo segue para o próximo ciclo; no ciclo final, os Infiltrados escapam.
 */
function tiebreakImpasse(d: Draft, ctx: EngineCtx) {
  noElimination(d, ctx, 'impasse');
}

function eliminate(d: Draft, ctx: EngineCtx, pid: string) {
  const { pub, sec } = d;
  const role = sec.undercoverIds.includes(pid) ? 'INFILTRADO' : 'COMUM';
  pub.alive = { ...pub.alive, [pid]: false };
  pub.eliminatedId = pid;
  pub.eliminatedRole = role;
  pub.eliminations = [...pub.eliminations, { pid, cycle: pub.cycle, role }];
  pub.noElimStreak = 0;
  pub.noElimReason = null;
  pub.phase = 'ELIMINATION_REVEAL';
  pub.endsAt = ctx.now + ELIM_REVEAL_MS;
  const nick = ctx.players.find((p) => p.id === pid)?.nickname ?? 'Jogador';
  ctx.log(`${nick} foi eliminado — era ${role === 'INFILTRADO' ? 'um INFILTRADO' : 'um JOGADOR COMUM'}`);
}

function toVictoryCheck(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'VICTORY_CHECK';
  d.pub.endsAt = ctx.now + CHECK_MS;
}

function evaluateVictory(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const alive = living(pub);
  const I = alive.filter((id) => sec.undercoverIds.includes(id)).length;
  const C = alive.length - I;
  if (I === 0) return finishMatch(d, ctx, 'COMUNS', 'Todos os Infiltrados foram eliminados!');
  if (I >= C) return finishMatch(d, ctx, 'INFILTRADOS', 'Os Infiltrados alcançaram a paridade numérica!');
  pub.cycle += 1;
  startCycle(d, ctx);
}

function finishMatch(d: Draft, ctx: EngineCtx, winner: 'COMUNS' | 'INFILTRADOS', reason: string) {
  const { pub, sec } = d;
  const delta: Record<string, number> = {};
  const add = (id: string, pts: number) => (delta[id] = (delta[id] ?? 0) + pts);
  const commons = pub.participants.filter((id) => !sec.undercoverIds.includes(id));
  const correctVotes = (id: string) => sec.history.filter((h) => h.voter === id && sec.undercoverIds.includes(h.target)).length;
  if (winner === 'COMUNS') {
    commons.forEach((id) => {
      add(id, 1000);
      if (pub.alive[id]) add(id, 200);
      add(id, 150 * correctVotes(id));
      ctx.stat(id, 'perfect');
    });
    sec.undercoverIds.forEach((id) => ctx.stat(id, 'miss'));
  } else {
    sec.undercoverIds.forEach((id) => {
      add(id, 1500);
      ctx.stat(id, 'bluff');
      ctx.stat(id, 'perfect');
    });
    commons.forEach((id) => correctVotes(id) > 0 && add(id, 200));
  }
  Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
  Object.assign(pub, {
    phase: 'MATCH_RESULT',
    winner,
    winReason: reason,
    majorityWord: sec.majorityWord,
    undercoverWord: sec.undercoverWord,
    undercoverIds: [...sec.undercoverIds],
    pointsDelta: delta,
    endsAt: ctx.now + RESULT_MS,
  } satisfies Partial<InfState>);
  ctx.log(winner === 'COMUNS' ? 'Vitória dos Jogadores Comuns!' : 'Vitória dos Infiltrados!');
}

function wordOf(sec: InfSecret, id: string) {
  return sec.undercoverIds.includes(id) ? sec.undercoverWord : sec.majorityWord;
}

export function createInfiltrado(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const external = Array.isArray(ctx.external) ? (ctx.external as InfiltradoPair[]) : [];
  const pub = {
    phase: 'SECRET_WORD_DISTRIBUTION',
    round: 1,
    totalRounds: cfgNum(ctx, 'matches', 1),
    endsAt: null,
    participants: players.map((p) => p.id).slice(0, 12),
    clueMode: cfgStr(ctx, 'clueMode', 'typed') === 'spoken' ? 'spoken' : 'typed',
  } as unknown as InfState;
  const d: Draft = { pub, sec: { majorityWord: '', undercoverWord: '', undercoverIds: [], votes: {}, history: [], notices: {}, queue: external } };
  startMatch(d, ctx);
  return d;
}

export const infiltradoEngine: GameEngine<InfState, InfSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    switch (a.type) {
      case 'CLUE': {
        // anti-spoofing: só o jogador da vez, vivo
        if (pub.phase !== 'CLUE_ROUND' || pub.order[pub.clueIndex] !== from || !pub.alive[from]) return false;
        if (pub.clueMode === 'spoken') {
          addClue(d, ctx, '🗣️ dica falada');
          return true;
        }
        const text = sanitizeShortText(String(a.text ?? ''), 40);
        const words = normalize(text).split(' ').filter(Boolean);
        if (!words.length) return false;
        if (words.length > 3) {
          pushNotice(sec.notices, from, ctx.now, 'Use uma dica curta: de 1 a 3 palavras.');
          return true;
        }
        const mine = normalize(wordOf(sec, from));
        const clue = normalize(text);
        const compact = clue.replace(/\s/g, '');
        const spoils = clue.includes(mine) || compact.includes(mine.replace(/\s/g, '')) || (compact.length >= 4 && mine.replace(/\s/g, '').includes(compact));
        if (spoils) {
          pushNotice(sec.notices, from, ctx.now, 'Dica bloqueada: ela contém a sua palavra secreta!');
          return true;
        }
        addClue(d, ctx, text);
        return true;
      }
      case 'READY': {
        if (pub.phase !== 'DISCUSSION' || !pub.alive[from] || pub.readyIds.includes(from)) return false;
        pub.readyIds = [...pub.readyIds, from];
        if (pub.readyIds.length > living(pub).length / 2) openVoting(d, ctx);
        return true;
      }
      case 'GO_VOTE': {
        if (pub.phase !== 'DISCUSSION' || from !== ctx.hostId) return false;
        openVoting(d, ctx);
        return true;
      }
      case 'VOTE': {
        const target = String(a.target ?? '');
        if (pub.phase === 'SECRET_VOTING') {
          // vivos votam em outro vivo; proibido votar em si mesmo; 1 voto por ciclo
          if (!pub.alive[from] || !pub.alive[target] || target === from || sec.votes[from]) return false;
          sec.votes[from] = target;
          pub.votedIds = [...pub.votedIds, from];
          if (living(pub).every((id) => sec.votes[id] || !ctx.isOnline(id))) closeVoting(d, ctx);
          return true;
        }
        if (pub.phase === 'TIE_DEFENSE_AND_REVOTE') {
          if (!pub.tieVoters?.includes(from) || !pub.tied?.includes(target) || target === from || sec.votes[from]) return false;
          sec.votes[from] = target;
          pub.votedIds = [...pub.votedIds, from];
          const voters = pub.tieVoters.filter((id) => pub.alive[id]);
          if (voters.every((id) => sec.votes[id] || !ctx.isOnline(id))) closeRevote(d, ctx);
          return true;
        }
        return false;
      }
      case 'TIEBREAK': {
        const target = String(a.target ?? '');
        if (pub.phase !== 'HOST_TIEBREAK' || from !== ctx.hostId || !pub.tied?.includes(target)) return false;
        eliminate(d, ctx, target);
        return true;
      }
      case 'GUESS': {
        if (pub.phase !== 'INFILTRADO_LAST_CHANCE_GUESS' || from !== pub.eliminatedId) return false;
        const guess = sanitizeShortText(String(a.text ?? ''), 40);
        if (!guess) return false;
        const correct = isSameAnswer(guess, sec.majorityWord);
        pub.guessCorrect = correct;
        const othersAlive = living(pub).some((id) => sec.undercoverIds.includes(id));
        // o chute errado só é mostrado se não houver outro infiltrado vivo (não ajuda o parceiro)
        pub.guessText = correct || !othersAlive ? guess : null;
        if (correct) finishMatch(d, ctx, 'INFILTRADOS', 'O Infiltrado eliminado adivinhou a palavra da Maioria e roubou a vitória!');
        else toVictoryCheck(d, ctx);
        return true;
      }
      default:
        return false;
    }
  },
  tick(d, ctx) {
    const { pub, sec } = d;
    if (!pub.endsAt) return false;
    // jogador removido pelo anfitrião: sai do jogo como eliminado e a vitória é reavaliada
    const removed = pub.phase === 'MATCH_RESULT' ? [] : living(pub).filter((id) => !ctx.players.some((p) => p.id === id));
    if (removed.length) {
      removed.forEach((id) => (pub.alive[id] = false));
      // votos dados por ele ou nele deixam de valer
      Object.keys(sec.votes).forEach((v) => {
        if (removed.includes(v) || removed.includes(sec.votes[v])) delete sec.votes[v];
      });
      pub.votedIds = pub.votedIds.filter((id) => !removed.includes(id));
      if (pub.tied) pub.tied = pub.tied.filter((id) => !removed.includes(id));
      if (pub.tieVoters) pub.tieVoters = pub.tieVoters.filter((id) => !removed.includes(id));
      ctx.log(`Um jogador foi removido da partida`);
      const alive = living(pub);
      const I = alive.filter((id) => sec.undercoverIds.includes(id)).length;
      if (I === 0) finishMatch(d, ctx, 'COMUNS', 'Nenhum Infiltrado restou na partida!');
      else if (I >= alive.length - I) finishMatch(d, ctx, 'INFILTRADOS', 'Os Infiltrados alcançaram a paridade numérica!');
      else if (pub.phase === 'CLUE_ROUND' && !pub.alive[pub.order[pub.clueIndex]]) addClue(d, ctx, '— removido', true);
      return true;
    }
    if (pub.phase === 'CLUE_ROUND' && !pub.alive[pub.order[pub.clueIndex]]) {
      addClue(d, ctx, '— removido', true);
      return true;
    }
    // anfitrião offline durante o voto de minerva: não há quem decida → impasse imediato (sem sorteio)
    if (pub.phase === 'HOST_TIEBREAK' && !ctx.isOnline(ctx.hostId)) {
      tiebreakImpasse(d, ctx);
      return true;
    }
    if (pub.phase === 'CLUE_ROUND') {
      const active = pub.order[pub.clueIndex];
      const offlineSkip = !ctx.isOnline(active) && ctx.now > pub.endsAt - CLUE_MS + OFFLINE_SKIP_MS;
      if (!offlineSkip && ctx.now < pub.endsAt) return false;
      addClue(d, ctx, '⏱️ sem dica', true);
      return true;
    }
    if (ctx.now < pub.endsAt) return false;
    switch (pub.phase) {
      case 'SECRET_WORD_DISTRIBUTION':
        startCycle(d, ctx);
        return true;
      case 'DISCUSSION':
        openVoting(d, ctx);
        return true;
      case 'SECRET_VOTING':
        closeVoting(d, ctx);
        return true;
      case 'TIE_DEFENSE_AND_REVOTE':
        closeRevote(d, ctx);
        return true;
      case 'HOST_TIEBREAK':
        tiebreakImpasse(d, ctx);
        return true;
      case 'NO_ELIMINATION':
        pub.cycle += 1;
        startCycle(d, ctx);
        return true;
      case 'ELIMINATION_REVEAL':
        if (pub.eliminatedRole === 'INFILTRADO') {
          pub.phase = 'INFILTRADO_LAST_CHANCE_GUESS';
          pub.endsAt = ctx.now + GUESS_MS;
        } else toVictoryCheck(d, ctx);
        return true;
      case 'INFILTRADO_LAST_CHANCE_GUESS':
        pub.guessCorrect = false;
        toVictoryCheck(d, ctx);
        return true;
      case 'VICTORY_CHECK':
        evaluateVictory(d, ctx);
        return true;
      case 'MATCH_RESULT':
        if (pub.round >= pub.totalRounds) {
          pub.phase = 'FINISHED';
          pub.endsAt = null;
        } else {
          pub.round += 1;
          pub.participants = ctx.players.map((p) => p.id).slice(0, 12);
          startMatch(d, ctx);
        }
        return true;
      default:
        void sec;
        return false;
    }
  },
  views(d, players) {
    const { pub, sec } = d;
    const out: Record<string, InfView> = {};
    players.forEach((p) => {
      const inGame = pub.participants.includes(p.id);
      // cada jogador recebe APENAS a própria palavra (nunca o papel)
      out[p.id] = {
        word: inGame ? wordOf(sec, p.id) : null,
        category: pub.category,
        alive: Boolean(pub.alive?.[p.id]),
        myVote: sec.votes[p.id] ?? null,
        notice: sec.notices[p.id] ?? null,
      };
    });
    return out;
  },
};

/** Anfitrião: busca pares evolutivos reais na PokéAPI (ex.: Pikachu → Raichu). Falha → catálogo local. */
export async function prepareInfiltrado(config: GameConfig): Promise<InfiltradoPair[]> {
  const cat = String(config.category ?? 'all');
  if (cat !== 'all' && cat !== 'Pokémon & Jogos') return [];
  if (Math.random() < 0.6) return []; // nem toda partida usa a API — mantém a variedade de temas
  const pairs = await fetchEvolutionPairs(3);
  return pairs.slice(0, 3).map(([a, b], i) => ({ id: `inf:poke-${a}-${b}-${i}`, category: 'Pokémon & Jogos', a, b }));
}
