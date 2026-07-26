// Bridges the client to the optional self-hosted backend (server/) for real
// background push notifications — the kind that fire even when this tab is
// closed, which the plain Notification API used elsewhere in this app can
// never do on its own. Everything here is a no-op with no backend token
// present, so the existing foreground-notification path keeps working
// exactly as before for anyone not running the backend.

const TOKEN_KEY = 'reborn:api-token';
const AUTH_CACHE = 'reborn-auth';

/** Pull ?token= out of the URL into localStorage, then scrub the URL — mirrors
 *  the sign-in link the backend prints at boot (http://host:port/?token=...). */
export function bootstrapToken() {
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('token');
    if (fromUrl) {
      localStorage.setItem(TOKEN_KEY, fromUrl);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch (e) { /* URL/localStorage unavailable — push just stays off */ }
  return getToken();
}

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; }
  catch (e) { return ''; }
}

function authHeaders(extra) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/** Mirror the token into the service worker's cache — a worker can't read localStorage. */
async function mirrorTokenToServiceWorker() {
  const token = getToken();
  if (!token || typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(AUTH_CACHE);
    await cache.put('/__reborn_token', new Response(token));
  } catch (e) { /* resubscribe-on-rotation just won't work; push still does */ }
}

/** True only if a backend is actually reachable at this origin with this token. */
export async function backendAvailable() {
  if (!getToken()) return false;
  try {
    const res = await fetch('/api/vapid', { headers: authHeaders({}) });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function urlB64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Registers the service worker, subscribes to push, and hands the
 *  subscription to the backend. Returns true only if real push is armed;
 *  never throws — any failure (denied permission, network hiccup, no
 *  service-worker support) just means push stays off, same as no backend. */
export async function armRealPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!getToken()) return false;

  try {
    await mirrorTokenToServiceWorker();
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const vapidRes = await fetch('/api/vapid', { headers: authHeaders({}) });
    if (!vapidRes.ok) return false;
    const { key, pushEnabled } = await vapidRes.json();
    if (!pushEnabled) return false; // backend has no REBORN_CONTACT set yet

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(key),
      });
    }

    const subRes = await fetch('/api/subscribe', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(sub.toJSON()),
    });
    return subRes.ok;
  } catch (e) {
    console.error('armRealPush failed', e.message);
    return false;
  }
}

/** Push the current schedule ({ id, time: 'HH:MM', label }[]) to the backend
 *  so its own ticker knows what to remind about. Safe to call whenever the
 *  schedule changes; harmless no-op with no backend present. */
export async function syncSchedule(rows) {
  if (!getToken()) return false;
  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ schedule: rows }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
