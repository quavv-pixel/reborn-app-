// Accounts + cloud sync, wired to Supabase.
//
// Everything here is OFF unless both VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are set at build time (Vercel -> Settings ->
// Environment Variables). Off means the app behaves exactly as before:
// local-only, no account UI, and the Supabase library is never downloaded.
//
// Pieces:
//   engine.js    decides what to upload/download (pure logic, unit-tested)
//   this file    talks to Supabase: sign in/out, and the engine's "remote"
//   storage.js   tells us about every local change (markChanged)
//
// UI components subscribe() to get a `state` snapshot whenever it changes.
import { createSyncEngine, mergeProfileLists } from './engine.js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
const PORTAL_URL = import.meta.env.VITE_STRIPE_PORTAL_URL;

export const cloudConfigured = !!(URL_ && ANON_KEY);

const META_KEY = 'ops-log:__sync_meta__';
const DATA_KEY = 'ops-log:__all__'; // same blob storage.js uses

// ---- local side of the engine ---------------------------------------------
const local = {
  readAll() { try { return JSON.parse(localStorage.getItem(DATA_KEY)) || {}; } catch { return {}; } },
  writeAll(o) { try { localStorage.setItem(DATA_KEY, JSON.stringify(o)); } catch {} },
  readMeta() { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; } },
  writeMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch {} },
};

// ---- Supabase client, loaded only when configured --------------------------
let clientPromise = null;
function client() {
  // Written out in full (not via cloudConfigured) so that when the keys are
  // missing, the build sees a constant `true` here and drops the Supabase
  // import entirely — no unused 59 KB file shipped or pre-downloaded.
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return Promise.reject(new Error('Cloud sync is not configured'));
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(URL_, ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'reborn-auth' },
      }));
  }
  return clientPromise;
}

export class NeedsPaymentError extends Error {}

// ---- remote side of the engine ---------------------------------------------
const remote = {
  async pull() {
    const sb = await client();
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('kv').select('key,value,updated_at_ms').range(from, from + 999);
      if (error) throw error;
      for (const r of data) out.push({ key: r.key, value: r.value, t: Number(r.updated_at_ms) });
      if (data.length < 1000) return out;
    }
  },
  async push(rows) {
    const sb = await client();
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.rpc('push_kv', { rows: rows.slice(i, i + 500) });
      if (error) {
        if (error.hint === 'upgrade' || /subscription/i.test(error.message || '')) {
          throw new NeedsPaymentError(error.message);
        }
        throw error;
      }
    }
  },
};

const engine = createSyncEngine({ local, remote, merge: { 'profiles-list': mergeProfileLists } });

// ---- observable state -------------------------------------------------------
// status: off | signed-out | syncing | synced | offline | error | needs-payment
let state = {
  configured: cloudConfigured,
  status: cloudConfigured ? 'signed-out' : 'off',
  user: null,          // { id, email }
  lastSyncedAt: null,
  error: '',
  paid: false,
  requirePayment: false,
  recovery: false,     // true after clicking a password-reset email link
  remoteChanged: false // data changed from another device while the app was open
};
const listeners = new Set();
function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn(state));
}
export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---- syncing ------------------------------------------------------------------
let running = null;
let again = false;
// After the first sync at startup, any download that changes data means
// another device edited while this one was open: show the Refresh banner.
// (Sign-in reloads the page instead, so it doesn't need the banner.)
let bannerArmed = false;
export async function syncNow() {
  if (!state.user) return { changed: [] };
  if (running) { again = true; return running; } // one at a time; queue one more
  running = (async () => {
    const wasBlocked = state.status === 'needs-payment';
    set({ status: 'syncing', error: '' });
    try {
      const { changed } = await engine.sync();
      set({ status: 'synced', lastSyncedAt: Date.now() });
      if (wasBlocked) refreshPlan(); // they just paid — update the Pro badge
      if (changed.length && bannerArmed) set({ remoteChanged: true });
      return { changed };
    } catch (e) {
      if (e instanceof NeedsPaymentError) set({ status: 'needs-payment' });
      else if (!navigator.onLine) set({ status: 'offline' });
      else set({ status: 'error', error: e.message || String(e) });
      return { changed: [] };
    } finally {
      running = null;
      if (again) { again = false; setTimeout(syncNow, 0); }
    }
  })();
  return running;
}

// storage.js calls this after every local write/delete.
let flushTimer = null;
export function noteLocalChange(key) {
  if (!cloudConfigured) return;
  engine.markChanged(key);
  if (!state.user) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(syncNow, 2000); // batch a burst of edits into one upload
}

export async function refreshPlan() {
  try {
    const sb = await client();
    const [{ data: ent }, { data: cfg }] = await Promise.all([
      sb.from('entitlements').select('active').maybeSingle(),
      sb.from('app_config').select('require_payment').maybeSingle(),
    ]);
    set({ paid: !!(ent && ent.active), requirePayment: !!(cfg && cfg.require_payment) });
  } catch { /* plan info is cosmetic; sync itself is enforced server-side */ }
}

// Called once from main.jsx before the app renders, so the first screen
// already shows the latest data from the cloud.
let started = false;
export async function startCloud() {
  if (!cloudConfigured || started) return;
  started = true;
  const sb = await client();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
    if (event === 'SIGNED_OUT') set({ user: null, status: 'signed-out', paid: false });
    if (session && session.user && (!state.user || state.user.id !== session.user.id)) {
      set({ user: { id: session.user.id, email: session.user.email } });
    }
  });
  // Pick up changes from other devices whenever the app comes back to the
  // front, and retry when the connection returns. (syncNow does nothing
  // while signed out, so these are safe to register up front.)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
  window.addEventListener('online', () => syncNow());

  const { data } = await sb.auth.getSession();
  const user = data.session && data.session.user;
  if (!user) { bannerArmed = true; return; }
  set({ user: { id: user.id, email: user.email } });
  await syncNow();
  bannerArmed = true;
  refreshPlan();
}

// ---- account actions (used by AccountPanel) -----------------------------------
function siteUrl() { return window.location.origin + import.meta.env.BASE_URL; }

async function afterSignIn(user) {
  set({ user: { id: user.id, email: user.email } });
  engine.adoptExistingData(); // upload whatever was already on this phone
  bannerArmed = false;
  const { changed } = await syncNow();
  bannerArmed = true;
  await refreshPlan();
  // New profiles/data arrived: reload so every screen reads the fresh copy.
  if (changed.length) window.location.reload();
}

export async function signUp(email, password) {
  const sb = await client();
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: siteUrl() } });
  if (error) throw error;
  if (!data.session) return { needsConfirmation: true }; // Supabase sent a confirm-your-email link
  await afterSignIn(data.session.user);
  return { needsConfirmation: false };
}

export async function signIn(email, password) {
  const sb = await client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await afterSignIn(data.user);
}

// keepData=false wipes this phone's REBORN data too (for shared devices).
export async function signOut({ keepData = true } = {}) {
  const sb = await client();
  await syncNow(); // last upload before leaving
  await sb.auth.signOut();
  localStorage.removeItem(META_KEY); // next sign-in re-adopts whatever is here
  if (!keepData) localStorage.removeItem(DATA_KEY);
  set({ user: null, status: 'signed-out', paid: false, lastSyncedAt: null });
  if (!keepData) window.location.reload();
}

export async function sendPasswordReset(email) {
  const sb = await client();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() });
  if (error) throw error;
}

export async function setNewPassword(password) {
  const sb = await client();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
  set({ recovery: false });
}

export function dismissRecovery() { set({ recovery: false }); }

// Re-checks the signed-in user's ACCOUNT password (used before resetting a
// forgotten profile password). Returns true/false; never throws for a
// simple wrong password.
export async function verifyAccountPassword(password) {
  if (!state.user || !state.user.email) return false;
  const sb = await client();
  const { data, error } = await sb.auth.signInWithPassword({ email: state.user.email, password });
  return !error && !!data.user && data.user.id === state.user.id;
}

// ---- payments (Stripe Payment Link — see PAYMENTS in SETUP_GUIDE.md) ----------
export const paymentsConfigured = !!PAYMENT_LINK;
export function upgradeUrl() {
  if (!PAYMENT_LINK || !state.user) return null;
  // client_reference_id tells the Stripe webhook WHICH account just paid.
  const u = new URL(PAYMENT_LINK);
  u.searchParams.set('client_reference_id', state.user.id);
  if (state.user.email) u.searchParams.set('prefilled_email', state.user.email);
  return u.toString();
}
export function manageUrl() { return PORTAL_URL || null; }
