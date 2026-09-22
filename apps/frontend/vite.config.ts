import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
const directory = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  base: process.env.VITE_APP_BASE ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/dhakad-logo.png'],
      manifest: {
        name: 'Dhakad Grading Plant',
        short_name: 'Dhakad Plant',
        description: 'Business management for Dhakad Grading Plant',
        theme_color: '#003f30',
        background_color: '#fff9e8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/dhakad-logo.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'], navigateFallback: '/index.html' },
    }),
  ],
  resolve: { alias: { '@': path.resolve(directory, 'src') } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
