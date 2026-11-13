import type { CustomItem, EngineCtx, GameConfigOption, PlayerStats } from '../../types/game.types';
import { mergePools, packModeOf, type PackMode } from '../contentPacks/contentPackManager';

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Sorteia um item ainda não usado na sala (reinicia o ciclo se o catálogo esgotar). */
export function pickUnused<T>(items: T[], idOf: (item: T) => string, ctx: EngineCtx): T {
  const fresh = items.filter((it) => !ctx.isUsed(idOf(it)));
  const chosen = pick(fresh.length ? fresh : items, ctx.rng);
  ctx.markUsed(idOf(chosen));
  return chosen;
}

export function emptyStats(): PlayerStats {
  return { perfect: 0, respTotal: 0, respCount: 0, streak: 0, bestStreak: 0, bluffs: 0 };
}

export function cfgNum(ctx: EngineCtx, key: string, fallback: number): number {
  const v = Number(ctx.config[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function cfgStr(ctx: EngineCtx, key: string, fallback: string): string {
  const v = ctx.config[key];
  return typeof v === 'string' && v ? v : fallback;
}

export function cfgBool(ctx: EngineCtx, key: string, fallback: boolean): boolean {
  const v = ctx.config[key];
  return typeof v === 'boolean' ? v : fallback;
}

/** Desloca timestamps absolutos (chaves terminadas em At/Until) após uma pausa. */
export function shiftTimestamps(value: unknown, deltaMs: number): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v) => shiftTimestamps(v, deltaMs));
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (typeof v === 'number' && /(At|Until)$/.test(key) && v > 1e12) obj[key] = v + deltaMs;
    else if (v && typeof v === 'object') shiftTimestamps(v, deltaMs);
  }
}

export function countMajority<T extends string>(votes: T[]): { top: T[]; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  votes.forEach((v) => (counts[v] = (counts[v] ?? 0) + 1));
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((k) => counts[k] === max) as T[];
  return { top, counts };
}

/** Modo de pacotes + itens personalizados entregues pelo anfitrião (só disponível em createInitialState). */
export function customContent(ctx: EngineCtx): { mode: PackMode; items: CustomItem[] } {
  const mode = packModeOf(ctx.config);
  const items = mode === 'official' ? [] : (ctx.customItems ?? []);
  if (mode === 'custom' && items.length === 0) ctx.log('Nenhum item nos pacotes personalizados — usando o catálogo oficial');
  return { mode, items };
}

export { mergePools };

/** Fila embaralhada sem reposição ("shuffle bag"): retira o próximo item e reabastece quando esvazia. */
export function drawFromBag<T>(bag: T[], all: T[], rng: () => number, avoid?: T): { item: T; bag: T[] } {
  let next = bag.length ? [...bag] : shuffle(all, rng);
  if (!bag.length && avoid !== undefined && next.length > 1 && next[0] === avoid) next = [...next.slice(1), next[0]];
  const [item, ...rest] = next;
  return { item, bag: rest };
}

/** Config de pacotes personalizados reutilizada pelos jogos compatíveis com o Editor Universal (renderizada no painel de pacotes do lobby). */
export const PACK_MODE_OPTION: GameConfigOption = {
  key: 'packMode',
  label: 'Conteúdo da partida',
  type: 'select',
  defaultValue: 'official',
  options: [
    { label: 'Apenas pacotes oficiais', value: 'official' },
    { label: 'Oficiais + meus pacotes', value: 'mixed' },
    { label: 'Apenas meus pacotes', value: 'custom' },
  ],
};
