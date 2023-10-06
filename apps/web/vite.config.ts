/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/organizations': { target: 'http://localhost:3000', changeOrigin: true },
      '/invitations': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/v1': { target: 'http://localhost:3000', changeOrigin: true },
      '/docs': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
