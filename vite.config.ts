import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

/** Identificador único de cada build: commit + horário. Vai embutido no app e em dist/version.json. */
function buildId() {
  let commit = 'dev';
  try {
    commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    // fora de um repositório git: segue só com o horário
  }
  return `${commit}-${Date.now().toString(36)}`;
}

const APP_VERSION = buildId();

/** Publica version.json junto do build para o app perceber quando um deploy novo foi ao ar. */
function versionFile(): Plugin {
  return {
    name: 'mascarenhas-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: APP_VERSION }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  base: process.env.VITE_BASE_PATH || '/',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.split('\\').join('/');
          if (/\/node_modules\/(react|react-dom|scheduler|zustand)\//.test(path)) return 'react';
          if (path.includes('/node_modules/@supabase/')) return 'supabase';
          if (/\/node_modules\/(lucide-react|canvas-confetti|qrcode)\//.test(path)) return 'ui';
          // dados puros (sem dependências de código do app): pedaço próprio, baixado em paralelo
          if (path.includes('/src/data/')) return 'data';
          return undefined;
        },
      },
    },
  },
});
