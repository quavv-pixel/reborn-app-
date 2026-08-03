// Instacart shopping list — Vercel serverless function at /api/instacart.
//
// Takes the week's list and hands it to Instacart's Developer Platform
// "create shopping list page" endpoint, which returns a URL. That URL opens a
// shopping list page on Instacart Marketplace and deep-links into the Instacart
// app on iOS and Android.
//
// What this does NOT do: read anything. The Developer Platform API is
// push-only. It can create a list page for you; it cannot see your cart, your
// order history, or what's already in your kitchen. Nothing comes back but a
// link.
//
// Setup (see README):
//   1. Sign up for the Instacart Developer Platform and create a key in the
//      developer dashboard. A *development* key is self-service and works
//      immediately against connect.dev.instacart.tools. A *production* key
//      (real shoppers, connect.instacart.com) goes through Instacart's review.
//   2. Env vars on Vercel: INSTACART_API_KEY, and INSTACART_ENV=production
//      once you have a production key. Defaults to development.
//
// Without INSTACART_API_KEY this returns 501 with a plain explanation and the
// app falls back to "Copy for Claude", which needs no setup at all.

export const config = { maxDuration: 30 };

const HOSTS = {
  development: "https://connect.dev.instacart.tools",
  production: "https://connect.instacart.com",
};
const PATH = "/idp/v1/products/products_link";
const MAX_ITEMS = 100;

// Same best-effort throttle as /api/deals. This endpoint is unauthenticated —
// there is no login in this app to gate on — so anyone who finds the URL can
// make list pages against your key. Instacart isn't billed per call, so the
// exposure is your rate limit rather than your wallet, but the cap keeps a
// stuck client from burning it. See the README if you want a real gate.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map();

function throttled(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
  }
  return false;
}

// Trust nothing from the client — this payload is spent against a real key.
function cleanLineItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.name || "").trim().slice(0, 120);
    if (!name) continue;
    const line = { name };
    const qty = Number(item.quantity);
    if (Number.isFinite(qty) && qty > 0) line.quantity = Math.min(qty, 999);
    if (item.unit) line.unit = String(item.unit).trim().slice(0, 32);
    if (item.display_text) line.display_text = String(item.display_text).trim().slice(0, 160);
    out.push(line);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST a { line_items } body to this endpoint." });
  }

  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: "not_configured",
      message: 'Instacart isn\'t set up yet. Add INSTACART_API_KEY in Vercel to enable this — "Copy for Claude" works meanwhile.',
    });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return res.status(429).json({ error: "rate_limited", message: "Slow down a moment, then try again." });
  }

  const lineItems = cleanLineItems(req.body?.line_items);
  if (!lineItems.length) return res.status(400).json({ error: "No items to send." });

  const host = HOSTS[process.env.INSTACART_ENV === "production" ? "production" : "development"];
  const title = String(req.body?.title || "Skinny Chef week").slice(0, 80);

  let upstream;
  try {
    upstream = await fetch(host + PATH, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        title,
        link_type: "shopping_list",
        expires_in: 30,
        line_items: lineItems,
      }),
    });
  } catch {
    return res.status(502).json({ error: "Couldn't reach Instacart." });
  }

  const text = await upstream.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* non-JSON error body */ }

  if (!upstream.ok) {
    // Pass Instacart's own status through so a bad key (401) reads differently
    // from a malformed payload (422) — but never echo the key back.
    return res.status(502).json({
      error: "instacart_error",
      status: upstream.status,
      message: (data && (data.message || data.error)) || text.slice(0, 200) || "Instacart rejected the request.",
    });
  }

  // Instacart documents this as products_link_url. The fallbacks cost nothing
  // and keep the button working if the field is ever named differently.
  const url = data && (data.products_link_url || data.url || data.link || data.products_link);
  if (!url) return res.status(502).json({ error: "Instacart returned no link." });

  return res.status(200).json({ url });
}
