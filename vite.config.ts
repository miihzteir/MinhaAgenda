import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Configuração do Vite: React + TypeScript + PWA instalável.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Minha Agenda — Planner Pessoal',
        short_name: 'Minha Agenda',
        description: 'Planner pessoal e acadêmico, delicado e acolhedor.',
        theme_color: '#a9785f',
        background_color: '#faf6f1',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // O app inteiro (SPA) é o fallback de navegação offline — assim,
        // qualquer rota abre normalmente mesmo sem internet, usando os
        // dados já salvos localmente. offline.html fica disponível como
        // página avulsa (não é possível mostrá-la no lugar do app, pois o
        // app já teria que estar em cache para isso).
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__/, /^\/offline\.html$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false }
});
