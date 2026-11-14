import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // In development the API is reached through the Vite server (same origin),
      // so the browser never needs CORS.
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://localhost:3333',
      },
    },
    test: {
      include: ['src/**/*.test.ts'],
    },
  };
});
