import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
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
