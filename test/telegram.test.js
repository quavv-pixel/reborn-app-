/* Fail-closed tests for the Telegram webhook. No Telegram network calls. */
import assert from 'node:assert/strict';
import handler from '../api/telegram.js';

let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

const SECRET = 'a-long-test-webhook-secret';
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const calls = [];
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_ADMIN_ID = '12345';
process.env.REBORN_ROTATE_SECRET = 'test-rotate-secret';
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response('{}', { status: 200 });
};
const makeRequest = (secret) => new Request('https://reborn.test/api/telegram', {
  method: 'POST',
  headers: secret === undefined ? {} : { 'x-telegram-bot-api-secret-token': secret },
  body: JSON.stringify({ message: { from: { id: 12345 }, chat: { id: 12345 }, text: '/code' } }),
});

console.log('\nTelegram webhook');
await test('missing webhook secret fails closed without sending a message', async () => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  calls.length = 0;
  const res = await handler(makeRequest());
  assert.strictEqual(res.status, 503);
  assert.strictEqual(calls.length, 0);
});
await test('wrong webhook secret is rejected', async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  calls.length = 0;
  const res = await handler(makeRequest('wrong-secret'));
  assert.strictEqual(res.status, 403);
  assert.strictEqual(calls.length, 0);
});
await test('valid webhook secret allows the configured admin request', async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  calls.length = 0;
  const res = await handler(makeRequest(SECRET));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.telegram\.org\//);
});

for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
for (const [key, value] of Object.entries(originalEnv)) process.env[key] = value;
globalThis.fetch = originalFetch;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
