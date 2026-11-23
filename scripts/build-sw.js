// Runs after `vite build` (see "postbuild" in package.json).
// Vite gives every JS/CSS file a new hashed name on each build, so the
// service worker can't hard-code the list. This script reads dist/, writes
// the real list into dist/sw.js, and stamps a version on the cache name so
// phones throw away the previous build's files after an update.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const out = process.argv[2] || 'dist'; // test builds pass their own folder
const assets = readdirSync(`${out}/assets`).map(f => `assets/${f}`);
// Paths are relative ("./", "assets/x.js"), so they resolve against wherever
// sw.js is served — works on Vercel ("/") and GitHub Pages ("/reborn-app-/").
const icons = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png'].filter(f => existsSync(`${out}/${f}`));
const files = ['./', 'manifest.json', ...icons, ...assets];
const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 10);

const swPath = `${out}/sw.js`;
let sw = readFileSync(swPath, 'utf8');
const before = sw;
sw = sw.replace("const CACHE = 'reborn-dev';", `const CACHE = 'reborn-${version}';`)
       .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(files)};`);
if (sw === before || !sw.includes(version)) throw new Error('build-sw: placeholders not found in dist/sw.js');
writeFileSync(swPath, sw);
console.log(`Service worker: ${files.length} files precached, cache reborn-${version}`);
