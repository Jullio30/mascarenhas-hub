/**
 * Países: API de Países do IBGE (nomes, capitais, área e moeda em PT-BR)
 * + World Bank API v2 (população total mais recente, SP.POP.TOTL, mrnev=1).
 * Ambas sem chave e com CORS liberado.
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
    cachedFetch(
      `worldbank/SP.POP.TOTL/${iso3}`,
      `https://api.worldbank.org/v2/country/${iso3}/indicator/SP.POP.TOTL?format=json&per_page=100&mrnev=1`,
      (json) => {
        const rows = Array.isArray(json) ? (json[1] as { countryiso3code: string; date: string; value: number | null }[]) : null;
        if (!Array.isArray(rows)) return null;
        const map: Record<string, { value: number; year: string }> = {};
        rows.forEach((r) => isFiniteNum(r.value) && r.value > 0 && (map[r.countryiso3code] = { value: r.value, year: r.date }));
        return Object.keys(map).length >= 5 ? map : null;
      },
    ),
  ]);
  if (!ibge) return [];
  return ibge.map((c) => ({
    ...(c as Omit<CountryInfo, 'population' | 'populationYear'>),
    population: pop?.[c.iso3]?.value ?? null,
    populationYear: pop?.[c.iso3]?.year ?? null,
  }));
}
