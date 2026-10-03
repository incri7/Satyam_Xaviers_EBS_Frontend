import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // No manual chunks: the 3D scene is a lazy import, so three.js and its libraries land in
  // their own chunk and load after the text. (Manual chunks pulled React internals into the
  // 3D chunk and made the first page download all of it.)
  build: { target: 'es2020', chunkSizeWarningLimit: 1800 },
});
