import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'zustand'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'canvas-confetti', 'qrcode'],
        },
      },
    },
  },
});
