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
// Set these in Vercel: Project → Settings → Environment Variables, then
// redeploy:
//   REBORN_PASS            your master password (required)
//   REBORN_ROTATE_SECRET   a long random string the guest codes and sign-in
//                          cookies are made from (required)
//   REBORN_USER            master username (optional, default "reborn")
//   REBORN_GATE            set to "off" to remove this password gate
//                          entirely (for when customers sign in with their
//                          own accounts — see SETUP_GUIDE.md)
//
// There are deliberately NO default passwords in this file any more: this
// repo can be read by others, so a default would be a public password. If
// the required variables are missing, the site shows a "finish setup" page
// instead of opening up — it fails closed.

const DEFAULT_USER = 'reborn';

// The guest-code / sign-in-cookie secret. Also read under its older name so
// projects set up before the rename keep working. Shared with the Telegram
// bot and Discord poster so they always compute the same codes.
export function rotateSecretFrom(env) {
  return env.REBORN_ROTATE_SECRET || env.ROTATING_CODE_SECRET;
}

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

// ---- remember-me session cookie -------------------------------------------
// iOS home-screen apps don't reliably keep Basic Auth between launches, so
// after ONE successful sign-in we hand the device a signed cookie and trust
// that from then on. The cookie is HMAC-signed with the rotate secret —
// nobody can mint one without it — and carries a role: 'm' (master, 365
// days, opens /code) or 'g' (guest via hourly code, 30 days, app only).

const COOKIE_NAME = 'reborn_session';
export const MASTER_SESSION_DAYS = 365;
export const GUEST_SESSION_DAYS = 30;

async function cookieSig(secret, role, expiresAtMs) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`reborn-cookie:${role}:${expiresAtMs}`));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function makeSessionCookie(secret, role, expiresAtMs) {
  return `v1.${role}.${expiresAtMs}.${await cookieSig(secret, role, expiresAtMs)}`;
}

// Returns { role } for a valid, unexpired cookie value; null otherwise.
// Tampering with any part (role, expiry, signature) fails the HMAC check.
export async function verifySessionCookie(secret, value, nowMs = Date.now()) {
  if (typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const [, role, expStr, sig] = parts;
  if (role !== 'm' && role !== 'g') return null;
  const expiresAtMs = Number(expStr);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;
  const expected = await cookieSig(secret, role, expiresAtMs);
  return timingSafeEqual(sig, expected) ? { role } : null;
}

export function cookieFromHeader(cookieHeader, name = COOKIE_NAME) {
  if (typeof cookieHeader !== 'string') return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

// ---- brute-force lockout ---------------------------------------------------
// 5 wrong password attempts -> locked out for 15 minutes. Tracked in a
// signed cookie (the edge has no shared memory): count + first-failure time,
// HMAC'd so it can't be edited. Only requests that actually SENT wrong
// credentials count — just seeing the sign-in box is not an attempt.

const FAILS_COOKIE = 'reborn_fails';
export const LOCKOUT_LIMIT = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60000;

async function failSig(secret, count, firstMs) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`reborn-fails:${count}:${firstMs}`));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function makeFailCookie(secret, count, firstMs) {
  return `v1.${count}.${firstMs}.${await failSig(secret, count, firstMs)}`;
}

// Returns { count, firstMs } while the 15-minute window is still open;
// null for anything invalid, tampered, or expired (expired = clean slate).
export async function verifyFailCookie(secret, value, nowMs = Date.now()) {
  if (typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const count = Number(parts[1]);
  const firstMs = Number(parts[2]);
  if (!Number.isInteger(count) || count < 1 || !Number.isFinite(firstMs)) return null;
  if (nowMs - firstMs >= LOCKOUT_WINDOW_MS) return null;
  const expected = await failSig(secret, count, firstMs);
  return timingSafeEqual(parts[3], expected) ? { count, firstMs } : null;
}

// Static files carry no personal data (all app data lives on the device),
// so they skip the gate entirely — this is the perf fix: no auth round-trip
// on every JS/CSS/image request, only on the page itself.
// Legal pages must be readable by anyone (app stores, payment providers and
// visitors deciding whether to sign up all need them), so they skip the gate.
export function isPublicPage(pathname) {
  return pathname === '/privacy' || pathname === '/privacy.html'
    || pathname === '/terms' || pathname === '/terms.html';
}

export function isStaticAsset(pathname) {
  if (pathname.startsWith('/assets/')) return true;
  return /\.(js|mjs|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$/i.test(pathname)
    || pathname === '/manifest.json' || pathname === '/sw.js';
}

function lockedResponse(fails, nowMs) {
  const minsLeft = Math.max(1, Math.ceil((fails.firstMs + LOCKOUT_WINDOW_MS - nowMs) / 60000));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0B0B0D"><title>REBORN — locked</title>
<style>html,body{margin:0;background:#0B0B0D;color:#EAE6DF;font-family:ui-monospace,Menlo,monospace;
min-height:100vh;display:grid;place-items:center;text-align:center}
.dim{color:#8A857C;font-size:12px;letter-spacing:2px;text-transform:uppercase}
.big{font-size:22px;color:#f87171;margin:10px 0}</style></head><body><div>
<div class="dim">Too many wrong attempts</div>
<div class="big">Locked for ${minsLeft} more minute${minsLeft === 1 ? '' : 's'}</div>
<div class="dim">Close this tab and try again later</div>
</div></body></html>`;
  return new Response(html, {
    status: 429,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'retry-after': String(minsLeft * 60),
      'cache-control': 'no-store',
    },
  });
}

// After a fresh Basic Auth success: set the cookie and bounce the browser
// back to the same URL, which then sails through on the cookie alone.
async function grantSession(secret, role, requestUrl) {
  const days = role === 'm' ? MASTER_SESSION_DAYS : GUEST_SESSION_DAYS;
  const maxAge = days * 86400;
  const value = await makeSessionCookie(secret, role, Date.now() + maxAge * 1000);
  const res = new Response(null, {
    status: 302,
    headers: {
      location: requestUrl,
      'set-cookie': `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      'cache-control': 'no-store',
    },
  });
  // Successful sign-in wipes any brute-force strikes for this device.
  res.headers.append('set-cookie', `${FAILS_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return res;
}

// Owner-only page showing the live guest code. Kept dependency-free and
// rendered right here in the middleware so the static build is untouched.
export async function codePage(rotateSecret, nowMs) {
  const current = await hourlyCode(rotateSecret, nowMs, 0);
  const next = await hourlyCode(rotateSecret, nowMs, 1);
  const minsLeft = Math.max(1, 60 - Math.floor((nowMs % HOUR_MS) / 60000));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="60">
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

// Lists WHICH setting is missing (names only — never any values) so the
// owner can tell "not added" apart from "added but not deployed yet".
export function setupRequiredPage(missing) {
  const items = missing.map(n => `<li><b>${n}</b></li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0B0B0D"><title>REBORN — setup needed</title>
<style>html,body{margin:0;background:#0B0B0D;color:#EAE6DF;font-family:ui-monospace,Menlo,monospace;
min-height:100vh;display:grid;place-items:center;padding:0 16px}
.wrap{max-width:420px}.dim{color:#8A857C;font-size:12px;line-height:1.7}
.big{font-size:18px;color:#D9B36C;margin:10px 0;text-align:center}
ul{color:#f0b25a;font-size:13px;padding-left:20px}ol{color:#8A857C;font-size:12px;line-height:1.7;padding-left:20px}</style></head><body><div class="wrap">
<div class="big">Almost there — finish setup</div>
<div class="dim">This deployment can't see:</div>
<ul>${items}</ul>
<div class="dim">In Vercel → this project → Settings → Environment Variables:</div>
<ol>
<li>Names must match exactly (capitals, underscores, no spaces).</li>
<li>Tick <b>Production</b> for each one.</li>
<li>Check you're in the right project — the one serving this address.</li>
<li>Then Deployments → ⋯ on the newest → <b>Redeploy</b>. Saved variables do nothing until a redeploy.</li>
</ol>
<div class="dim">Or add REBORN_GATE = off to open the app without the shared password.</div>
</div></body></html>`;
  return new Response(html, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// TEMPORARY OPEN MODE. While REBORN_PASS / REBORN_ROTATE_SECRET are not set
// yet, the app opens with no shared password instead of showing the setup
// page, so the owner isn't locked out while finishing setup. Safe-ish
// because no personal data lives on the site (it's all on each phone, and
// each profile has its own password). It ends on its own:
//   - as soon as both variables are set, the gate turns back on, or
//   - on TEMP_OPEN_UNTIL, after which a still-unconfigured site fails
//     closed again (setup page) so it can never stay open by accident.
// The owner-only /code page never opens without the real secrets.
export const TEMP_OPEN_UNTIL = Date.parse('2026-12-07T00:00:00Z');
export const clock = { now: () => Date.now() }; // tests swap this

export default async function middleware(request) {
  const env = (typeof process !== 'undefined' && process.env) || {};
  const nowMs = clock.now();

  let pathname = '/';
  try { pathname = new URL(request.url).pathname; } catch {}

  // API routes authenticate themselves (Telegram secret token, cron key,
  // Stripe signature) — the door must not swallow their webhooks. Static
  // assets skip the gate for speed; they contain no personal data.
  if (pathname.startsWith('/api/')) return undefined;
  if (isStaticAsset(pathname) || isPublicPage(pathname)) return undefined;

  // Gate switched off: the site is public and each customer's data is
  // protected by their own account instead.
  if (String(env.REBORN_GATE || '').toLowerCase() === 'off') return undefined;

  const user = env.REBORN_USER || DEFAULT_USER;
  // Older setups named these SITE_PASSWORD / ROTATING_CODE_SECRET; both work.
  const pass = env.REBORN_PASS || env.SITE_PASSWORD;
  const rotateSecret = rotateSecretFrom(env);
  if (!pass || !rotateSecret) {
    const isCodePage = pathname === '/code' || pathname === '/code/';
    if (!isCodePage && nowMs < TEMP_OPEN_UNTIL) return undefined; // temporary open mode
    return setupRequiredPage([!pass && 'REBORN_PASS (or SITE_PASSWORD)', !rotateSecret && 'REBORN_ROTATE_SECRET (or ROTATING_CODE_SECRET)'].filter(Boolean));
  }

  const header = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');
  const session = await verifySessionCookie(rotateSecret, cookieFromHeader(cookieHeader));

  // Devices with a valid remember-me cookie are never bothered — no
  // sign-in box, no lockout checks.
  if (session && !(pathname === '/code' || pathname === '/code/')) return undefined;

  // Brute-force lockout: 5 wrong attempts inside 15 minutes -> locked page.
  const fails = await verifyFailCookie(rotateSecret, cookieFromHeader(cookieHeader, 'reborn_fails'), nowMs);
  if (fails && fails.count >= LOCKOUT_LIMIT) return lockedResponse(fails, nowMs);

  // /code is the owner's window into the rotating password — master only
  // (master cookie or master Basic Auth), guest sessions deliberately do
  // NOT open it.
  if (pathname === '/code' || pathname === '/code/') {
    if ((session && session.role === 'm') || isMaster(parseBasicAuth(header), user, pass)) {
      return codePage(rotateSecret, nowMs);
    }
    if (parseBasicAuth(header)) return await recordFail(rotateSecret, fails, nowMs);
    return challenge();
  }

  if (await isAuthorized(header, { user, pass, rotateSecret })) {
    const role = isMaster(parseBasicAuth(header), user, pass) ? 'm' : 'g';
    return grantSession(rotateSecret, role, request.url);
  }

  // Wrong credentials were actually sent — count the strike. A bare visit
  // with no Authorization header just gets the sign-in box.
  if (parseBasicAuth(header)) return await recordFail(rotateSecret, fails, nowMs);
  return challenge();
}

// 401 that also bumps the signed fail counter.
async function recordFail(secret, fails, nowMs) {
  const count = fails ? fails.count + 1 : 1;
  const firstMs = fails ? fails.firstMs : nowMs;
  const value = await makeFailCookie(secret, count, firstMs);
  const res = challenge();
  res.headers.append('set-cookie',
    `${FAILS_COOKIE}=${value}; Max-Age=${Math.ceil(LOCKOUT_WINDOW_MS / 1000)}; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return res;
}
