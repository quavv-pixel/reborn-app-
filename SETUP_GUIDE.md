# REBORN — Setup Guide

This guide covers everything that needs **your** accounts, money or decisions:
things code can't do for you. Do the parts **in order**. Each one is safe to
stop after; the app keeps working.

Every setting below goes in the same place:
**vercel.com → your project → Settings → Environment Variables → Add**,
then **Deployments → ⋯ on the latest → Redeploy**. Settings only take effect
after a redeploy.

> **Why a redeploy?** Variables starting with `VITE_` are baked into the app's
> code when Vercel builds it. Changing one does nothing until the app is built
> again. Variables *without* `VITE_` are read by the server while it runs, and
> they also need a redeploy on Vercel.

---

## Part 1 — Before you merge (10 min, required)

The code no longer contains a default password. If you merge without doing
this step, the site shows **"Almost there — finish setup"** instead of the app.
That's on purpose: a missing password should lock the door, not leave it open.

1. Make two long random strings. Any password manager's generator works, or
   on a Mac/Linux terminal run this twice:
   ```bash
   openssl rand -hex 24
   ```
2. In Vercel, add:
   | Name | Value |
   |---|---|
   | `REBORN_PASS` | your new master password (the first string, or one you'll remember) |
   | `REBORN_ROTATE_SECRET` | the second string. You never type this; it generates the guest codes |
3. Merge the pull request into `main`. Vercel deploys it automatically.
4. Open the site and sign in with username `reborn` and your new `REBORN_PASS`.

⚠️ Changing `REBORN_ROTATE_SECRET` signs out every device and changes all guest
codes. That's useful if a code ever leaks.

---

## Part 2 — Accounts + cloud sync with Supabase (30 min, free)

**What you get:** a "Back up & sync" box on the profile screen. People make an
account with email and password, and their profiles follow them to any phone or
computer. Without this part, the box never appears and the app stays
local-only, exactly as before.

1. **supabase.com** → Sign up → **New project**. Pick a name, a strong database
   password (save it somewhere), and the region closest to your users. Free plan.
2. Wait about 2 minutes for it to finish setting up.
3. **SQL Editor → New query** → paste the whole contents of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**. You should see
   "Success. No rows returned". It's safe to run again later.
4. **Authentication → URL Configuration**:
   - **Site URL**: your site, e.g. `https://reborn-app-nine.vercel.app`
   - **Redirect URLs**: add the same address
   (These are where "confirm your email" and "reset password" links send people.)
5. **Authentication → Providers → Email**: leave **Confirm email** ON, so
   people must prove they own the address.
6. **Project Settings → API** (also labelled "Data API" / "API Keys"): copy two
   values into Vercel:
   | Vercel name | Supabase value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | the **anon / public** key |
7. Redeploy. Open the app; the **Back up & sync** box appears under the
   profiles.
8. **Test it:** create an account, confirm the email, make a profile and add a
   habit. Then open the site in a private window (or on your phone), sign in,
   and the profile appears.

**Is it safe to put the anon key in the app?** Yes. It's designed to be
public. What protects the data is Row-Level Security in `schema.sql`. Every
row is tied to one account, and the database itself refuses to show it to
anyone else. That's proven by `npm run test:db` (see Part 7). The key you must
**never** publish is the `service_role` key (Part 4).

**Free plan limits:** 50,000 monthly users and 500 MB of database. REBORN
uses a few KB per user, so that's plenty. Note that free projects **pause after
a week with no activity**. Once you have paying customers, upgrade to Pro
($25/month) so it never pauses.

---

## Part 3 — Crash reports with Sentry (10 min, free)

**What you get:** an email when the app crashes on someone's phone, with the
error and which screen it happened on.

1. **sentry.io** → Sign up (free Developer plan) → **Create project** →
   platform **React** → name it `reborn`.
2. Copy the **DSN** it shows (looks like `https://abc123@o123.ingest.sentry.io/456`).
3. In Vercel, add `VITE_SENTRY_DSN` = that DSN. Redeploy.

Crash reports never include anyone's habits, budget or notes, only the error
itself. Ad blockers sometimes block Sentry; the app works fine either way.

---

## Part 4 — Payments with Stripe (45 min, free until you sell)

**What you get:** an **Upgrade to Pro** button, and cloud sync that only works
for paying users once you turn the switch on. Stripe charges about 2.9% + 30¢
per sale. There's no monthly fee.

Do all of this in **Test mode** first (toggle at the top of the Stripe
dashboard). Test mode uses fake cards, so no real money moves.

1. **stripe.com** → Sign up → stay in **Test mode**.
2. **Product catalog → Add product**: name `REBORN Pro`, add a price (e.g.
   $4.99 monthly *recurring*, or $29 *one-off* for lifetime; both work).
3. **Payment Links → New**: pick that product.
   - Under **After payment**, choose "Don't show confirmation page →
     redirect to your website" and enter your site URL.
   - Create, then copy the link (`https://buy.stripe.com/test_...`).
4. **Settings → Billing → Customer portal** → activate it → copy the
   **login link** (`https://billing.stripe.com/p/login/test_...`). This is where
   customers cancel or update their card.
5. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-site>/api/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Save, then reveal and copy the **Signing secret** (`whsec_...`).
6. In Supabase, **Project Settings → API**, copy the **service_role** key.
   🔒 This key skips every security rule. It goes ONLY into the Vercel
   variable below, never into the app, a `VITE_` variable, a chat or a commit.
7. In Vercel, add:
   | Name | Value |
   |---|---|
   | `VITE_STRIPE_PAYMENT_LINK` | the Payment Link from step 3 |
   | `VITE_STRIPE_PORTAL_URL` | the portal login link from step 4 |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 5 |
   | `SUPABASE_URL` | same Project URL as before |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key from step 6 |
8. Redeploy.
9. **Turn on "sync needs payment".** Until you do this, sync is free for
   everyone. In Supabase **SQL Editor**, run:
   ```sql
   update app_config set require_payment = true;
   ```
   (Run it with `false` to switch back any time.)
10. **Test the whole flow:** sign in, add something. The Account box says
    "Cloud sync is part of REBORN Pro". Tap **Upgrade to Pro** and pay with test
    card `4242 4242 4242 4242`, any future date and any CVC. You're sent back to
    the app. Tap **Sync now** and the badge turns to **Pro ✓**.
    In Stripe → **Webhooks → your endpoint** you should see green "200"
    deliveries. A red one shows the error message.
11. **Go live:** switch Stripe out of Test mode, repeat steps 2–5 in live mode
    (live links and secret are different), update the three Stripe values in
    Vercel, and redeploy.

**What decides who has Pro?** The webhook writes to the `entitlements` table
after Stripe confirms a payment. Users can read their own row but can't change
it (the database tests prove this). So nobody can give themselves Pro by
editing the app.

---

## Part 5 — A custom domain (15 min, ~$10–15/year)

`reborn-app-nine.vercel.app` works but looks unfinished to buyers.

1. Buy a domain from Cloudflare Registrar, Namecheap or Porkbun. Cloudflare
   sells at cost, with no markup on renewals.
2. Vercel → your project → **Settings → Domains → Add** → type it → follow the
   DNS records it shows (usually one `A` record and one `CNAME`). Vercel sets
   up HTTPS by itself, usually within minutes.
3. **Then update the places that know your address:**
   - Supabase → Authentication → URL Configuration (Site URL + Redirect URLs)
   - Stripe → Payment Link "after payment" redirect, and the webhook URL
   - `api/telegram.js` `/status` fallback address (optional)

---

## Part 6 — Legal pages (30 min)

`public/privacy.html` and `public/terms.html` are written to match what the app
really does. Open both and replace every `[BRACKETED]` part: your name or
business, a contact email, prices, refund rule, country. Then delete the
comment at the top of each file. They're live at `/privacy.html` and
`/terms.html` and linked from the first screen.

These are templates, not legal advice. If you sell to the EU/UK or
California, get them checked once you have real revenue.

---

## Part 7 — Open the doors (when you're ready to sell)

While you're testing, keep the shared password on. When accounts and payments
work and you want strangers to sign up, add `REBORN_GATE` = `off` in Vercel and
redeploy. The site becomes public, and each person's data is protected by
their own account instead.

---

## Running the tests yourself

| Command | What it checks | Needs |
|---|---|---|
| `npm test` | login gate, sync rules, Stripe webhook (unit tests) | nothing |
| `npm run test:e2e` | builds the app, clicks through every tab in a real browser, backup/restore, offline | `npx playwright install chromium` once |
| `npm run test:e2e:sync` | two "phones" signing in and syncing against a fake Supabase | same |
| `npm run test:db` | `supabase/schema.sql` on real Postgres: privacy, payment switch, attacks | a local Postgres (`PGHOST=... PGUSER=...`) |

GitHub runs all four on every push (`.github/workflows/test.yml`). A ✅ or ❌
appears next to each commit and pull request.

---

## How it all fits together (the learning part)

**The phone is still the main copy.** The tabs only ever call
`window.storage` (in `src/storage.js`), which reads and writes the browser's
`localStorage`. That's why the app is instant and works offline. Sync was
added *underneath* that one file, so no tab had to change. Designing
storage this way from the start is what made this possible.

**How sync decides what wins** (`src/sync/engine.js`). Every saved item (e.g.
"Me's gym data") carries the time it last changed and a "not uploaded yet"
flag. A sync **downloads first**, so for each item the newer time wins, and
**then uploads** what changed here. The database double-checks: it ignores an
upload that's older than what it has. Deleting uploads an empty "tombstone" so
other phones learn about the delete. The profile *list* is special: two phones'
lists are combined instead of one replacing the other.

The tests caught a real bug here before it ever shipped. The first version
uploaded *before* downloading, which could overwrite a newer edit with an
older one. That's why `test/sync.test.js` exists: rules like this are easy to
get subtly wrong and hard to notice by clicking around.

**Why the database, not the app, enforces the rules.** Anything in the app can
be changed by a determined user in their browser's developer tools. So the
important rules live in Postgres (`supabase/schema.sql`):
- Row-Level Security policies: you can only read rows with your user id.
- No direct writes at all. Every upload goes through `push_kv()`, which checks
  "newer wins" and "has this person paid?".
- `entitlements` can only be written with the service_role key, which only
  the Stripe webhook has.

**Signatures** (`api/stripe-webhook.js`). Anyone can send a request to your
webhook URL claiming "user X paid". Stripe signs each real event with a secret
only you and Stripe know (HMAC-SHA256). The webhook recomputes the signature
and rejects anything that doesn't match, or that's more than 5 minutes old
(so an old real event can't be replayed).

**Offline** (`public/sw.js` + `scripts/build-sw.js`). A service worker is a
small script the browser keeps between visits. It can answer requests from a
saved copy when there's no internet. Vite gives every build's files new
names, so after each build a script writes the current file list into the
worker and stamps the cache with a new version. Phones then drop the old
files automatically.

**Forgotten profile passwords** (`confirmResetProfilePassword` in
`src/LifeTracker.jsx`). When you open a profile while signed in, it's stamped
with your account id. "Forgot password?" then lets that same account (after
re-entering its account password) choose a new profile password. Someone who
makes their own account on your phone can't, because your profiles aren't
stamped with their id. The browser test checks both cases.

**The file split.** `LifeTracker.jsx` still owns all the state (the data
and the functions that change it). Each tab in `src/tabs/` is a plain view
that receives exactly what it needs as props. That makes each tab readable on
its own: open `src/tabs/BudgetTab.jsx` and the top line lists everything the
budget screen depends on. A good next step for practice: move form-only state
(like the bill name being typed) down into its tab with `useState`.

**Where things live now:**
```
src/LifeTracker.jsx          app shell: all state + storage, hands props to tabs
src/tabs/*.jsx               one file per tab
src/components/              ProfilePicker, AccountPanel, shared UI pieces
src/lib/                     plain helpers and data (themes, dates, quotes...)
src/sync/engine.js           sync rules (no network — unit-tested)
src/sync/cloud.js            Supabase sign-in + sync timing
src/monitoring.jsx           crash screen + optional Sentry
supabase/schema.sql          database tables + security rules
api/stripe-webhook.js        marks accounts as paid
middleware.js                the shared-password gate
public/privacy.html, terms.html
test/                        unit tests, test/e2e browser tests, test/db database tests
```
