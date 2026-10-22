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
      includeAssets: [
        'icons/grading-plant-solution-logo.svg',
        'icons/grading-plant-solution-mark.svg',
      ],
      manifest: {
        name: 'Grading Plant Solution',
        short_name: 'Grading Plant',
        description: 'Grading Plant Solution · Contact 9669024735',
        theme_color: '#003f30',
        background_color: '#fff9e8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/grading-plant-solution-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/grading-plant-solution-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpeg,jpg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/icons\//, /\.[^/]+$/],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(directory, 'src') } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
