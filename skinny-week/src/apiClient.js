// Frontend half of the optional access-key gate (see api/_util.js).
//
// If the deploy has APP_ACCESS_KEY set, both /api/deals and /api/instacart
// answer 401 { error: "access_key_required" } until a matching x-app-key
// header is sent. This calls the endpoint, and on that specific 401, prompts
// once, remembers the answer on this device, and retries automatically. If
// APP_ACCESS_KEY isn't set on the server, the header is harmless extra noise
// and this never prompts — zero friction in the default, unlocked setup.

const KEY_STORAGE = "skinny-week:app-key";

function readStoredKey() {
  try { return localStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; }
}
function storeKey(value) {
  try { localStorage.setItem(KEY_STORAGE, value); } catch { /* private mode */ }
}

async function post(path, body, appKey) {
  const headers = { "Content-Type": "application/json" };
  if (appKey) headers["x-app-key"] = appKey;
  const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  return { res, data };
}

/**
 * POST JSON to one of the API routes, transparently handling the access-key
 * gate. Returns { ok, data, status }. Never throws for HTTP-level failures —
 * only for genuine network errors, so callers can `catch` those separately
 * from "the server said no."
 */
export async function callApi(path, body) {
  let appKey = readStoredKey();
  let { res, data } = await post(path, body, appKey);

  if (res.status === 401 && data?.error === "access_key_required") {
    const entered = window.prompt("This app is passphrase-protected. Enter it to continue:");
    if (!entered) return { ok: false, status: 401, data };
    appKey = entered.trim();
    ({ res, data } = await post(path, body, appKey));
    if (res.ok) storeKey(appKey); // only remember it once it's actually accepted
  }

  return { ok: res.ok, status: res.status, data };
}
