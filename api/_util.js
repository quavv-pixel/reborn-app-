// Shared helpers for the two serverless functions. Node/CommonJS-free ESM,
// imported by both api/deals.js and api/instacart.js.

/**
 * The caller's IP, for the best-effort rate limiter.
 *
 * X-Forwarded-For is a comma-separated chain: client-declared value first,
 * each proxy in front of us appends the address it received the request
 * from. The FIRST entry is whatever the client put there — trivially
 * spoofable, one header and the rate limit resets every request. Vercel's
 * edge appends the real client address as the LAST entry before the header
 * reaches this function, so that's the one worth trusting.
 */
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (!xff) return "unknown";
  const parts = String(xff).split(",").map(s => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || "unknown";
}

/**
 * Optional shared-secret gate. If APP_ACCESS_KEY is unset (the default),
 * every request passes — zero configuration, zero friction. If it's set,
 * requests must carry a matching x-app-key header or get a 401 the frontend
 * knows how to respond to (prompt once, remember on this device).
 *
 * This exists because these two endpoints are otherwise open to the whole
 * internet: there's no login anywhere in this app to piggyback on. Without
 * this gate, anyone who finds the URL can spend the Anthropic key's usage or
 * the Instacart key's rate limit — not read any of your data (there isn't
 * any on the server to read), but spend what the keys allow.
 */
export function checkAccess(req, res) {
  const required = process.env.APP_ACCESS_KEY;
  if (!required) return true;
  const got = req.headers["x-app-key"];
  if (got && got === required) return true;
  res.status(401).json({
    error: "access_key_required",
    message: "Enter the app passphrase to use this.",
  });
  return false;
}
