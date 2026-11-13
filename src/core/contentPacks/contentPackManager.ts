/**
 * Mascarenhas Hub — Editor Universal de Conteúdo: gerenciador de pacotes personalizados.
 *
 * - Entrada em bloco: 1 item por linha (trim, linhas vazias ignoradas, duplicatas removidas sem diferenciar maiúsculas/acentos).
 * - Formato polimórfico por jogo (linha simples ou colunas separadas por "|").
 * - Persistência: localStorage (`mascarenhas_hub_custom_packs_v1`) + sincronização opcional com a tabela
 *   `custom_packs` do Supabase do Mascarenhas Hub (supabase/migration_v3_custom_packs.sql). Se a tabela não
 *   existir, a sincronização é desativada silenciosamente e tudo continua funcionando localmente.
 * - Os pacotes moram no dispositivo do ANFITRIÃO: o motor da sala lê os itens selecionados ao iniciar a
 *   partida e cada jogo copia-os para o seu segredo (sobrevive a F5 e migração de host).
 */
import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomItem, GameConfig, GameSlug } from '../../types/game.types';
import { getSupabase } from '../../lib/supabase';
import { normalize } from '../../lib/textUtils';

export const CUSTOM_PACKS_KEY = 'mascarenhas_hub_custom_packs_v1';
export const MAX_ITEMS_PER_PACK = 500;
export const MAX_ITEM_LENGTH = 200;

export type PackMode = 'official' | 'mixed' | 'custom';

export interface CustomPack {
  id: string;
  name: string;
  game: GameSlug;
  theme: string;
  /** Linhas já sanitizadas (texto bruto, com "|" quando o formato pede colunas). */
  lines: string[];
  createdAt: number;
  updatedAt: number;
}

type FormatKind = 'line' | 'blefe' | 'chute' | 'impulsao' | 'duas-verdades';

export interface PackFormat {
  kind: FormatKind;
  /** Descrição curta do formato de cada linha. */
  hint: string;
  placeholder: string;
}

const FORMATS: Partial<Record<GameSlug, PackFormat>> = {
  'quem-e-mais-provavel': {
    kind: 'line',
    hint: 'Uma pergunta por linha.',
    placeholder: 'Quem é mais provável de esquecer o aniversário do melhor amigo?\nQuem voltaria com o ex no primeiro “oi sumida”?\nQuem seria expulso do churrasco primeiro?',
  },
  categorias: {
    kind: 'line',
    hint: 'Uma categoria por linha.',
    placeholder: 'Pokémon do tipo Fogo\nBandas de rock\nComidas de festa junina',
  },
  'desafio-5-segundos': {
    kind: 'line',
    hint: 'Um desafio por linha. Escreva o tema (ex.: “Pokémon do tipo Fogo”) — o jogo completa com “Cite N…”.',
    placeholder: 'Pokémon do tipo Fogo\nCoisas que você leva para a praia\nPersonagens da Disney',
  },
  'defesa-impossivel': {
    kind: 'line',
    hint: 'Uma tese absurda por linha.',
    placeholder: 'Dormir é uma perda de tempo\nTomar banho deveria ser esporte olímpico\nOs gatos deveriam governar o mundo',
  },
  'telefone-de-palavras': {
    kind: 'line',
    hint: 'Uma palavra inicial por linha.',
    placeholder: 'Quadrado\nPraia\nVampiro\nChurrasco',
  },
  'quem-escreveu': {
    kind: 'line',
    hint: 'Uma pergunta aberta por linha.',
    placeholder: 'Qual seria o nome da sua autobiografia?\nQual a pior desculpa que você já deu para faltar?\nO que você faria com 1 milhão em 24 horas?',
  },
  'duas-verdades-uma-mentira': {
    kind: 'duas-verdades',
    hint: 'Uma afirmação por linha. Linhas são VERDADES; termine com “| mentira” para marcar uma afirmação FALSA.',
    placeholder: 'O polvo tem três corações\nA Torre Eiffel cresce no verão\nO Brasil já teve um imperador | mentira',
  },
  blefe: {
    kind: 'blefe',
    hint: 'Pergunta | Resposta verdadeira (opcional: | mentira 1 | mentira 2 | mentira 3).',
    placeholder: 'Qual animal tem impressões digitais parecidas com as humanas? | Coala\nQuantos corações tem um polvo? | 3 | 2 | 5 | 8',
  },
  'chute-perfeito': {
    kind: 'chute',
    hint: 'Pergunta | Valor numérico | Unidade (opcional: | ano, para perguntas de ano calendário).',
    placeholder: 'Quantos ossos tem o corpo humano adulto? | 206 | ossos\nEm que ano o homem pisou na Lua? | 1969 | ano\nQuantos km tem a Linha do Equador? | 40075 | km',
  },
  'impulsao-contraria': {
    kind: 'impulsao',
    hint: 'Pergunta | Opção A | Opção B. (Só o enunciado “X ou Y?” também funciona.)',
    placeholder: 'Você prefere dinheiro ou amor? | Dinheiro | Amor\nPraia ou montanha? | Praia | Montanha\nCachorro ou gato?',
  },
};

export const CONTENT_GAMES = Object.keys(FORMATS) as GameSlug[];

export function supportsCustomContent(slug: GameSlug): boolean {
  return slug in FORMATS;
}

export function formatFor(slug: GameSlug): PackFormat {
  return FORMATS[slug] ?? FORMATS['quem-e-mais-provavel']!;
}

/* ─────────────────────────── Parser da entrada em bloco ─────────────────────────── */

export interface ParsedLine {
  raw: string;
  parts: string[];
}

export interface ParseResult {
  valid: ParsedLine[];
  /** Linhas descartadas por formato inválido (número da linha + motivo). */
  invalid: { line: number; text: string; reason: string }[];
  duplicates: number;
}

const clean = (t: string) => t.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

/** "12.500", "1.500.000", "3,14", "1e6" → número. Aceita ponto como milhar e vírgula decimal (pt-BR). */
export function parseLocaleNumber(input: string): number | null {
  let t = input.replace(/\s/g, '').replace(/[^\d.,eE+-]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Divide "Você prefere dinheiro ou amor?" em ["Dinheiro", "Amor"]. */
export function splitBinaryQuestion(q: string): [string, string] | null {
  const body = q.replace(/[?¿!.]+$/, '').replace(/^(voc[eê] )?(prefere|preferiria|escolheria|escolhe)\s+/i, '');
  const m = body.split(/\s+ou\s+/i);
  if (m.length !== 2) return null;
  const cap = (x: string) => {
    const s = x.trim().replace(/^(ser|ter)\s+/i, (w) => w);
    return s ? s[0].toLocaleUpperCase('pt-BR') + s.slice(1) : s;
  };
  const a = cap(m[0]);
  const b = cap(m[1]);
  return a && b ? [a.slice(0, 40), b.slice(0, 40)] : null;
}

function parseOne(kind: FormatKind, line: string): { parts: string[] } | { error: string } {
  const parts = line.split('|').map(clean).filter((p, i) => i === 0 || p !== '');
  const main = parts[0];
  if (!main) return { error: 'texto vazio antes do “|”' };
  switch (kind) {
    case 'line':
      return { parts: [line.replace(/\|/g, '/').slice(0, MAX_ITEM_LENGTH)] };
    case 'duas-verdades': {
      const flag = normalize(parts[1] ?? '');
      const isLie = ['mentira', 'falso', 'falsa', 'f', 'm', 'lie'].includes(flag);
      return { parts: [main.slice(0, 120), isLie ? 'mentira' : 'verdade'] };
    }
    case 'blefe':
      if (parts.length < 2) return { error: 'use “Pergunta | Resposta”' };
      return { parts: [main.slice(0, MAX_ITEM_LENGTH), ...parts.slice(1, 5).map((p) => p.slice(0, 60))] };
    case 'chute': {
      if (parts.length < 2) return { error: 'use “Pergunta | Valor | Unidade”' };
      const value = parseLocaleNumber(parts[1]);
      if (value === null) return { error: `“${parts[1]}” não é um número` };
      const unit = (parts[2] ?? '').replace(/^-$/, '').slice(0, 24);
      const isYear = normalize(parts[3] ?? '') === 'ano' || /^anos?$/i.test(unit);
      return { parts: [main.slice(0, MAX_ITEM_LENGTH), String(value), unit, isYear ? 'ano' : ''] };
    }
    case 'impulsao': {
      if (parts.length >= 3) return { parts: [main.slice(0, MAX_ITEM_LENGTH), parts[1].slice(0, 40), parts[2].slice(0, 40)] };
      const split = splitBinaryQuestion(main);
      if (!split) return { error: 'use “Pergunta | Opção A | Opção B” ou “X ou Y?”' };
      return { parts: [main.slice(0, MAX_ITEM_LENGTH), split[0], split[1]] };
    }
  }
}

function rawOf(kind: FormatKind, parts: string[]): string {
  switch (kind) {
    case 'line':
      return parts[0];
    case 'duas-verdades':
      return parts[1] === 'mentira' ? `${parts[0]} | mentira` : parts[0];
    case 'chute':
      return [parts[0], parts[1], parts[2] || '-', ...(parts[3] ? ['ano'] : [])].join(' | ');
    default:
      return parts.join(' | ');
  }
}

/** Processa o <textarea>: split por linha, trim, ignora vazias, remove duplicatas (case/acento-insensitive). */
export function parseBlock(slug: GameSlug, text: string): ParseResult {
  const kind = formatFor(slug).kind;
  const seen = new Set<string>();
  const valid: ParsedLine[] = [];
  const invalid: ParseResult['invalid'] = [];
  let duplicates = 0;
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = clean(rawLine);
    if (!line) return;
    const res = parseOne(kind, line);
    if ('error' in res) {
      invalid.push({ line: i + 1, text: line, reason: res.error });
      return;
    }
    const key = normalize(res.parts[0]);
    if (!key || seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    if (valid.length < MAX_ITEMS_PER_PACK) valid.push({ raw: rawOf(kind, res.parts), parts: res.parts });
  });
  return { valid, invalid, duplicates };
}

/* ─────────────────────────── Persistência local ─────────────────────────── */

let cache: CustomPack[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): CustomPack[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PACKS_KEY);
    const list = raw ? (JSON.parse(raw) as CustomPack[]) : [];
    return Array.isArray(list) ? list.filter((p) => p && typeof p.id === 'string' && Array.isArray(p.lines)) : [];
  } catch {
    return [];
  }
}

function writeStorage(list: CustomPack[]) {
  cache = list;
  try {
    localStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(list));
  } catch {
    /* armazenamento cheio/bloqueado: mantém em memória */
  }
  listeners.forEach((l) => l());
}

export function listPacks(): CustomPack[] {
  if (!cache) cache = readStorage();
  return cache;
}

export function packsFor(slug: GameSlug): CustomPack[] {
  return listPacks().filter((p) => p.game === slug);
}

export function subscribePacks(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CUSTOM_PACKS_KEY) {
      cache = readStorage();
      fn();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** Hook React: lista reativa dos pacotes do usuário. */
export function useCustomPacks(): CustomPack[] {
  return useSyncExternalStore(subscribePacks, listPacks, listPacks);
}

export function savePack(input: { id?: string; name: string; game: GameSlug; theme: string; text: string }): CustomPack {
  const parsed = parseBlock(input.game, input.text);
  const now = Date.now();
  const list = listPacks();
  const existing = input.id ? list.find((p) => p.id === input.id) : undefined;
  const pack: CustomPack = {
    id: existing?.id ?? crypto.randomUUID(),
    name: clean(input.name).slice(0, 40) || 'Meu pacote',
    game: input.game,
    theme: clean(input.theme).slice(0, 40),
    lines: parsed.valid.map((v) => v.raw),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeStorage(existing ? list.map((p) => (p.id === pack.id ? pack : p)) : [...list, pack]);
  void cloudUpsert(pack);
  return pack;
}

export function deletePack(id: string) {
  writeStorage(listPacks().filter((p) => p.id !== id));
  void cloudDelete(id);
}

/** Texto em bloco para reabrir o pacote no <textarea>. */
export function packToText(pack: CustomPack): string {
  return pack.lines.join('\n');
}

/* ─────────────────────────── Sincronização com o Supabase (opcional) ─────────────────────────── */

let cloudAvailable: boolean | null = null;

function cloud(): SupabaseClient | null {
  if (cloudAvailable === false) return null;
  return getSupabase() as unknown as SupabaseClient | null;
}

async function cloudUser(sb: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

function markCloudError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  // tabela inexistente (migração opcional não aplicada) ou sem permissão → modo só-local
  if (['42P01', 'PGRST205', 'PGRST202', '42501'].includes(error.code ?? '') || /does not exist|not find/i.test(error.message ?? '')) cloudAvailable = false;
}

async function cloudUpsert(pack: CustomPack) {
  const sb = cloud();
  if (!sb) return;
  const uid = await cloudUser(sb);
  if (!uid) return;
  const { error } = await sb.from('custom_packs').upsert({ id: pack.id, owner_id: uid, data: pack, updated_at: new Date(pack.updatedAt).toISOString() });
  markCloudError(error);
}

async function cloudDelete(id: string) {
  const sb = cloud();
  if (!sb) return;
  const uid = await cloudUser(sb);
  if (!uid) return;
  const { error } = await sb.from('custom_packs').delete().eq('id', id).eq('owner_id', uid);
  markCloudError(error);
}

/** Mescla os pacotes da nuvem com os locais (vence o `updatedAt` mais recente). Nunca rejeita. */
export async function syncPacksFromCloud(): Promise<'synced' | 'local-only'> {
  const sb = cloud();
  if (!sb) return 'local-only';
  const uid = await cloudUser(sb);
  if (!uid) return 'local-only';
  try {
    const { data, error } = await sb.from('custom_packs').select('id, data').eq('owner_id', uid);
    if (error) {
      markCloudError(error);
      return 'local-only';
    }
    cloudAvailable = true;
    const local = listPacks();
    const merged = new Map(local.map((p) => [p.id, p]));
    const toUpload: CustomPack[] = [];
    (data as { id: string; data: CustomPack }[] | null)?.forEach((row) => {
      const remote = row.data;
      if (!remote || !Array.isArray(remote.lines)) return;
      const mine = merged.get(row.id);
      if (!mine || remote.updatedAt > mine.updatedAt) merged.set(row.id, { ...remote, id: row.id });
    });
    local.forEach((p) => {
      const remote = (data as { id: string; data: CustomPack }[] | null)?.find((r) => r.id === p.id);
      if (!remote || p.updatedAt > (remote.data?.updatedAt ?? 0)) toUpload.push(p);
    });
    writeStorage(Array.from(merged.values()));
    await Promise.all(toUpload.map((p) => cloudUpsert(p)));
    return 'synced';
  } catch {
    return 'local-only';
  }
}

/* ─────────────────────────── Uso pelo motor (dispositivo do anfitrião) ─────────────────────────── */

export function packModeOf(config: GameConfig): PackMode {
  const m = config.packMode;
  return m === 'mixed' || m === 'custom' ? m : 'official';
}

export function selectedPackIds(config: GameConfig): string[] {
  return String(config.customPackIds ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Itens personalizados ativos para a partida (lidos do localStorage do anfitrião).
 * Sem nenhum pacote marcado, usa TODOS os pacotes do anfitrião para aquele jogo.
 */
export function resolveCustomItems(slug: GameSlug, config: GameConfig): CustomItem[] {
  if (!supportsCustomContent(slug) || packModeOf(config) === 'official') return [];
  const ids = selectedPackIds(config);
  const all = packsFor(slug);
  const chosen = ids.length ? all.filter((p) => ids.includes(p.id)) : all;
  const out: CustomItem[] = [];
  const seen = new Set<string>();
  chosen.forEach((pack) =>
    parseBlock(slug, packToText(pack)).valid.forEach((v, i) => {
      const key = normalize(v.parts[0]);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ id: `cp:${pack.id.slice(0, 8)}:${i}`, text: v.parts[0], parts: v.parts });
    }),
  );
  return out;
}

/** Combina conteúdo oficial e personalizado conforme o modo (custom vazio → volta ao oficial). */
export function mergePools<T>(official: T[], custom: T[], mode: PackMode): T[] {
  if (mode === 'custom') return custom.length ? custom : official;
  if (mode === 'mixed') return [...official, ...custom];
  return official;
}
