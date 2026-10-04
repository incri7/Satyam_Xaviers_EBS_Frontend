import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The site's CSS is plain. An empty PostCSS config stops Vite from climbing to the admin app's
  // Tailwind config at the repo root.
  css: { postcss: {} },
  // No manual chunks: the 3D scene is a lazy import, so three.js and its libraries land in
  // their own chunk and load after the text. (Manual chunks pulled React internals into the
  // 3D chunk and made the first page download all of it.)
  // The site shares its domain with the school app (website at /, /en, /ne; the app everywhere else).
  // Its scripts go in site-assets/, so they never collide with the app's assets/ folder.
  build: { target: 'es2020', chunkSizeWarningLimit: 1800, assetsDir: 'site-assets' },
});
