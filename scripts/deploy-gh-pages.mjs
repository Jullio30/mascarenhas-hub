// Mascarenhas Hub — publica dist/ na branch gh-pages (GitHub Pages).
// Uso: npm run deploy   (requer .env.local com as chaves do Supabase)
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const remote = execSync('git remote get-url origin').toString().trim();
const repo = remote.replace(/\.git$/, '').split('/').pop();

run('npm run build', { env: { ...process.env, VITE_BASE_PATH: `/${repo}/` } });
writeFileSync('dist/.nojekyll', '');
rmSync('dist/.git', { recursive: true, force: true });
const git = (c) => run(`git ${c}`, { cwd: 'dist' });
git('init -q');
git('checkout -q -b gh-pages');
git('add -A');
git('-c user.name="Mascarenhas Hub Deploy" -c user.email="deploy@users.noreply.github.com" commit -q -m "Deploy Mascarenhas Hub"');
git(`push -f ${remote} gh-pages`);
rmSync('dist/.git', { recursive: true, force: true });
console.log(`\n[Mascarenhas Hub] Publicado! https://<usuario>.github.io/${repo}/`);
