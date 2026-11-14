import type { BasePublicState, EngineCtx, GameConfig, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, pickUnused, shuffle } from '../../core/engine/helpers';
import { fetchCountries, fetchRandomPokemon } from '../../services/externalApis';
import { FALLBACK_COUNTRIES } from '../../data/fallbackCatalogs/countries';
import { FALLBACK_POKEMON } from '../../data/fallbackCatalogs/pokemon';
import { TRIVIA_CATALOG, countryCapitalQuestion, countryCurrencyQuestion, pokemonTypeQuestion, type TriviaQuestion } from './triviaCatalog';

// ---------- tabuleiros determinísticos (18, 24 ou 30 casas) ----------
export type TileType = 'START' | 'NORMAL' | 'ADVANCE_2' | 'RETREAT_2' | 'EXTRA_TURN' | 'SKIP_TURN' | 'STEAL_POINTS' | 'SHIELD' | 'FINISH';

const SPECIAL_30: Partial<Record<number, TileType>> = {
  1: 'START',
  4: 'ADVANCE_2', 14: 'ADVANCE_2', 23: 'ADVANCE_2',
  7: 'RETREAT_2', 17: 'RETREAT_2', 26: 'RETREAT_2',
  9: 'EXTRA_TURN', 20: 'EXTRA_TURN',
  12: 'SKIP_TURN', 24: 'SKIP_TURN',
  15: 'STEAL_POINTS', 27: 'STEAL_POINTS',
  6: 'SHIELD', 19: 'SHIELD',
  30: 'FINISH',
};
const SPECIAL_24: Partial<Record<number, TileType>> = {
  1: 'START',
  4: 'ADVANCE_2', 14: 'ADVANCE_2', 20: 'ADVANCE_2',
  7: 'RETREAT_2', 17: 'RETREAT_2', 22: 'RETREAT_2',
  9: 'EXTRA_TURN', 18: 'EXTRA_TURN',
  12: 'SKIP_TURN',
  15: 'STEAL_POINTS', 21: 'STEAL_POINTS',
  6: 'SHIELD', 19: 'SHIELD',
  24: 'FINISH',
};
const SPECIAL_18: Partial<Record<number, TileType>> = {
  1: 'START',
  4: 'ADVANCE_2', 14: 'ADVANCE_2',
  7: 'RETREAT_2', 16: 'RETREAT_2',
  9: 'EXTRA_TURN',
  12: 'SKIP_TURN',
  10: 'STEAL_POINTS',
  6: 'SHIELD',
  18: 'FINISH',
};
const LAYOUTS: Record<number, Partial<Record<number, TileType>>> = { 18: SPECIAL_18, 24: SPECIAL_24, 30: SPECIAL_30 };
export const BOARD_SIZES = [18, 24, 30] as const;
export const DEFAULT_BOARD_SIZE = 30;
/** Tamanho válido (múltiplo de 6 para a serpentina); estados antigos sem o campo usam 30. */
export const boardSizeOf = (n: unknown): number => (LAYOUTS[Number(n)] ? Number(n) : DEFAULT_BOARD_SIZE);
export const tileAt = (pos: number, size: number = DEFAULT_BOARD_SIZE): TileType => LAYOUTS[boardSizeOf(size)][pos] ?? 'NORMAL';

export const STEAL_AMOUNT = 200;
export const FINISH_BONUS = 500;
export const CORRECT_POINTS = 100;
export const PER_TILE_POINTS = 20;

export type SopPhase = 'TURN_START' | 'ROLLING_DICE' | 'ANSWERING_QUESTION' | 'STEAL_CHOICE' | 'MOVING_AND_SPECIAL_EFFECT' | 'GAME_OVER' | 'FINISHED';

export interface SopToken {
  pos: number;
  hasShield: boolean;
  skipNextTurn: boolean;
}

export interface SopEffect {
  kind: 'WRONG' | 'MOVE' | 'WIN';
  from: number;
  to: number;
  landed: number;
  tile: TileType | null;
  text: string;
  points: number;
}

export interface SopState extends BasePublicState {
  phase: SopPhase;
  participants: string[];
  turnOrder: string[];
  turnIndex: number;
  currentId: string;
  isExtraTurn: boolean;
  turnCount: number;
  /** Casas do tabuleiro (18, 24 ou 30). Opcional para estados salvos antes da opção existir. */
  boardSize?: number;
  tokens: Record<string, SopToken>;
  dice: number | null;
  question: { id: string; category: string; text: string; options: string[] } | null;
  chosenIndex: number | null;
  /** Revelado só depois da resposta (ou do tempo). */
  correctIndex: number | null;
  banner: string | null;
  effect: SopEffect | null;
  stealTargets: string[] | null;
  winnerId: string | null;
}

export interface SopSecret {
  correctIndex: number;
  queue: TriviaQuestion[];
  pendingExtra: boolean;
  pendingSteal: { landed: number; from: number } | null;
}

type Draft = GameDraft<SopState, SopSecret>;

export const TURN_BANNER_MS = 3_000;
export const OFFLINE_WAIT_MS = 5_000;
export const ROLL_MS = 15_000;
export const ANSWER_MS = 20_000;
export const STEAL_MS = 10_000;
export const EFFECT_MS = 4_500;
export const GAME_OVER_MS = 7_000;
/** Trava de segurança contra partidas infinitas: no máximo "tamanho do tabuleiro" turnos por jogador. */
const maxTurnsPerPlayer = (pub: SopState) => boardSizeOf(pub.boardSize);

function label(pub: SopState) {
  pub.roundLabel = `Turno ${pub.turnCount}`;
}

function nick(ctx: EngineCtx, id: string) {
  return ctx.players.find((p) => p.id === id)?.nickname ?? 'Jogador';
}

function drawQuestion(d: Draft, ctx: EngineCtx) {
  let q: TriviaQuestion | undefined;
  while (d.sec.queue.length && !q) {
    const next = d.sec.queue.shift()!;
    if (!ctx.isUsed(next.id)) q = next;
  }
  if (q) ctx.markUsed(q.id);
  else {
    const cat = cfgStr(ctx, 'category', 'all');
    const pool = cat === 'all' ? TRIVIA_CATALOG : TRIVIA_CATALOG.filter((x) => x.category === cat);
    q = pickUnused(pool.length ? pool : TRIVIA_CATALOG, (x) => x.id, ctx);
  }
  const order = shuffle([0, 1, 2, 3], ctx.rng);
  d.sec.correctIndex = order.indexOf(0);
  d.pub.question = { id: q.id, category: q.category, text: q.text, options: order.map((i) => q!.options[i]) };
}

const present = (ctx: EngineCtx, id: string) => ctx.players.some((p) => p.id === id);

function beginTurn(d: Draft, ctx: EngineCtx) {
  const { pub } = d;
  // jogador removido pelo anfitrião sai da rotação (sem turno, sem vitória)
  for (let i = 0; i < pub.turnOrder.length && !present(ctx, pub.turnOrder[pub.turnIndex]); i++) {
    pub.turnIndex = (pub.turnIndex + 1) % pub.turnOrder.length;
    pub.isExtraTurn = false;
  }
  pub.currentId = pub.turnOrder[pub.turnIndex];
  pub.dice = null;
  pub.question = null;
  pub.chosenIndex = null;
  pub.correctIndex = null;
  pub.effect = null;
  pub.stealTargets = null;
  pub.turnCount += 1;
  label(pub);
  if (pub.turnCount > pub.turnOrder.length * maxTurnsPerPlayer(pub)) {
    const leader = pub.turnOrder.filter((id) => present(ctx, id)).sort((a, b) => pub.tokens[b].pos - pub.tokens[a].pos)[0] ?? pub.currentId;
    return declareWinner(d, ctx, leader, 'Limite de turnos atingido: vence quem está mais perto da Coroa!');
  }
  const tok = pub.tokens[pub.currentId];
  if (tok.skipNextTurn) {
    tok.skipNextTurn = false;
    pub.banner = `⏸️ ${nick(ctx, pub.currentId)} estava penalizado e perdeu este turno!`;
    pub.phase = 'TURN_START';
    pub.endsAt = ctx.now + TURN_BANNER_MS;
    return;
  }
  if (!ctx.isOnline(pub.currentId)) {
    pub.banner = `${nick(ctx, pub.currentId)} está desconectado… aguardando 5s`;
    pub.phase = 'TURN_START';
    pub.endsAt = ctx.now + OFFLINE_WAIT_MS;
    return;
  }
  pub.banner = null;
  pub.phase = 'ROLLING_DICE';
  pub.endsAt = ctx.now + ROLL_MS;
}

function nextPlayer(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  if (sec.pendingExtra) {
    sec.pendingExtra = false;
    pub.isExtraTurn = true; // máximo de 1 turno extra consecutivo
  } else {
    pub.isExtraTurn = false;
    pub.turnIndex = (pub.turnIndex + 1) % pub.turnOrder.length;
  }
  beginTurn(d, ctx);
}

function roll(d: Draft, ctx: EngineCtx) {
  d.pub.dice = 1 + Math.floor(ctx.rng() * 6);
  drawQuestion(d, ctx);
  d.pub.phase = 'ANSWERING_QUESTION';
  d.pub.endsAt = ctx.now + ANSWER_MS;
}

function declareWinner(d: Draft, ctx: EngineCtx, id: string, text: string) {
  const { pub } = d;
  ctx.award(id, FINISH_BONUS);
  ctx.stat(id, 'perfect');
  pub.winnerId = id;
  pub.forcedWinnerIds = [id];
  pub.banner = text;
  pub.phase = 'GAME_OVER';
  pub.endsAt = ctx.now + GAME_OVER_MS;
  ctx.log(`${nick(ctx, id)} chegou à Casa ${boardSizeOf(pub.boardSize)} e venceu!`);
}

function answer(d: Draft, ctx: EngineCtx, chosen: number | null) {
  const { pub, sec } = d;
  const me = pub.currentId;
  const tok = pub.tokens[me];
  const D = pub.dice ?? 1;
  pub.chosenIndex = chosen;
  pub.correctIndex = sec.correctIndex;
  const right = pub.question?.options[sec.correctIndex] ?? '';
  if (chosen !== sec.correctIndex) {
    // errou ou o tempo acabou: não se move e não reativa o efeito da casa atual
    ctx.stat(me, 'miss');
    pub.effect = { kind: 'WRONG', from: tok.pos, to: tok.pos, landed: tok.pos, tile: null, text: `Resposta incorreta! A resposta certa era "${right}". Você permanece na Casa ${tok.pos}.`, points: 0 };
    sec.pendingExtra = false;
    pub.phase = 'MOVING_AND_SPECIAL_EFFECT';
    pub.endsAt = ctx.now + EFFECT_MS;
    return;
  }
  const pts = CORRECT_POINTS + PER_TILE_POINTS * D;
  ctx.award(me, pts);
  ctx.stat(me, 'perfect');
  const from = tok.pos;
  const size = boardSizeOf(pub.boardSize);
  const landed = Math.min(size, from + D);
  tok.pos = landed;
  if (landed >= size) {
    pub.effect = { kind: 'WIN', from, to: landed, landed, tile: 'FINISH', text: `Acertou! +${pts} pts e chegou à Coroa!`, points: pts };
    return declareWinner(d, ctx, me, `🏆 ${nick(ctx, me)} alcançou a Casa ${boardSizeOf(pub.boardSize)}! +${FINISH_BONUS} de bônus de chegada.`);
  }
  applyTile(d, ctx, from, landed, pts);
}

/** Efeito da casa de destino. Movimento secundário (Avançar/Voltar) é final: não encadeia outro efeito. */
function applyTile(d: Draft, ctx: EngineCtx, from: number, landed: number, pts: number) {
  const { pub, sec } = d;
  const me = pub.currentId;
  const tok = pub.tokens[me];
  const size = boardSizeOf(pub.boardSize);
  const tile = tileAt(landed, size);
  let text = `Acertou! +${pts} pts. Avançou da Casa ${from} para a Casa ${landed}.`;
  switch (tile) {
    case 'ADVANCE_2':
      tok.pos = Math.min(size, landed + 2);
      if (tok.pos >= size) {
        pub.effect = { kind: 'WIN', from, to: tok.pos, landed, tile, text: `${text} Avançar 2 → chegou à Coroa!`, points: pts };
        return declareWinner(d, ctx, me, `🏆 ${nick(ctx, me)} alcançou a Casa ${boardSizeOf(pub.boardSize)}! +${FINISH_BONUS} de bônus de chegada.`);
      }
      text += ` ⏩ Avançar 2 casas → Casa ${tok.pos}!`;
      break;
    case 'RETREAT_2':
      if (tok.hasShield) {
        tok.hasShield = false;
        text += ' 🛡️ O Escudo bloqueou o "Voltar 2 casas"!';
      } else {
        tok.pos = Math.max(1, landed - 2);
        text += ` ⏪ Voltar 2 casas → Casa ${tok.pos}.`;
      }
      break;
    case 'EXTRA_TURN':
      if (!pub.isExtraTurn) {
        sec.pendingExtra = true;
        text += ' 🔄 Jogue novamente!';
      } else text += ' 🔄 Jogar novamente (limite de 1 turno extra seguido já atingido).';
      break;
    case 'SKIP_TURN':
      if (tok.hasShield) {
        tok.hasShield = false;
        text += ' 🛡️ O Escudo anulou a penalidade "Perder um turno"!';
      } else {
        tok.skipNextTurn = true;
        text += ' ⏸️ Você perderá o próximo turno.';
      }
      break;
    case 'SHIELD':
      if (tok.hasShield) text += ' 🛡️ Você já tem um Escudo (máximo 1).';
      else {
        tok.hasShield = true;
        text += ' 🛡️ Ganhou um Escudo de Proteção!';
      }
      break;
    case 'STEAL_POINTS':
      sec.pendingSteal = { landed, from };
      pub.effect = { kind: 'MOVE', from, to: landed, landed, tile, text: `${text} ⚡ Casa Roubar Pontos: escolha um adversário!`, points: pts };
      pub.stealTargets = pub.turnOrder.filter((id) => id !== me);
      pub.phase = 'STEAL_CHOICE';
      pub.endsAt = ctx.now + STEAL_MS;
      return;
    default:
      break;
  }
  pub.effect = { kind: 'MOVE', from, to: tok.pos, landed, tile: tile === 'NORMAL' ? null : tile, text, points: pts };
  pub.phase = 'MOVING_AND_SPECIAL_EFFECT';
  pub.endsAt = ctx.now + EFFECT_MS;
}

function resolveSteal(d: Draft, ctx: EngineCtx, targetId: string) {
  const { pub, sec } = d;
  const me = pub.currentId;
  const tok = pub.tokens[me];
  const target = pub.tokens[targetId];
  const pending = sec.pendingSteal ?? { landed: tok.pos, from: tok.pos };
  sec.pendingSteal = null;
  pub.stealTargets = null;
  let text = pub.effect?.text.replace(' ⚡ Casa Roubar Pontos: escolha um adversário!', '') ?? '';
  if (target.hasShield) {
    target.hasShield = false;
    text += ` ⚡ Tentou roubar ${nick(ctx, targetId)}, mas o Escudo de Proteção do alvo bloqueou!`;
  } else {
    const victim = ctx.players.find((p) => p.id === targetId);
    // transfere 200 pts (limitado ao que o alvo possui: o placar nunca fica negativo)
    const amount = Math.min(STEAL_AMOUNT, Math.max(0, victim?.matchScore ?? 0));
    ctx.award(targetId, -amount);
    ctx.award(me, amount);
    tok.pos = Math.min(boardSizeOf(pub.boardSize), tok.pos + 1);
    text += ` ⚡ Roubou ${amount} pts de ${nick(ctx, targetId)} e avançou +1 casa (Casa ${tok.pos})!`;
    if (tok.pos >= boardSizeOf(pub.boardSize)) {
      pub.effect = { kind: 'WIN', from: pending.from, to: tok.pos, landed: pending.landed, tile: 'STEAL_POINTS', text, points: pub.effect?.points ?? 0 };
      return declareWinner(d, ctx, me, `🏆 ${nick(ctx, me)} alcançou a Casa ${boardSizeOf(pub.boardSize)}! +${FINISH_BONUS} de bônus de chegada.`);
    }
  }
  pub.effect = { kind: 'MOVE', from: pending.from, to: tok.pos, landed: pending.landed, tile: 'STEAL_POINTS', text, points: pub.effect?.points ?? 0 };
  pub.phase = 'MOVING_AND_SPECIAL_EFFECT';
  pub.endsAt = ctx.now + EFFECT_MS;
}

/** Sem escolha em 10s: alvo com mais pontos (desempate: mais à frente). */
function autoStealTarget(d: Draft, ctx: EngineCtx): string {
  const ids = d.pub.stealTargets ?? [];
  const score = (id: string) => ctx.players.find((p) => p.id === id)?.matchScore ?? 0;
  return [...ids].sort((a, b) => score(b) - score(a) || d.pub.tokens[b].pos - d.pub.tokens[a].pos)[0];
}

export function createSop(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const external = Array.isArray(ctx.external) ? (ctx.external as TriviaQuestion[]) : [];
  const ids = players.map((p) => p.id);
  const turnOrder = shuffle(ids, ctx.rng);
  const pub: SopState = {
    phase: 'ROLLING_DICE',
    round: 1,
    totalRounds: 1,
    endsAt: null,
    participants: ids,
    turnOrder,
    turnIndex: 0,
    currentId: turnOrder[0],
    isExtraTurn: false,
    turnCount: 0,
    boardSize: boardSizeOf(cfgNum(ctx, 'boardSize', DEFAULT_BOARD_SIZE)),
    tokens: Object.fromEntries(ids.map((id) => [id, { pos: 1, hasShield: false, skipNextTurn: false }])),
    dice: null,
    question: null,
    chosenIndex: null,
    correctIndex: null,
    banner: null,
    effect: null,
    stealTargets: null,
    winnerId: null,
  };
  const d: Draft = { pub, sec: { correctIndex: 0, queue: external, pendingExtra: false, pendingSteal: null } };
  beginTurn(d, ctx);
  return d;
}

export const sopEngine: GameEngine<SopState, SopSecret> = {
  action(d, from, a, ctx) {
    const { pub } = d;
    // anti-spoofing: toda ação exige ser o jogador da vez
    if (from !== pub.currentId) return false;
    switch (a.type) {
      case 'ROLL_DICE':
        if (pub.phase !== 'ROLLING_DICE') return false;
        roll(d, ctx);
        return true;
      case 'ANSWER_TRIVIA': {
        const idx = Number(a.index);
        if (pub.phase !== 'ANSWERING_QUESTION' || !Number.isInteger(idx) || idx < 0 || idx > 3) return false;
        answer(d, ctx, idx);
        return true;
      }
      case 'STEAL': {
        const target = String(a.target ?? '');
        if (pub.phase !== 'STEAL_CHOICE' || !pub.stealTargets?.includes(target)) return false;
        resolveSteal(d, ctx, target);
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
      case 'TURN_START':
        if (!pub.banner?.startsWith('⏸️') && ctx.isOnline(pub.currentId)) {
          pub.banner = null;
          pub.phase = 'ROLLING_DICE';
          pub.endsAt = ctx.now + ROLL_MS;
          return true;
        }
        d.sec.pendingExtra = false;
        nextPlayer(d, ctx);
        return true;
      case 'ROLLING_DICE':
        roll(d, ctx); // auto-roll após 15s
        return true;
      case 'ANSWERING_QUESTION':
        answer(d, ctx, null);
        return true;
      case 'STEAL_CHOICE':
        resolveSteal(d, ctx, autoStealTarget(d, ctx));
        return true;
      case 'MOVING_AND_SPECIAL_EFFECT':
        nextPlayer(d, ctx);
        return true;
      case 'GAME_OVER':
        pub.phase = 'FINISHED';
        pub.endsAt = null;
        return true;
      default:
        return false;
    }
  },
  views() {
    return {}; // nada privado por jogador; o índice correto fica só no segredo do anfitrião
  },
};

/** Anfitrião: gera perguntas extras via PokéAPI (tipos) e IBGE (capitais/moedas), com fallback local. */
export async function prepareSop(config: GameConfig): Promise<TriviaQuestion[]> {
  const cat = String(config.category ?? 'all');
  if (cat !== 'all') return [];
  const rng = Math.random;
  const [pokes, countries] = await Promise.all([fetchRandomPokemon(4, rng), fetchCountries()]);
  const pokePool = pokes.length ? pokes : shuffle(FALLBACK_POKEMON, rng).slice(0, 3);
  const countryPool = countries.length >= 8 ? countries : FALLBACK_COUNTRIES;
  const out: TriviaQuestion[] = [];
  pokePool.slice(0, 3).forEach((p) => {
    const q = pokemonTypeQuestion(p, rng);
    if (q) out.push(q);
  });
  shuffle(countryPool, rng)
    .slice(0, 4)
    .forEach((c, i) => {
      const q = i % 2 ? countryCurrencyQuestion(c, countryPool, rng) : countryCapitalQuestion(c, countryPool, rng);
      if (q) out.push(q);
    });
  // intercala as perguntas das APIs com o banco local
  const local = shuffle(TRIVIA_CATALOG, rng).slice(0, 14);
  return shuffle([...out, ...local], rng);
}
