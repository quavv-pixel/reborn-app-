/* Tests for api/stripe-webhook.js: signature checking, which events unlock
   or lock an account, and what gets written to Supabase. No real Stripe or
   Supabase — signatures are made here with the same algorithm Stripe uses,
   and Supabase is a recording fake fetch.
   Run: node test/stripe-webhook.test.js (also part of `npm test`). */
import assert from 'assert';
import crypto from 'crypto';
import handler, { verifyStripeSignature, planUpdateFor } from '../api/stripe-webhook.js';

let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

const SECRET = 'whsec_test_secret';
const NOW = 1_800_000_000;
const USER = '3f1c2b9e-1111-4222-8333-944455556666';
const sign = (body, t = NOW, secret = SECRET) =>
  `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const ENV = { STRIPE_WEBHOOK_SECRET: SECRET, SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };

function recorder(status = 201) {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({ url, ...init, body: JSON.parse(init.body) }); return new Response(status === 204 ? null : '', { status }); };
  return { calls, fetchFn };
}
const post = (body, sig) => new Request('https://x/api/stripe-webhook', {
  method: 'POST', body, headers: sig === undefined ? {} : { 'stripe-signature': sig },
});
const checkout = (extra = {}) => JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: {
  client_reference_id: USER, customer: 'cus_1', subscription: 'sub_1', mode: 'subscription', payment_status: 'paid', ...extra,
} } });

console.log('\nsignature');
await test('a correctly signed body passes', async () =>
  assert.strictEqual(await verifyStripeSignature('{"a":1}', sign('{"a":1}'), SECRET, NOW), true));
await test('a changed body fails', async () =>
  assert.strictEqual(await verifyStripeSignature('{"a":2}', sign('{"a":1}'), SECRET, NOW), false));
await test('the wrong secret fails', async () =>
  assert.strictEqual(await verifyStripeSignature('x', sign('x', NOW, 'whsec_other'), SECRET, NOW), false));
await test('an old signature (replay) fails', async () =>
  assert.strictEqual(await verifyStripeSignature('x', sign('x', NOW - 600), SECRET, NOW), false));
await test('a missing or junk header fails', async () => {
  assert.strictEqual(await verifyStripeSignature('x', null, SECRET, NOW), false);
  assert.strictEqual(await verifyStripeSignature('x', 'garbage', SECRET, NOW), false);
});
await test('any one matching v1 among several passes (secret rotation)', async () => {
  const good = sign('x').split('v1=')[1];
  assert.strictEqual(await verifyStripeSignature('x', `t=${NOW},v1=deadbeef,v1=${good}`, SECRET, NOW), true);
});

console.log('\nevents -> plan');
await test('checkout completed unlocks the account in client_reference_id', () => {
  const u = planUpdateFor(JSON.parse(checkout()));
  assert.deepStrictEqual(u.match, { user_id: USER });
  assert.strictEqual(u.row.active, true);
  assert.strictEqual(u.row.stripe_customer_id, 'cus_1');
});
await test('one-time payment is recorded as lifetime', () =>
  assert.strictEqual(planUpdateFor(JSON.parse(checkout({ mode: 'payment', subscription: null }))).row.status, 'lifetime'));
await test('checkout without an account id is flagged, not applied', () =>
  assert.ok(planUpdateFor(JSON.parse(checkout({ client_reference_id: null }))).error));
await test('checkout with a non-uuid account id is flagged', () =>
  assert.ok(planUpdateFor(JSON.parse(checkout({ client_reference_id: "x' or 1=1" }))).error));
await test('a still-unpaid checkout does nothing yet', () =>
  assert.strictEqual(planUpdateFor(JSON.parse(checkout({ payment_status: 'unpaid' }))), null));
await test('subscription canceled locks the account', () => {
  const u = planUpdateFor({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'canceled' } } });
  assert.deepStrictEqual(u.match, { stripe_customer_id: 'cus_1' });
  assert.strictEqual(u.row.active, false);
});
await test('past_due keeps access while Stripe retries the card', () =>
  assert.strictEqual(planUpdateFor({ type: 'customer.subscription.updated', data: { object: { customer: 'c', status: 'past_due' } } }).row.active, true));
await test('unpaid (retries exhausted) locks the account', () =>
  assert.strictEqual(planUpdateFor({ type: 'customer.subscription.updated', data: { object: { customer: 'c', status: 'unpaid' } } }).row.active, false));
await test('renewal date is read from either API shape', () => {
  const a = planUpdateFor({ type: 'customer.subscription.updated', data: { object: { customer: 'c', status: 'active', current_period_end: NOW } } });
  const b = planUpdateFor({ type: 'customer.subscription.updated', data: { object: { customer: 'c', status: 'active', items: { data: [{ current_period_end: NOW }] } } } });
  assert.strictEqual(a.row.current_period_end, b.row.current_period_end);
  assert.ok(a.row.current_period_end.startsWith('2027-'));
});
await test('unrelated events are ignored', () =>
  assert.strictEqual(planUpdateFor({ type: 'invoice.created', data: { object: {} } }), null));

console.log('\nthe whole endpoint');
await test('valid checkout -> 200 and one upsert to Supabase', async () => {
  const r = recorder(); const body = checkout();
  const res = await handler(post(body, sign(body)), { env: ENV, nowSec: NOW, fetchFn: r.fetchFn });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(r.calls.length, 1);
  assert.strictEqual(r.calls[0].url, 'https://proj.supabase.co/rest/v1/entitlements?on_conflict=user_id');
  assert.strictEqual(r.calls[0].method, 'POST');
  assert.strictEqual(r.calls[0].headers.Authorization, 'Bearer service-key');
  assert.match(r.calls[0].headers.Prefer, /merge-duplicates/);
  assert.strictEqual(r.calls[0].body.user_id, USER);
});
await test('cancellation -> PATCH matched by Stripe customer', async () => {
  const r = recorder(204);
  const body = JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', customer: 'cus_9', status: 'canceled' } } });
  const res = await handler(post(body, sign(body)), { env: ENV, nowSec: NOW, fetchFn: r.fetchFn });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(r.calls[0].method, 'PATCH');
  assert.strictEqual(r.calls[0].url, 'https://proj.supabase.co/rest/v1/entitlements?stripe_customer_id=eq.cus_9');
});
await test('forged event (bad signature) -> 400, Supabase never called', async () => {
  const r = recorder(); const body = checkout();
  const res = await handler(post(body, sign(body, NOW, 'whsec_attacker')), { env: ENV, nowSec: NOW, fetchFn: r.fetchFn });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(r.calls.length, 0);
});
await test('no signature header -> 400', async () => {
  const res = await handler(post(checkout()), { env: ENV, nowSec: NOW, fetchFn: recorder().fetchFn });
  assert.strictEqual(res.status, 400);
});
await test('Supabase down -> 500 so Stripe retries later', async () => {
  const body = checkout();
  const res = await handler(post(body, sign(body)), { env: ENV, nowSec: NOW, fetchFn: recorder(503).fetchFn });
  assert.strictEqual(res.status, 500);
});
await test('not configured yet -> 500 (Stripe keeps retrying, no payment lost)', async () => {
  const body = checkout();
  const res = await handler(post(body, sign(body)), { env: {}, nowSec: NOW });
  assert.strictEqual(res.status, 500);
});
await test('a GET (someone opening the URL) is harmless', async () => {
  const res = await handler(new Request('https://x/api/stripe-webhook'), { env: ENV });
  assert.strictEqual(res.status, 200);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
