import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./App/frontend/', import.meta.url)),
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:' + (process.env.API_PORT || '3000'),
        changeOrigin: false,
      },
      '/site.webmanifest': {
        target: 'http://127.0.0.1:' + (process.env.API_PORT || '3000'),
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/client/', import.meta.url)),
    emptyOutDir: true,
  },
});
