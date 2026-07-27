import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// Builds frontend/airview/* into a single self-contained index.html, output
// straight into the RN app's local assets (plan D5/Phase 4). The WASM +
// hand_landmarker.task assets are NOT bundled here (they're huge and loaded
// via runtime fetch(), not import) — scripts/prepare-airview-assets.mjs
// copies them alongside the built index.html afterward.
export default defineConfig({
  root: path.resolve(__dirname, 'airview'),
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../mobile/assets/air-drawing-webview'),
    emptyOutDir: true
  }
});
