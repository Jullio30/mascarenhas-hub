// Mascarenhas Hub — gera supabase/seed_catalog.sql a partir de src/data/defaultPacks.ts
// Uso: npm run seed
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'mascarenhas-hub-seed-'));
const out = join(dir, 'packs.mjs');
await build({ entryPoints: ['src/data/defaultPacks.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
const { DEFAULT_CATALOG: c } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
const rows = [];
c.fiveSec.forEach((p) => rows.push(['d5:' + p.id, 'desafio-5-segundos', p.category, { text: p.text }]));
c.impostor.forEach((cat) => cat.words.forEach((w, i) => rows.push([`imp:${cat.name}:${i}`, 'impostor', cat.name, { word: w }])));
c.megaSenha.forEach((w, i) => rows.push([`ms:${i}`, 'mega-senha', w.category, { word: w.word }]));
c.songs.forEach((s) => rows.push(['mus:' + s.id, 'adivinhe-a-musica', s.genre, s]));
c.categories.forEach((p) => rows.push(['cat:' + p.id, 'categorias', null, { text: p.text }]));

const sql = `-- =====================================================================
-- Mascarenhas Hub — seed_catalog.sql (GERADO por scripts/generate-seed.mjs)
-- Catálogo inicial PT-BR: ${c.fiveSec.length} cartas do Desafio dos 5 Segundos,
-- ${c.impostor.length} categorias do Impostor, ${c.megaSenha.length} senhas do Mega Senha,
-- ${c.songs.length} músicas do Adivinhe a Música e ${c.categories.length} temas do Categorias.
-- Execute DEPOIS de schema.sql. Idempotente (ON CONFLICT DO UPDATE).
-- =====================================================================

INSERT INTO public.catalog_items (id, game, category, payload) VALUES
${rows.map(([id, game, cat, payload]) => `  (${q(id)}, ${q(game)}, ${q(cat)}, ${j(payload)})`).join(',\n')}
ON CONFLICT (id) DO UPDATE SET game = EXCLUDED.game, category = EXCLUDED.category, payload = EXCLUDED.payload;
`;
writeFileSync('supabase/seed_catalog.sql', sql);
console.log(`[Mascarenhas Hub] seed_catalog.sql gerado com ${rows.length} itens.`);
