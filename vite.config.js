import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vercel (and any custom domain) serves this at its own root, so the
  // default stays "/" — unchanged from before. Only the GitHub Pages
  // workflow (via `npm run build:pages`) sets VITE_BASE, since a Pages
  // project site is served at /<repo-name>/ instead of the domain root;
  // without that prefix the built index.html would request /assets/...
  // at the domain root and 404.
  base: process.env.VITE_BASE || '/',
});
