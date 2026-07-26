/* REBORN backend config — every machine-specific value lands here, nowhere
   else. Reads .env (if present) then process.env, so a clone runs with zero
   edits and a fork never inherits someone else's access token. */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Minimal .env reader — no dependency, no expansion, no surprises.
// KEY=value, # comments, optional surrounding quotes. process.env always wins.
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadDotEnv();

const DATA = process.env.REBORN_DATA_DIR
  ? path.resolve(ROOT, process.env.REBORN_DATA_DIR)
  : path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });

/* ---------- access token ----------
   The API sends push and stores your schedule, so it is never left open. Set
   REBORN_TOKEN to pin one; otherwise a random token is generated once and
   persisted to data/token.json (gitignored). Printed on boot either way. */
function resolveToken() {
  const fromEnv = (process.env.REBORN_TOKEN || '').trim();
  if (fromEnv) {
    if (fromEnv.length < 16) {
      throw new Error('REBORN_TOKEN must be at least 16 characters — short tokens are guessable.');
    }
    return fromEnv;
  }
  const file = path.join(DATA, 'token.json');
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved && typeof saved.token === 'string' && saved.token.length >= 16) return saved.token;
  } catch { /* fall through and mint a new one */ }
  const token = crypto.randomBytes(24).toString('base64url');
  fs.writeFileSync(file, JSON.stringify({ token }, null, 2), { mode: 0o600 });
  return token;
}

/* ---------- push contact ----------
   Apple's push service rejects an invalid VAPID subject outright (403), so
   this must be a real mailto: or https: URL that you control. */
const contact = (process.env.REBORN_CONTACT || '').trim();
if (contact && !/^(mailto:\S+@\S+|https:\/\/\S+)$/.test(contact)) {
  throw new Error('REBORN_CONTACT must look like "mailto:you@example.com" or "https://example.com".');
}

export default {
  ROOT,
  DATA,
  DIST: path.join(ROOT, 'dist'),
  PORT: Number(process.env.PORT) || 3131,
  // 0.0.0.0 by default so it's reachable from other devices on the network
  // once tunneled over HTTPS. The token gate is what keeps that safe. Set
  // REBORN_HOST=127.0.0.1 if you only ever want loopback access.
  HOST: process.env.REBORN_HOST || '0.0.0.0',
  TOKEN: resolveToken(),
  // Push stays off until you set a real contact (see .env.example).
  CONTACT: contact,
};
