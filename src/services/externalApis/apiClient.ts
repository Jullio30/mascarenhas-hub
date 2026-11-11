/**
 * Mascarenhas Hub — cliente HTTP para APIs públicas (sem chave, CORS liberado).
 * - Cache em 2 camadas: memória + localStorage (`mascarenhas_hub_api_cache_v1:{endpoint}`), TTL 24h.
 *   Guarda apenas o dado JÁ TRANSFORMADO (compacto), nunca o JSON bruto (a PokéAPI devolve ~300 KB por Pokémon).
 * - Timeout estrito de 3.500 ms com AbortController.
 * - Nunca lança: em falha retorna null e o chamador usa o catálogo local de contingência.
 * - Só o anfitrião chama estas funções (via plugin.prepare): 1 busca por partida, não 1 por jogador.
 */

const PREFIX = 'mascarenhas_hub_api_cache_v1:';
const TTL_MS = 24 * 60 * 60 * 1000;
export const API_TIMEOUT_MS = 3500;

const memory = new Map<string, { at: number; data: unknown }>();
const hosts = new Map<string, number>(); // throttle por host (ex.: Jikan 3 req/s)

function readCache<T>(key: string): T | null {
  const now = Date.now();
  const m = memory.get(key);
  if (m && now - m.at < TTL_MS) return m.data as T;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    if (now - parsed.at >= TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    memory.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown) {
  const entry = { at: Date.now(), data };
  memory.set(key, entry);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // cota cheia: limpa o cache antigo da plataforma e segue só com a memória
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* sem storage */
    }
  }
}

async function throttle(url: string, minGapMs: number) {
  if (!minGapMs) return;
  const host = new URL(url).host;
  const next = Math.max(Date.now(), hosts.get(host) ?? 0);
  hosts.set(host, next + minGapMs);
  const wait = next - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export interface FetchOpts {
  /** intervalo mínimo entre requisições ao mesmo host (Jikan: 350 ms ⇒ < 3 req/s) */
  minGapMs?: number;
}

/**
 * Busca JSON com timeout, transforma e guarda no cache.
 * `transform` deve validar e devolver null se o dado vier incompleto.
 */
export async function cachedFetch<T>(cacheKey: string, url: string, transform: (json: unknown) => T | null, opts: FetchOpts = {}): Promise<T | null> {
  const hit = readCache<T>(cacheKey);
  if (hit !== null) return hit;
  if (typeof fetch !== 'function') return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    await throttle(url, opts.minGapMs ?? 0);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null; // 429, 500, 503…
    const data = transform(await res.json());
    if (data === null || data === undefined) return null;
    writeCache(cacheKey, data);
    return data;
  } catch {
    return null; // offline, timeout, CORS, JSON inválido
  } finally {
    clearTimeout(timer);
  }
}

/** Executa várias buscas em paralelo e devolve só as que deram certo. */
export async function settleAll<T>(jobs: Promise<T | null>[]): Promise<T[]> {
  const out: (T | null)[] = await Promise.all(jobs.map((j) => j.catch(() => null)));
  return out.filter((x): x is T => x !== null && x !== undefined);
}

export const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Valores numéricos estritamente distintos e finitos (requisito do Ordem Caótica). */
export function distinctFinite(values: number[]): boolean {
  return values.every(isFiniteNum) && new Set(values).size === values.length;
}

export function randomInts(count: number, min: number, max: number, rng: () => number = Math.random): number[] {
  const set = new Set<number>();
  while (set.size < count && set.size < max - min + 1) set.add(min + Math.floor(rng() * (max - min + 1)));
  return [...set];
}

export const fmtNum = (n: number, digits = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
