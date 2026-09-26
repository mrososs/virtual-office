import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, type ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The SPA, `/api` and `/socket.io` share one origin — in production behind a
 * reverse proxy, locally through this proxy — so the HttpOnly session cookie
 * is first-party everywhere and the Microsoft callback lands inside the
 * installed PWA's scope.
 */
const backendUrl = process.env.VITE_DEV_BACKEND_URL ?? 'http://localhost:3001';
const backendProxy: Record<string, ProxyOptions> = {
  '/api': { target: backendUrl },
  '/socket.io': { target: backendUrl, ws: true },
};

const APP_BACKGROUND = '#0a0c11';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // Updates wait for the user ("New version available → Update"): never reload someone mid-office.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'iSaned Virtual Office',
        short_name: 'iSaned Office',
        description: "The iSaned team's real-time virtual office.",
        lang: 'en',
        start_url: '/office',
        scope: '/',
        display: 'standalone',
        background_color: APP_BACKGROUND,
        theme_color: APP_BACKGROUND,
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + static assets only (Phaser chunk included). Everything dynamic stays network-only:
        // no runtimeCaching, so API data, auth, Socket.IO and provider responses are never cached.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Demo-mode chunks are lazy and never loaded by a production session.
        globIgnores: ['**/*demo*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Never answer these navigations from the cache: the Microsoft callback and API must hit the server.
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // APP_URL, the Entra redirect URI and cookies are bound to this exact origin.
    strictPort: true,
    proxy: backendProxy,
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: backendProxy,
  },
  optimizeDeps: {
    // Phaser ships a large UMD bundle; pre-bundling it keeps dev server reloads fast.
    include: ['phaser'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Phaser alone is ~1.5 MB minified (≈340 kB gzip); it gets its own
    // long-cacheable chunk and is only loaded with the office route.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
