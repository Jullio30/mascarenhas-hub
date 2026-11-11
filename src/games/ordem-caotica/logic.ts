import type { BasePublicState, EngineCtx, GameConfig, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, pickUnused, shuffle } from '../../core/engine/helpers';
import { fetchCountries, fetchOnThisDay, fetchRandomPokemon, fetchTopAnime } from '../../services/externalApis';
import { FALLBACK_POKEMON } from '../../data/fallbackCatalogs/pokemon';
import { FALLBACK_COUNTRIES } from '../../data/fallbackCatalogs/countries';
import {
  LOCAL_CHALLENGES,
  THEME_CATEGORIES,
  animeChallenge,
  countryChallenge,
  historyChallenge,
  pokemonChallenge,
  type ChaoticChallenge,
  type ChaoticElementFull,
  type ChaoticElementPublic,
} from './chaoticCatalog';

export type OcPhase = 'CHALLENGE_ACTIVE' | 'REVEAL_AND_PRECISION' | 'FINISHED';

export interface OcPublicChallenge {
  id: string;
  title: string;
  category: ChaoticChallenge['category'];
  unit: string;
  sortDirection: 'ASC' | 'DESC';
  topSlotLabel: string;
  bottomSlotLabel: string;
  elements: ChaoticElementPublic[]; // embaralhados, SEM valores
}

export interface OcResult {
  order: string[];
  points: Record<string, number>;
  total: number;
  auto: boolean;
}

export interface OcState extends BasePublicState {
  phase: OcPhase;
  participants: string[];
  challenge: OcPublicChallenge;
  lockedIds: string[];
  /** Revelados apenas em REVEAL_AND_PRECISION. */
  correctOrderIds: string[] | null;
  values: Record<string, string> | null;
  source: string | null;
  explanation: string | null;
  results: Record<string, OcResult> | null;
}

export interface OcSecret {
  current: ChaoticChallenge;
  queue: ChaoticChallenge[];
  drafts: Record<string, string[]>;
  locked: Record<string, string[]>;
}

export interface OcView {
  myOrder: string[] | null;
  locked: boolean;
}

type Draft = GameDraft<OcState, OcSecret>;

export const REVEAL_MS = 15_000;

/** Pontuação exata (imutável): d=0 → 100, d=1 → 50, d≥2 → 0. */
export function scoreOrder(playerOrder: string[], correct: string[]): { points: Record<string, number>; total: number } {
  const points: Record<string, number> = {};
  correct.forEach((id, correctPos) => {
    const pos = playerOrder.indexOf(id);
    const d = pos < 0 ? Infinity : Math.abs(pos - correctPos);
    points[id] = d === 0 ? 100 : d === 1 ? 50 : 0;
  });
  return { points, total: Object.values(points).reduce((a, b) => a + b, 0) };
}

const toPublic = (e: ChaoticElementFull): ChaoticElementPublic => ({ id: e.id, label: e.label, ...(e.subtitle ? { subtitle: e.subtitle } : {}), ...(e.imageUrl ? { imageUrl: e.imageUrl } : {}) });

function isPermutation(ids: unknown, of: string[]): ids is string[] {
  return Array.isArray(ids) && ids.length === of.length && new Set(ids).size === of.length && ids.every((x) => typeof x === 'string' && of.includes(x));
}

function nextChallenge(d: Draft, ctx: EngineCtx): ChaoticChallenge {
  // modo misto: alterna desafios das APIs (rodadas ímpares) com o catálogo auditado (pares)
  const useQueue = cfgStr(ctx, 'theme', 'misto') !== 'misto' || d.pub.round % 2 === 1;
  while (useQueue && d.sec.queue.length) {
    const c = d.sec.queue.shift()!;
    if (!ctx.isUsed(c.id)) {
      ctx.markUsed(c.id);
      return c;
    }
  }
  const cats = THEME_CATEGORIES[cfgStr(ctx, 'theme', 'misto')] ?? THEME_CATEGORIES.misto;
  const pool = LOCAL_CHALLENGES.filter((c) => cats.includes(c.category));
  return pickUnused(pool.length ? pool : LOCAL_CHALLENGES, (c) => c.id, ctx);
}

function startRound(d: Draft, ctx: EngineCtx) {
  const c = nextChallenge(d, ctx);
  // embaralha garantindo que a ordem inicial não seja a resposta
  let shuffled = shuffle(c.elements, ctx.rng);
  for (let i = 0; i < 5 && shuffled.map((e) => e.id).join() === c.correctOrderIds.join(); i++) shuffled = shuffle(c.elements, ctx.rng);
  d.sec.current = c;
  d.sec.drafts = {};
  d.sec.locked = {};
  Object.assign(d.pub, {
    phase: 'CHALLENGE_ACTIVE',
    challenge: {
      id: c.id,
      title: c.title,
      category: c.category,
      unit: c.unit,
      sortDirection: c.sortDirection,
      topSlotLabel: c.topSlotLabel,
      bottomSlotLabel: c.bottomSlotLabel,
      elements: shuffled.map(toPublic),
    },
    lockedIds: [],
    correctOrderIds: null,
    values: null,
    source: null,
    explanation: null,
    results: null,
    endsAt: ctx.now + cfgNum(ctx, 'timeSeconds', 40) * 1000,
  } satisfies Partial<OcState>);
}

function reveal(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const c = sec.current;
  const initial = pub.challenge.elements.map((e) => e.id);
  const results: Record<string, OcResult> = {};
  pub.participants.forEach((pid) => {
    // auto_submit_current_order: sem confirmação, vale a última ordem que estava na tela do jogador
    const locked = sec.locked[pid];
    const order = locked ?? sec.drafts[pid] ?? initial;
    const { points, total } = scoreOrder(order, c.correctOrderIds);
    results[pid] = { order, points, total, auto: !locked };
    ctx.award(pid, total);
    if (total === c.correctOrderIds.length * 100) ctx.stat(pid, 'perfect');
    else if (total === 0) ctx.stat(pid, 'miss');
  });
  pub.results = results;
  pub.correctOrderIds = [...c.correctOrderIds];
  pub.values = Object.fromEntries(c.elements.map((e) => [e.id, e.formattedValue]));
  pub.source = c.source;
  pub.explanation = c.explanation;
  pub.phase = 'REVEAL_AND_PRECISION';
  pub.endsAt = ctx.now + REVEAL_MS;
}

export function createOc(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const external = Array.isArray(ctx.external) ? (ctx.external as ChaoticChallenge[]) : [];
  const pub = {
    phase: 'CHALLENGE_ACTIVE',
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 5),
    endsAt: null,
    participants: players.map((p) => p.id),
    lockedIds: [],
    correctOrderIds: null,
    values: null,
    source: null,
    explanation: null,
    results: null,
  } as unknown as OcState;
  const d: Draft = { pub, sec: { current: LOCAL_CHALLENGES[0], queue: external, drafts: {}, locked: {} } };
  startRound(d, ctx);
  return d;
}

export const ocEngine: GameEngine<OcState, OcSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (a.type !== 'ORDER' || pub.phase !== 'CHALLENGE_ACTIVE' || !pub.participants.includes(from)) return false;
    if (sec.locked[from]) return false; // lista travada: cliques repetidos são ignorados
    const ids = pub.challenge.elements.map((e) => e.id);
    if (!isPermutation(a.ids, ids)) return false;
    if (a.lock === true) {
      sec.locked[from] = [...a.ids];
      pub.lockedIds = [...pub.lockedIds, from];
      const pending = pub.participants.filter((id) => !sec.locked[id] && ctx.isOnline(id));
      if (pending.length === 0) reveal(d, ctx);
      return true;
    }
    sec.drafts[from] = [...a.ids];
    return true;
  },
  tick(d, ctx) {
    const { pub } = d;
    if (!pub.endsAt || ctx.now < pub.endsAt) return false;
    if (pub.phase === 'CHALLENGE_ACTIVE') {
      reveal(d, ctx);
      return true;
    }
    if (pub.phase === 'REVEAL_AND_PRECISION') {
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
  views(d, players) {
    const out: Record<string, OcView> = {};
    players.forEach((p) => {
      const locked = d.sec.locked[p.id];
      out[p.id] = { myOrder: locked ?? null, locked: Boolean(locked) };
    });
    return out;
  },
};

/**
 * Executado UMA vez no anfitrião: busca as APIs em paralelo (timeout 3,5 s cada) e
 * monta desafios dinâmicos. Qualquer falha cai no snapshot local (FALLBACK_*).
 */
export async function prepareOc(config: GameConfig): Promise<ChaoticChallenge[]> {
  const theme = String(config.theme ?? 'misto');
  const cats = THEME_CATEGORIES[theme] ?? THEME_CATEGORIES.misto;
  const rounds = Number(config.rounds) || 5;
  const rng = Math.random;
  const tag = Date.now().toString(36);
  const wants = (c: string) => cats.includes(c as ChaoticChallenge['category']);
  // no modo misto, ~metade das rodadas vem das APIs e o resto do catálogo auditado
  const dynamicCount = theme === 'misto' ? Math.ceil(rounds / 2) : rounds;

  const [pokemon, countries, anime, history] = await Promise.all([
    wants('pokemon') ? fetchRandomPokemon(18, rng) : Promise.resolve([]),
    wants('paises') ? fetchCountries() : Promise.resolve([]),
    wants('animes') ? fetchTopAnime(1 + Math.floor(rng() * 2)) : Promise.resolve([]),
    wants('historia') ? fetchOnThisDay() : Promise.resolve([]),
  ]);
  const pokePool = pokemon.length >= 8 ? pokemon : FALLBACK_POKEMON;
  const countryPool = countries.length >= 8 ? countries : FALLBACK_COUNTRIES;

  const makers: (() => ChaoticChallenge | null)[] = [];
  if (wants('pokemon')) makers.push((): ChaoticChallenge | null => pokemonChallenge(pokePool, rng, `${tag}${makers.length}`));
  if (wants('paises')) makers.push(() => countryChallenge(countryPool, rng, `${tag}${makers.length}`));
  if (anime.length >= 5) makers.push(() => animeChallenge(anime, rng, `${tag}${makers.length}`));
  if (history.length >= 5) makers.push(() => historyChallenge(history, rng, `${tag}${makers.length}`));
  if (!makers.length) return [];

  const out: ChaoticChallenge[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < dynamicCount && i < dynamicCount * 4; i++) {
    const c = makers[i % makers.length]();
    if (!c || seen.has(c.title + c.elements.map((e) => e.label).join())) continue;
    seen.add(c.title + c.elements.map((e) => e.label).join());
    out.push({ ...c, id: `${c.id}-${i}` });
  }
  return shuffle(out, rng);
}
