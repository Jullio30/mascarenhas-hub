/**
 * Países: API de Países do IBGE (nomes, capitais, área e moeda em PT-BR)
 * + World Bank API v2 (população total mais recente, SP.POP.TOTL, mrnev=1).
 * Ambas sem chave. O World Bank às vezes responde sem CORS: há fallback em cadeia (ver fetchPopulation).
 */
import { cachedFetch, isFiniteNum } from './apiClient';

export interface CountryInfo {
  iso2: string;
  iso3: string;
  name: string;
  capital: string;
  region: string;
  currency: string;
  areaKm2: number;
  population: number | null;
  populationYear: string | null;
}

export const COUNTRY_CODES: [string, string][] = [
  ['BR', 'BRA'], ['AR', 'ARG'], ['US', 'USA'], ['JP', 'JPN'], ['FR', 'FRA'], ['DE', 'DEU'], ['IT', 'ITA'], ['CA', 'CAN'],
  ['AU', 'AUS'], ['CN', 'CHN'], ['IN', 'IND'], ['MX', 'MEX'], ['ZA', 'ZAF'], ['EG', 'EGY'], ['NG', 'NGA'], ['ES', 'ESP'],
  ['PT', 'PRT'], ['GB', 'GBR'], ['KR', 'KOR'], ['RU', 'RUS'], ['CL', 'CHL'], ['CO', 'COL'], ['PE', 'PER'], ['TR', 'TUR'],
];

interface RawIbge {
  id: { 'ISO-3166-1-ALPHA-2': string; 'ISO-3166-1-ALPHA-3': string };
  nome: { abreviado: string };
  area: { total: string };
  localizacao: { regiao: { nome: string } };
  governo: { capital: { nome: string } };
  'unidades-monetarias': { nome: string }[];
}

/** "8509360,850" (formato IBGE) → 8509360.85 */
function parseIbgeNumber(v: string): number {
  return Number(String(v).replace(/\./g, '').replace(',', '.'));
}

type PopMap = Record<string, { value: number; year: string }>;

/**
 * População aproximada (World Bank, SP.POP.TOTL, 2023) — usada só se a API do World Bank
 * falhar no navegador (ela às vezes responde sem cabeçalho CORS).
 */
const POPULATION_FALLBACK: Record<string, number> = {
  BRA: 216_400_000, ARG: 46_650_000, USA: 334_900_000, JPN: 124_500_000, FRA: 68_170_000, DEU: 84_480_000,
  ITA: 58_760_000, CAN: 40_100_000, AUS: 26_640_000, CHN: 1_410_700_000, IND: 1_428_600_000, MEX: 128_460_000,
  ZAF: 60_410_000, EGY: 112_720_000, NGA: 223_800_000, ESP: 48_370_000, PRT: 10_530_000, GBR: 68_350_000,
  KOR: 51_710_000, RUS: 143_830_000, CHL: 19_630_000, COL: 52_090_000, PER: 34_350_000, TUR: 85_330_000,
};

function parseWorldBank(json: unknown): PopMap | null {
  const rows = Array.isArray(json) ? (json[1] as { countryiso3code: string; date: string; value: number | null }[]) : null;
  if (!Array.isArray(rows)) return null;
  const map: PopMap = {};
  rows.forEach((r) => isFiniteNum(r.value) && r.value > 0 && (map[r.countryiso3code] = { value: r.value, year: r.date }));
  return Object.keys(map).length >= 5 ? map : null;
}

/** World Bank (lista dos países) → World Bank (todos os países) → tabela embutida. Nunca falha. */
async function fetchPopulation(iso3: string): Promise<PopMap> {
  const direct = await cachedFetch(`worldbank/SP.POP.TOTL/${iso3}`, `https://api.worldbank.org/v2/country/${iso3}/indicator/SP.POP.TOTL?format=json&per_page=100&mrnev=1`, parseWorldBank);
  if (direct) return direct;
  const all = await cachedFetch('worldbank/SP.POP.TOTL/all', 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&mrnev=1', parseWorldBank);
  if (all) return all;
  const map: PopMap = {};
  Object.entries(POPULATION_FALLBACK).forEach(([k, v]) => (map[k] = { value: v, year: '2023' }));
  return map;
}

export async function fetchCountries(): Promise<CountryInfo[]> {
  const iso2 = COUNTRY_CODES.map((c) => c[0]).join('|');
  const iso3 = COUNTRY_CODES.map((c) => c[1]).join(';');
  const [ibge, pop] = await Promise.all([
    cachedFetch(`ibge/paises/${iso2}`, `https://servicodados.ibge.gov.br/api/v1/paises/${iso2}`, (json) => {
      if (!Array.isArray(json)) return null;
      const list = (json as RawIbge[])
        .map((c) => ({
          iso2: c.id?.['ISO-3166-1-ALPHA-2'],
          iso3: c.id?.['ISO-3166-1-ALPHA-3'],
          name: c.nome?.abreviado,
          capital: c.governo?.capital?.nome,
          region: c.localizacao?.regiao?.nome,
          currency: c['unidades-monetarias']?.[0]?.nome ?? '',
          areaKm2: parseIbgeNumber(c.area?.total),
        }))
        .filter((c) => c.iso2 && c.name && c.capital && isFiniteNum(c.areaKm2) && c.areaKm2 > 0);
      return list.length >= 5 ? list : null;
    }),
    fetchPopulation(iso3),
  ]);
  if (!ibge) return [];
  return ibge.map((c) => ({
    ...(c as Omit<CountryInfo, 'population' | 'populationYear'>),
    population: pop[c.iso3]?.value ?? null,
    populationYear: pop[c.iso3]?.year ?? null,
  }));
}
