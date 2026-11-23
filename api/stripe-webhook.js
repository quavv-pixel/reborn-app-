// Stripe webhook — Vercel Edge Function at /api/stripe-webhook.
//
// When someone pays (or cancels, or a renewal fails), Stripe POSTs an
// "event" here. We check Stripe's signature so nobody can fake a "paid"
// event, then record the result in Supabase's `entitlements` table, which
// is what unlocks cloud sync (see can_sync() in supabase/schema.sql).
//
// How we know WHICH account paid: the app's "Upgrade to Pro" button opens
// your Stripe Payment Link with ?client_reference_id=<their account id>.
// Stripe hands that id back to us in checkout.session.completed.
//
// Env vars (Vercel -> Settings -> Environment Variables), all server-only.
// NEVER give these a VITE_ prefix — that would publish them in the app:
//   STRIPE_WEBHOOK_SECRET      whsec_... from Stripe -> Developers -> Webhooks
//   SUPABASE_URL               https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  Supabase -> Project Settings -> API -> service_role
//
// Events to send here (choose them when adding the endpoint in Stripe):
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted

export const config = { runtime: 'edge' };

const TOLERANCE_SEC = 300; // reject signatures older than 5 minutes (replays)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// past_due = Stripe is still retrying the card; keep access during the retries.
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Stripe's scheme: header "t=<unix seconds>,v1=<hex>[,v1=...]", where
// hex = HMAC-SHA256(secret, "<t>.<raw body>"). Docs: stripe.com/docs/webhooks/signatures
export async function verifyStripeSignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = header.split(',').map(p => p.trim().split('='));
  const t = Number((parts.find(([k]) => k === 't') || [])[1]);
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(t) || !sigs.length) return false;
  if (Math.abs(nowSec - t) > TOLERANCE_SEC) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return sigs.some(s => safeEqual(s, expected));
}

// Turns a Stripe event into "what to write to entitlements". Returns null
// for events we don't need. Pure function — easy to test.
export function planUpdateFor(event) {
  const o = event && event.data && event.data.object;
  if (!o) return null;
  const now = new Date().toISOString();

  if (event.type === 'checkout.session.completed') {
    if (!UUID.test(o.client_reference_id || '')) {
      return { error: 'checkout has no valid client_reference_id — was the Payment Link opened from the app?' };
    }
    if (o.payment_status && o.payment_status === 'unpaid') return null; // e.g. delayed bank payments
    return {
      match: { user_id: o.client_reference_id },
      upsert: true,
      row: {
        user_id: o.client_reference_id,
        active: true,
        // mode 'payment' = one-time "lifetime" purchase; 'subscription' = monthly/yearly
        status: o.mode === 'payment' ? 'lifetime' : 'active',
        stripe_customer_id: o.customer || null,
        stripe_subscription_id: o.subscription || null,
        updated_at: now,
      },
    };
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    if (!o.customer) return null;
    const deleted = event.type === 'customer.subscription.deleted';
    // Newer Stripe API versions moved current_period_end onto the items.
    const periodEnd = o.current_period_end
      || (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end);
    return {
      match: { stripe_customer_id: o.customer },
      upsert: false,
      row: {
        active: !deleted && ACTIVE_STATUSES.has(o.status),
        status: deleted ? 'canceled' : o.status,
        stripe_subscription_id: o.id || null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: now,
      },
    };
  }
  return null;
}

// Writes to Supabase's REST API with the service role key (which bypasses
// row-level security — that's why it must stay server-side).
export async function writePlan(update, { url, serviceKey, fetchFn = fetch }) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
  };
  const [[col, val]] = Object.entries(update.match);
  const res = update.upsert
    ? await fetchFn(`${url}/rest/v1/entitlements?on_conflict=user_id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(update.row),
      })
    : await fetchFn(`${url}/rest/v1/entitlements?${col}=eq.${encodeURIComponent(val)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(update.row),
      });
  if (!res.ok) throw new Error(`Supabase answered ${res.status}: ${await res.text()}`);
}

export default async function handler(request, deps = {}) {
  const env = deps.env || (typeof process !== 'undefined' && process.env) || {};
  if (request.method !== 'POST') return new Response('Stripe webhook endpoint.', { status: 200 });

  const secret = env.STRIPE_WEBHOOK_SECRET;
  const url = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) {
    // 500 makes Stripe retry later, so no payment is lost while you finish setup.
    return new Response('Payments not configured: set STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.', { status: 500 });
  }

  const raw = await request.text(); // the EXACT bytes Stripe signed
  if (!(await verifyStripeSignature(raw, request.headers.get('stripe-signature'), secret, deps.nowSec))) {
    return new Response('Bad signature.', { status: 400 });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return new Response('Bad JSON.', { status: 400 }); }

  const update = planUpdateFor(event);
  if (!update) return new Response('Ignored.', { status: 200 });
  if (update.error) {
    console.error('stripe-webhook:', update.error, event.id);
    return new Response(update.error, { status: 200 }); // retrying won't fix it; don't make Stripe retry
  }
  try {
    await writePlan(update, { url, serviceKey, fetchFn: deps.fetchFn });
  } catch (e) {
    console.error('stripe-webhook: write failed', e.message);
    return new Response('Could not save — Stripe will retry.', { status: 500 });
  }
  return new Response('OK', { status: 200 });
}
