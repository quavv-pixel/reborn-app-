// Discord hourly-code poster — Vercel Edge Function at /api/discord-post.
// When pinged (by a free external cron like cron-job.org, or by hand), it
// posts the current hourly guest code into a Discord channel via a channel
// webhook. Lock the channel to your Patreon supporter role and subscribers
// get the fresh code every hour without you (or Claude credits) involved.
//
// Setup (see PORTED_SETUP.md):
//   1. Discord channel -> Edit channel -> Integrations -> Webhooks -> New
//      Webhook -> Copy Webhook URL
//   2. Env vars on Vercel: DISCORD_WEBHOOK_URL (that URL) and CRON_KEY
//      (any random string you make up)
//   3. cron-job.org (free): schedule an hourly GET to
//      https://<your-app>/api/discord-post?key=<CRON_KEY>
//      at minute 0 of every hour.
//
// The middleware deliberately skips /api/*; this endpoint authenticates
// with CRON_KEY instead so Discord/cron traffic never sees the login box.

import { hourlyCode, timingSafeEqual } from '../middleware.js';

export const config = { runtime: 'edge' };

const DEFAULT_ROTATE_SECRET = 'reborn-rotate-default';
const HOUR_MS = 3600000;

export default async function handler(request) {
  const env = (typeof process !== 'undefined' && process.env) || {};
  const webhook = env.DISCORD_WEBHOOK_URL;
  const cronKey = env.CRON_KEY;
  if (!webhook || !cronKey) {
    return new Response('Discord poster not configured (set DISCORD_WEBHOOK_URL and CRON_KEY).', { status: 200 });
  }

  let key = '';
  try { key = new URL(request.url).searchParams.get('key') || ''; } catch {}
  if (!timingSafeEqual(key, cronKey)) return new Response('forbidden', { status: 403 });

  const secret = env.REBORN_ROTATE_SECRET || DEFAULT_ROTATE_SECRET;
  const now = Date.now();
  const code = await hourlyCode(secret, now, 0);
  const minsLeft = Math.max(1, 60 - Math.floor((now % HOUR_MS) / 60000));

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: `🔑 **REBORN guest code** — this hour: \`${code}\`\nSign in with any name + this code. Changes in ${minsLeft} min.`,
      }),
    });
    return new Response(res.ok ? 'posted' : `discord answered ${res.status}`, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return new Response('could not reach discord', { status: 502 });
  }
}
