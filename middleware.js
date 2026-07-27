// Vercel Edge Middleware — runs before every request to the site.
// Gates the whole app behind the browser's built-in username/password
// prompt (HTTP Basic Auth). Two ways in:
//
//   1. The MASTER login (owner only, never changes):
//        REBORN_USER / REBORN_PASS env vars, defaults below until set.
//   2. An HOURLY GUEST CODE: an 8-character code derived from
//        REBORN_ROTATE_SECRET that changes every hour. Give this hour's
//        code to a guest (any username + the code as the password) and
//        it stops working when the hour rolls over. The code from the
//        previous hour is also accepted, so a code shared at :59 still
//        gets someone in.
//
// The owner reads the current code at /code — that page itself requires
// the MASTER login, so guests can never see upcoming codes.
//
// Set the real secrets in Vercel: Project → Settings → Environment
// Variables → REBORN_USER, REBORN_PASS, REBORN_ROTATE_SECRET — then
// redeploy. The in-repo defaults below exist so everything works before
// that's done; anyone who can read this repo can read them, so treat
// them as placeholders, not secrets.

const DEFAULT_USER = 'reborn';
const DEFAULT_PASS = 'reborn123';
const DEFAULT_ROTATE_SECRET = 'reborn-rotate-default';

// No I/L/O/0/1/U — every character is unambiguous when read aloud or
// copied from a phone notification.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 8;
const HOUR_MS = 3600000;

// Constant-time string compare (same spirit as server/security.js) so a
// wrong guess can't be timed character-by-character.
export function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(String(a));
  const bb = enc.encode(String(b));
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}

// Parses an `Authorization: Basic base64(user:pass)` header. Malformed
// input never throws — it returns null.
export function parseBasicAuth(header) {
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return null;
  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return null;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return null;
  return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) };
}

// The guest code for a given hour: HMAC-SHA256(secret, hour-number),
// mapped onto the unambiguous alphabet. Deterministic — any machine that
// knows the secret computes the same code for the same hour.
export async function hourlyCode(secret, epochMs, hourOffset = 0) {
  const hourWindow = Math.floor(epochMs / HOUR_MS) + hourOffset;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('reborn-code:' + hourWindow));
  const bytes = new Uint8Array(sig);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function isMaster(parsed, user, pass) {
  if (!parsed) return false;
  // Bitwise & (not &&) so both compares always run — keeps timing flat.
  return timingSafeEqual(parsed.user, user) & timingSafeEqual(parsed.pass, pass) ? true : false;
}

// Full door check: master login always works; otherwise the password
// field must hold this hour's (or last hour's) guest code.
export async function isAuthorized(header, { user, pass, rotateSecret }, nowMs = Date.now()) {
  const parsed = parseBasicAuth(header);
  if (!parsed) return false;
  if (isMaster(parsed, user, pass)) return true;
  if (rotateSecret) {
    const attempt = parsed.pass.toUpperCase();
    const current = await hourlyCode(rotateSecret, nowMs, 0);
    const previous = await hourlyCode(rotateSecret, nowMs, -1);
    // | not || so both compares always run — keeps timing flat.
    if (timingSafeEqual(attempt, current) | timingSafeEqual(attempt, previous)) return true;
  }
  return false;
}

function challenge() {
  return new Response('REBORN — sign in to continue', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="REBORN", charset="UTF-8"' },
  });
}

// Owner-only page showing the live guest code. Kept dependency-free and
// rendered right here in the middleware so the static build is untouched.
export async function codePage(rotateSecret, nowMs) {
  const current = await hourlyCode(rotateSecret, nowMs, 0);
  const next = await hourlyCode(rotateSecret, nowMs, 1);
  const minsLeft = Math.max(1, 60 - Math.floor((nowMs % HOUR_MS) / 60000));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0B0B0D"><title>REBORN — guest code</title>
<style>
  html,body{margin:0;background:#0B0B0D;color:#EAE6DF;font-family:ui-monospace,Menlo,monospace;
    min-height:100vh;display:grid;place-items:center;text-align:center}
  .dim{color:#8A857C;font-size:12px;letter-spacing:2px;text-transform:uppercase}
  .code{font-size:44px;letter-spacing:8px;color:#D9B36C;margin:10px 0 4px;
    text-shadow:0 0 24px rgba(217,179,108,.4)}
  .next{font-size:16px;letter-spacing:4px;color:#8A857C;margin-top:2px}
  .card{padding:32px 24px}
</style></head><body><div class="card">
<div class="dim">Guest code — this hour</div>
<div class="code">${current}</div>
<div class="dim">${minsLeft} min left, then it changes</div>
<div style="height:28px"></div>
<div class="dim">Next hour's code</div>
<div class="next">${next}</div>
<div style="height:28px"></div>
<div class="dim">Guests sign in with any name + this code</div>
</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default async function middleware(request) {
  const env = (typeof process !== 'undefined' && process.env) || {};
  const user = env.REBORN_USER || DEFAULT_USER;
  const pass = env.REBORN_PASS || DEFAULT_PASS;
  const rotateSecret = env.REBORN_ROTATE_SECRET || DEFAULT_ROTATE_SECRET;
  const header = request.headers.get('authorization');

  let pathname = '/';
  try { pathname = new URL(request.url).pathname; } catch {}

  // /code is the owner's window into the rotating password — master only,
  // guest codes deliberately do NOT open it.
  if (pathname === '/code' || pathname === '/code/') {
    if (!isMaster(parseBasicAuth(header), user, pass)) return challenge();
    return codePage(rotateSecret, Date.now());
  }

  if (await isAuthorized(header, { user, pass, rotateSecret })) {
    return undefined; // authorized — let the request through to the app
  }
  return challenge();
}
