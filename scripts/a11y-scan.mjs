// Auditoria de acessibilidade (axe-core, WCAG 2 A/AA + boas práticas).
// Uso: npm run a11y            → gera o build, sobe um servidor local e verifica início, lobby e todos os jogos
//      A11Y_GAMES="Impostor|Blefe" npm run a11y   → só os jogos listados
//      CHROME_PATH="C:/.../chrome.exe" npm run a11y → navegador específico (padrão: Chrome instalado)
// Sai com código 1 se encontrar qualquer violação.
import { createRequire } from 'node:module';
import { preview } from 'vite';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const IMPACT = ['critical', 'serious', 'moderate', 'minor'];
// Sabe ou Perde é desenvolvido à parte pelo dono do projeto e fica fora desta auditoria.
const ALL_GAMES = [
  'Desafio dos 10 Segundos', 'Impostor', 'Mega Senha', 'Adivinhe a Música', 'Categorias', 'Blefe', 'Infiltrado',
  'Quem é Mais Provável?', 'Ordem Caótica', 'Duas Verdades e Uma Mentira', 'Telefone de Palavras', 'Chute Perfeito',
  'Defesa Impossível', 'Impulsão Contrária', 'Quem Escreveu?',
];
const GAMES = process.env.A11Y_GAMES ? process.env.A11Y_GAMES.split('|').map((g) => g.trim()).filter(Boolean) : ALL_GAMES;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const server = await preview({ base: '/', preview: { port: 4174, strictPort: false, open: false }, logLevel: 'silent' });
const SITE = server.resolvedUrls?.local?.[0] ?? 'http://localhost:4174/';
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const found = new Map();
const errors = [];
let exitCode = 0;

try {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const host = await ctx.newPage();
  host.on('pageerror', (e) => errors.push(e.message));

  async function scan(label) {
    await host.addScriptTag({ path: AXE });
    const violations = await host.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        url: v.helpUrl,
        count: v.nodes.length,
        nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} — ${(n.failureSummary ?? '').split('\n')[1]?.trim() ?? ''}`),
      }));
    });
    for (const v of violations) {
      if (!found.has(v.id)) found.set(v.id, { ...v, screens: [] });
      found.get(v.id).screens.push(`${label} (${v.count})`);
    }
    console.log(`${violations.length ? '✗' : '✓'} ${label}${violations.length ? `: ${violations.length} regra(s)` : ''}`);
  }

  await host.goto(SITE);
  await host.waitForSelector('#nick');
  await scan('Tela inicial');

  // Sala no Modo Local com 4 jogadores (abas do mesmo navegador) para liberar todos os jogos
  await host.fill('#nick', 'Auditoria');
  await host.getByText(/Testar no Modo Local/).click();
  await host.getByRole('button', { name: /Criar sala/ }).click();
  await host.waitForURL(/room=/);
  for (let i = 0; i < 4; i++) {
    const p = await ctx.newPage();
    await p.goto(host.url());
    await p.waitForTimeout(2000);
  }
  await host.bringToFront();
  await host.waitForTimeout(1500);
  await scan('Lobby');

  for (const game of GAMES) {
    await host.getByRole('button', { name: new RegExp(`^Escolher ${escape(game)}$`) }).click();
    await host.waitForTimeout(400);
    await host.getByRole('button', { name: /^Iniciar/ }).click();
    await host.waitForTimeout(3500);
    await scan(game);
    await host.getByRole('button', { name: /^Encerrar/ }).first().click();
    await host.getByRole('button', { name: /Encerrar\?/ }).click();
    await host.waitForTimeout(2000);
  }

  const list = [...found.values()].sort((a, b) => IMPACT.indexOf(a.impact) - IMPACT.indexOf(b.impact));
  for (const v of list) {
    console.log(`\n[${v.impact}] ${v.id} — ${v.help}\n  ${v.url}\n  telas: ${v.screens.join(', ')}`);
    v.nodes.forEach((n) => console.log(`  · ${n.slice(0, 240)}`));
  }
  if (errors.length) console.log(`\nErros de JavaScript na página (${errors.length}):\n${errors.join('\n')}`);
  console.log(`\n${list.length ? `✗ ${list.length} regra(s) de acessibilidade violada(s)` : '✓ Nenhuma violação de acessibilidade encontrada'}`);
  exitCode = list.length || errors.length ? 1 : 0;
} catch (err) {
  console.error('\nA auditoria não conseguiu terminar:', err.message);
  exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
process.exit(exitCode);
