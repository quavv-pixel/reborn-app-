/* REBORN service worker — offline shell fallback + real background push.
   This exists because the in-page Notification API only fires while the
   tab is alive; a service worker is what lets the OS/browser wake this app
   for a push event even when nothing is open. */
const CACHE = 'reborn-v1';
const AUTH_CACHE = 'reborn-auth'; // token store — survives every cache version bump

self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
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
  if (url.pathname.startsWith('/api/')) return; // API is always network
  if (e.request.method !== 'GET') return;
  // The first load arrives as /?token=… — never let that URL become a cache key.
  if (url.searchParams.has('token')) return;
  // network-first: updates always land; cache only as offline fallback. There's
  // no fixed precache list here (Vite's build hashes filenames per build), so
  // the cache fills in as pages/assets are actually visited.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
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
