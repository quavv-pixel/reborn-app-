// car-fund/ has no build step of its own — this just carries it into the
// Vite output so it deploys as its own path alongside the REBORN app,
// on whatever static host serves dist/ (Vercel, GitHub Pages, etc).
import { cpSync } from 'node:fs';

cpSync('car-fund', 'dist/car-fund', { recursive: true });
console.log('Copied car-fund/ -> dist/car-fund/');
