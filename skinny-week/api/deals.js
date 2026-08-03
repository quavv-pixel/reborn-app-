// This week's ALDI ad — Vercel serverless function at /api/deals.
//
// The browser never talks to Anthropic directly. The version of this that ran
// inside a Claude artifact called api.anthropic.com from the client with no
// auth header at all; on a real domain that returns 401, and adding the key to
// make it work would ship the key to every visitor. So the call lives here,
// server-side, and ANTHROPIC_API_KEY stays on the server.
//
// Claude answers this with the web_search tool, so the prices come from
// searching the current ad rather than from the model's memory. That is the
// only reason this endpoint is worth having — a model asked for grocery prices
// without search would invent plausible ones.
//
// ⚠️ Every request bills real API usage to your Anthropic account, and a web
// search costs more than a plain message. See the README before enabling.

import Anthropic from "@anthropic-ai/sdk";
import { clientIp, checkAccess } from "./_util.js";

// Web search takes real time. Vercel's default is 10s, which this will exceed.
export const config = { maxDuration: 60 };

const MAX_DEALS = 8;
const MAX_STORE_LEN = 60;

// Best-effort throttle. Serverless instances are ephemeral and there may be
// several at once, so this is a speed bump rather than a real rate limiter —
// it stops a stuck retry loop from running up a bill, not a determined caller.
// A hard cap needs a shared store (Vercel KV, Upstash); see the README.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function throttled(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing without bound across a warm instance's lifetime.
  if (hits.size > 500) {
    for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
  }
  return false;
}

// The store string is interpolated straight into the prompt. Rather than just
// stripping newlines, only allow the characters a place name actually needs —
// this closes off prompt-injection attempts ("ignore previous instructions…")
// at the character level instead of trying to pattern-match phrasings.
function cleanStore(raw) {
  return String(raw || "")
    .replace(/[^a-zA-Z0-9,.\-'\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STORE_LEN);
}

// Pull the JSON array out of Claude's text. Structured outputs would be tidier,
// but they're incompatible with the citations that web search attaches to its
// results, so the array is parsed out of the prose instead.
function parseDeals(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  let parsed;
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(d => d && typeof d === "object" && d.item)
    .slice(0, MAX_DEALS)
    .map(d => ({
      item: String(d.item).slice(0, 80),
      price: d.price ? String(d.price).slice(0, 20) : "",
      note: d.note ? String(d.note).slice(0, 40) : "",
    }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST a { store } body to this endpoint." });
  }

  if (!checkAccess(req, res)) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: "not_configured",
      message: "Deals aren't set up. Add ANTHROPIC_API_KEY in Vercel to enable this — everything else in the app works without it.",
    });
  }

  const ip = clientIp(req);
  if (throttled(ip)) {
    return res.status(429).json({ error: "rate_limited", message: "Slow down a moment, then try again." });
  }

  const store = cleanStore(req.body?.store);
  if (!store) return res.status(400).json({ error: "Tell me roughly where to look." });

  const client = new Anthropic({ apiKey });

  const messages = [{
    role: "user",
    content: `Search the web for this week's ALDI weekly ad specials near ${store}. Return ONLY a raw JSON array, no markdown fences and no preamble, of up to ${MAX_DEALS} objects with keys "item" (short product name), "price" (string like "$2.49"), and "note" (a few words, e.g. "per lb" or "Sun-Sat only"). Only include items you actually found in a current ad — if you cannot find current specials, return [].`,
  }];

  try {
    let response = await client.messages.create({
      model: "claude-opus-5",
      // Thinking is on by default on this model and shares the max_tokens
      // budget with the reply, so this is sized well above the JSON itself.
      max_tokens: 8000,
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      messages,
    });

    // A server-side tool loop that hits its iteration cap comes back as
    // pause_turn; re-sending the conversation resumes it where it left off.
    let continuations = 0;
    while (response.stop_reason === "pause_turn" && continuations < 3) {
      messages.push({ role: "assistant", content: response.content });
      response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 8000,
        output_config: { effort: "low" },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
        messages,
      });
      continuations++;
    }

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ deals: [], refused: true });
    }

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .replace(/```json|```/g, "");

    const deals = parseDeals(text);
    // stop_reason "max_tokens" means the reply was cut off mid-generation —
    // distinct from a clean search that genuinely found nothing, and worth
    // telling the user apart from "no specials this week" (they're allowed to
    // just try again).
    const truncated = response.stop_reason === "max_tokens" && deals.length === 0;
    return res.status(200).json({ deals, truncated });
  } catch (err) {
    // Surface the shape of the failure without leaking the key or a stack.
    const status = err?.status;
    if (status === 401) return res.status(500).json({ error: "The ANTHROPIC_API_KEY on the server was rejected." });
    if (status === 429) return res.status(429).json({ error: "Anthropic rate limit — try again shortly." });
    return res.status(502).json({ error: "Couldn't reach the ad." });
  }
}
