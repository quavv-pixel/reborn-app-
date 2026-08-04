// Bridge between the Weekly tab and a Claude session that has an Instacart
// connection — Vercel serverless function at /api/weekly-send.
//
// The app has no backend database by design; nothing about your data lives
// anywhere but your own browser. This one exception exists solely to hand a
// picked shopping list to Claude, which polls for it on a schedule and adds
// the items to a real Instacart cart directly (a separate mechanism from the
// /api/instacart Developer Platform integration, which needs its own key
// Instacart currently isn't issuing). The stored list expires on its own
// (see EXPIRE_SECONDS) whether or not anything ever reads it.
//
// Needs KV_REST_API_URL and KV_REST_API_TOKEN — set automatically once you
// connect a Vercel KV / Upstash Redis store from the project's Storage tab.
// Without them this returns 501 and the app falls back to Copy for Claude.

import { clientIp, checkAccess } from "./_util.js";

export const config = { maxDuration: 15 };

const KEY = "weekly:pending";
const EXPIRE_SECONDS = 3600; // 1 hour — matches the polling cadence
const MAX_ITEMS = 100;

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

// Trust nothing from the client — this ends up quick-added to a real cart.
function cleanItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.name || "").trim().slice(0, 80);
    if (!name) continue;
    const qty = Number(item.quantity);
    out.push({ name, quantity: Number.isFinite(qty) && qty > 0 ? Math.min(qty, 20) : 1 });
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST a { items } body to this endpoint." });
  }

  if (!checkAccess(req, res)) return;

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) {
    return res.status(501).json({
      error: "not_configured",
      message: "Send-to-Claude isn't set up yet — connect a KV store in Vercel's Storage tab to enable this. Copy for Claude works meanwhile.",
    });
  }

  const ip = clientIp(req);
  if (throttled(ip)) {
    return res.status(429).json({ error: "rate_limited", message: "Slow down a moment, then try again." });
  }

  const items = cleanItems(req.body?.items);
  if (!items.length) return res.status(400).json({ error: "No items to send." });

  const title = String(req.body?.title || "This week's shopping list").slice(0, 80);
  const payload = JSON.stringify({ title, items, sentAt: new Date().toISOString() });

  try {
    const upstream = await fetch(`${kvUrl}/set/${KEY}`, {
      method: "POST",
      headers: { authorization: `Bearer ${kvToken}` },
      body: payload,
    });
    if (!upstream.ok) throw new Error(String(upstream.status));
    await fetch(`${kvUrl}/expire/${KEY}/${EXPIRE_SECONDS}`, {
      headers: { authorization: `Bearer ${kvToken}` },
    });
  } catch {
    return res.status(502).json({ error: "Couldn't save the list. Try again." });
  }

  return res.status(200).json({ ok: true });
}
