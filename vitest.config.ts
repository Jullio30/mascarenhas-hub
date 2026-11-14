import { defineConfig } from 'vitest/config';

// Testes unitários/integração dos motores de jogo e do núcleo da sala (sem navegador).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // a suíte não deve depender do Supabase real
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
});
