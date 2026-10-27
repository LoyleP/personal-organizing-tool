import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    {
      // Plain `vite` has no serverless functions; use `vercel dev` for the API.
      name: 'no-api-in-vite',
      configureServer(server) {
        server.middlewares.use('/api', (_req, res) => {
          res.statusCode = 503;
          res.end();
        });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Organizer',
        short_name: 'Organizer',
        display: 'standalone',
        start_url: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 6_000_000,
      },
    }),
  ],
});
