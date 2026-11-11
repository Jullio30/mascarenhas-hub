// Mascarenhas Hub — copia dist/index.html para 404.html e 200.html
// (GitHub Pages / Surge) evitando 404 ao abrir links diretos de sala.
import { copyFileSync, existsSync } from 'node:fs';

const src = 'dist/index.html';
if (existsSync(src)) {
  copyFileSync(src, 'dist/404.html');
  copyFileSync(src, 'dist/200.html');
  console.log('[Mascarenhas Hub] SPA fallback gerado: 404.html e 200.html');
}
