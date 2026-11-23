/* REBORN service worker — offline shell fallback + real background push.
   This exists because the in-page Notification API only fires while the
   tab is alive; a service worker is what lets the OS/browser wake this app
   for a push event even when nothing is open. */
// Both lines below are rewritten by scripts/build-sw.js at build time:
// CACHE gets a per-build version (so old files are cleared out after an
// update) and PRECACHE gets the full list of files Vite produced. In dev
// they stay as-is and the worker just caches what it sees.
const CACHE = 'reborn-dev';
const PRECACHE = [];
const AUTH_CACHE = 'reborn-auth'; // token store — survives every cache version bump

// Only keep responses that are safe to replay offline: same site, real 200s.
// Never cache 401 "sign in" pages, redirects, or other sites (e.g. the cloud
// sync API) — replaying those offline would show errors or stale data.
function cacheable(req, res) {
  return res && res.ok && res.type === 'basic' && !res.redirected
    && new URL(req.url).origin === self.location.origin;
}

self.addEventListener('install', (e) => {
  // Download every app file up front so the very first visit already works
  // offline. One file failing (e.g. the page itself returns 401 because the
  // sign-in cookie isn't set yet) must not abort the whole install.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((url) =>
        fetch(url, { credentials: 'same-origin', cache: 'reload' })
          .then((res) => (cacheable(new Request(new URL(url, self.location)), res) ? c.put(url, res) : null))
          .catch(() => null)
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k !== AUTH_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // other sites: browser handles it
  if (url.pathname.startsWith('/api/')) return; // API is always network
  if (e.request.method !== 'GET') return;
  // The first load arrives as /?token=… — never let that URL become a cache key.
  if (url.searchParams.has('token')) return;
  // Network-first: when online you always get the newest version. The cache
  // is only the offline fallback. For page navigations with no exact match,
  // fall back to the app shell (the app is one page, so any route works).
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (cacheable(e.request, res)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(e.request);
        if (hit) return hit;
        if (e.request.mode === 'navigate') {
          const shell = await caches.match(new URL('./', self.registration.scope).href);
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});

self.addEventListener('push', (e) => {
  let data = { title: 'REBORN', body: 'Check the app.', tag: 'reborn' };
  try { data = e.data.json(); } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
    })
  );
});

/* the browser can rotate a push subscription on its own — re-subscribe and
   re-register it, otherwise reminders go silently dead until the user
   re-arms them from the app */
function urlB64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/* The API needs a bearer token and a worker can't read localStorage, so the
   page mirrors the token into this cache for us. */
async function authHeaders(extra) {
  try {
    const hit = await caches.open(AUTH_CACHE).then((c) => c.match('/__reborn_token'));
    if (hit) {
      const token = (await hit.text()).trim();
      if (token) return { ...extra, Authorization: 'Bearer ' + token };
    }
  } catch { /* fall through — the request will 401 and be logged */ }
  return extra;
}

self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(
    authHeaders({})
      .then((headers) =>
        fetch('/api/vapid', { headers })
          .then((r) => r.json())
          .then(({ key }) =>
            self.registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlB64ToUint8(key),
            })
          )
          .then((sub) =>
            fetch('/api/subscribe', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(sub.toJSON()),
            })
          )
      )
      .catch((err) => console.error('resubscribe failed', err))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return clients.openWindow('/');
    })
  );
});
