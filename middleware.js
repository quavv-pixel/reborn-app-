// Vercel Edge Middleware — runs before every request to the site.
// Gates the whole app behind the browser's built-in username/password
// prompt (HTTP Basic Auth): anyone opening the link gets the native
// sign-in box and sees nothing until they enter the right credentials.
//
// One shared username + password for everyone you invite — this is a
// door on the building, separate from each profile's own password
// inside the app. Set the real credentials in Vercel:
//   Project → Settings → Environment Variables →
//     REBORN_USER = <username>   REBORN_PASS = <password>
// then redeploy. Until those are set, the defaults below apply — change
// them by setting the env vars, not by editing this file into a secret,
// since this file lives in the repo.

const DEFAULT_USER = 'reborn';
const DEFAULT_PASS = 'reborn123';

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

// Parses an `Authorization: Basic base64(user:pass)` header and checks it
// against the expected pair. Malformed input never throws — it just fails.
export function checkBasicAuth(header, user, pass) {
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  const u = decoded.slice(0, sep);
  const p = decoded.slice(sep + 1);
  // Bitwise & (not &&) so both compares always run — keeps timing flat.
  return timingSafeEqual(u, user) & timingSafeEqual(p, pass) ? true : false;
}

export default function middleware(request) {
  const user = (typeof process !== 'undefined' && process.env && process.env.REBORN_USER) || DEFAULT_USER;
  const pass = (typeof process !== 'undefined' && process.env && process.env.REBORN_PASS) || DEFAULT_PASS;
  if (checkBasicAuth(request.headers.get('authorization'), user, pass)) {
    return undefined; // authorized — let the request through to the app
  }
  return new Response('REBORN — sign in to continue', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="REBORN", charset="UTF-8"' },
  });
}
