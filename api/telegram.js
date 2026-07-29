// Telegram admin bot — Vercel Edge Function at /api/telegram.
// Private: replies ONLY to the Telegram user in TELEGRAM_ADMIN_ID; everyone
// else gets silence. Runs on the Edge runtime (the Node runtime's outbound
// fetches to Telegram were the timeout culprit in the previous project).
//
// Commands:
//   /code    current hourly guest code + minutes left + next code
//   /next    the next 3 upcoming codes
//   /status  checks whether the site is up (the locked door counts as up)
//   /start | /help   list the commands
//
// One-time setup (see PORTED_SETUP.md):
//   1. Env vars on Vercel: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_ID,
//      TELEGRAM_WEBHOOK_SECRET (any random string you make up)
//   2. Point the bot's webhook at this endpoint:
//      https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-app>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
//
// The middleware deliberately skips /api/* — Telegram authenticates with
// its secret_token header instead of the site's password gate.

import { hourlyCode, timingSafeEqual } from '../middleware.js';

export const config = { runtime: 'edge' };

const DEFAULT_ROTATE_SECRET = 'reborn-rotate-default';
const HOUR_MS = 3600000;

async function tg(token, method, payload) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function buildReply(text, env, requestUrl) {
  const secret = env.REBORN_ROTATE_SECRET || DEFAULT_ROTATE_SECRET;
  const now = Date.now();
  const minsLeft = Math.max(1, 60 - Math.floor((now % HOUR_MS) / 60000));
  const cmd = (text || '').trim().split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/code') {
    const cur = await hourlyCode(secret, now, 0);
    const next = await hourlyCode(secret, now, 1);
    return `🔑 REBORN guest code\n\nNow: ${cur}\n(${minsLeft} min left)\n\nNext hour: ${next}`;
  }
  if (cmd === '/next') {
    const lines = [];
    for (let i = 1; i <= 3; i++) lines.push(`+${i}h:  ${await hourlyCode(secret, now, i)}`);
    return `🔮 Upcoming codes\n\n${lines.join('\n')}`;
  }
  if (cmd === '/status') {
    let origin = 'https://reborn-app-nine.vercel.app';
    try { origin = new URL(requestUrl).origin; } catch {}
    try {
      const res = await fetch(origin + '/', { redirect: 'manual' });
      // 401 means the password gate answered — the site is alive and locked,
      // exactly as it should be. 2xx/3xx also count as up.
      const up = res.status === 401 || (res.status >= 200 && res.status < 400);
      return up ? `✅ Site is up (HTTP ${res.status}) — door locked and working.` : `⚠️ Site answered HTTP ${res.status} — worth a look.`;
    } catch (e) {
      return '🔴 Site did not answer at all — check Vercel.';
    }
  }
  return 'Commands:\n/code — current hourly guest code\n/next — next 3 codes\n/status — is the site up?';
}

export default async function handler(request) {
  const env = (typeof process !== 'undefined' && process.env) || {};
  const token = env.TELEGRAM_BOT_TOKEN;
  const adminId = env.TELEGRAM_ADMIN_ID;
  if (!token || !adminId) {
    return new Response('Telegram bot not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_ID).', { status: 200 });
  }
  if (request.method !== 'POST') {
    return new Response('This is the Telegram webhook endpoint.', { status: 200 });
  }

  // Telegram proves it's really Telegram with the secret_token we register
  // at setWebhook time. If one is configured, enforce it.
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const got = request.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!timingSafeEqual(got, webhookSecret)) return new Response('forbidden', { status: 403 });
  }

  let update;
  try { update = await request.json(); } catch { return new Response('ok', { status: 200 }); }
  const msg = update && (update.message || update.edited_message);
  const fromId = msg && msg.from && msg.from.id;
  const chatId = msg && msg.chat && msg.chat.id;
  const text = msg && msg.text;

  // Anyone who isn't the admin gets silence — the bot doesn't even admit
  // it exists. Always 200 so Telegram doesn't retry.
  if (!msg || !chatId || String(fromId) !== String(adminId)) {
    return new Response('ok', { status: 200 });
  }

  const reply = await buildReply(text, env, request.url);
  try { await tg(token, 'sendMessage', { chat_id: chatId, text: reply }); } catch {}
  return new Response('ok', { status: 200 });
}
