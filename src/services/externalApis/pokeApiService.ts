/** PokéAPI v2 — https://pokeapi.co (sem chave, CORS *). */
import { cachedFetch, isFiniteNum, randomInts, settleAll } from './apiClient';

const BASE = 'https://pokeapi.co/api/v2';
export const MAX_POKEMON_ID = 1025;

export interface PokemonInfo {
  id: number;
  name: string; // nome de exibição (Capitalizado)
  heightM: number; // height (dm) / 10
  weightKg: number; // weight (hg) / 10
  types: string[]; // em inglês (ver TYPE_PT)
  stats: { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number };
  sprite: string | null;
}

export const TYPE_PT: Record<string, string> = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', grass: 'Planta', electric: 'Elétrico', ice: 'Gelo', fighting: 'Lutador',
  poison: 'Venenoso', ground: 'Terrestre', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma',
  dragon: 'Dragão', dark: 'Sombrio', steel: 'Aço', fairy: 'Fada',
};

export function prettyName(raw: string): string {
  return raw
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

interface RawPokemon {
  id: number;
  name: string;
  species?: { name: string };
  height: number;
  weight: number;
  types: { slot: number; type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  sprites: { front_default: string | null; other?: { 'official-artwork'?: { front_default: string | null } } };
}

function toInfo(json: unknown): PokemonInfo | null {
  const d = json as RawPokemon;
  if (!d || !isFiniteNum(d.id) || !isFiniteNum(d.height) || !isFiniteNum(d.weight) || !Array.isArray(d.stats)) return null;
  const st = (n: string) => d.stats.find((s) => s.stat?.name === n)?.base_stat;
  const stats = { hp: st('hp'), attack: st('attack'), defense: st('defense'), spAttack: st('special-attack'), spDefense: st('special-defense'), speed: st('speed') };
  if (!Object.values(stats).every(isFiniteNum)) return null;
  return {
    id: d.id,
    name: d.species?.name === 'ho-oh' ? 'Ho-Oh' : prettyName(d.species?.name ?? d.name),
    heightM: d.height / 10,
    weightKg: d.weight / 10,
    types: [...d.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    stats: stats as PokemonInfo['stats'],
    sprite: d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default || null,
  };
}

export function fetchPokemon(idOrName: number | string): Promise<PokemonInfo | null> {
  return cachedFetch(`pokeapi/pokemon/${idOrName}`, `${BASE}/pokemon/${idOrName}`, toInfo);
}

export async function fetchRandomPokemon(count: number, rng: () => number = Math.random): Promise<PokemonInfo[]> {
  return settleAll(randomInts(count, 1, MAX_POKEMON_ID, rng).map((id) => fetchPokemon(id)));
}

/** Pares evolutivos reais (ex.: Pikachu → Raichu) a partir de cadeias de evolução. */
export async function fetchEvolutionPairs(chainCount: number, rng: () => number = Math.random): Promise<[string, string][]> {
  const chains = await settleAll(
    randomInts(chainCount, 1, 530, rng).map((id) =>
      cachedFetch(`pokeapi/evolution-chain/${id}`, `${BASE}/evolution-chain/${id}`, (json) => {
        type Node = { species: { name: string }; evolves_to: Node[] };
        const root = (json as { chain?: Node })?.chain;
        if (!root?.species?.name) return null;
        const pairs: [string, string][] = [];
        const walk = (n: Node) =>
          n.evolves_to.forEach((c) => {
            pairs.push([prettyName(n.species.name), prettyName(c.species.name)]);
            walk(c);
          });
        walk(root);
        return pairs.length ? pairs : null;
      }),
    ),
  );
  return chains.flat();
}
