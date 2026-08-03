# Three Dinners, One Shop

A standalone weekly meal picker built around your own copy of *Trust The Skinny
Chef*. Every Monday it offers three recipes you haven't cooked yet, merges their
grocery terms into one de-duplicated shopping list, and optionally checks this
week's ALDI ad.

This is its own app — it shares this repository with REBORN but nothing else.
Separate `package.json`, separate build, separate deploy.

## What's in here and what isn't

The app stores **titles, page numbers, and plain grocery search terms** — the
things needed to point you at a page and fill a cart. It does not contain
measurements, methods, or any recipe text. You cook from the book; this just
tells you which page and what to buy.

## Run it locally

```
cd skinny-week
npm install
npm run dev
```

`npm test` runs the unit tests (49 of them, no framework). See **Testing this
yourself** below for the heavier end-to-end pass.

## Deploy it

It's a Vite app with two serverless functions, which Vercel handles natively.
Because it lives in a subdirectory, point Vercel at it:

1. **Add New → Project**, import this repository.
2. Set **Root Directory** to `skinny-week`. This is the only non-default setting
   — Vercel then auto-detects Vite and picks up everything in `api/` as
   functions.
3. Deploy.

**No keys, no environment variables, nothing else to configure.** Everything
except the two optional buttons below works the moment it's deployed: the
rotation, the picking, the shopping list, "Copy for Claude", and the
cooked-recipe memory all run client-side.

Prefer it in its own repository? Copy this folder out, `git init`, and deploy
with no Root Directory setting. Nothing in it refers to the parent repo.

## Keys: what needs one and what doesn't

**Neither key is needed to build, deploy, or use the app.** The rotation, the
picking, the shopping list, "Copy for Claude", and the cooked-recipe memory all
run in the browser with nothing configured. Both keys below are optional
upgrades to single buttons; without them those buttons say so and nothing else
changes.

| Button | Needs | Without it |
|---|---|---|
| Pick, list, Mark cooked | nothing | — |
| Copy for Claude | nothing | — |
| **CHECK** (ALDI ad) | `ANTHROPIC_API_KEY` | says it isn't set up |
| **Open in Instacart** | `INSTACART_API_KEY` | says it isn't set up |

## Can people access my data?

**There is no database.** Nothing about your picks or cooked history is stored
on a server anywhere. It all lives in your own browser's `localStorage`, on
your own device, under the keys listed in **Storage** below. Clear your
browser's site data and it's gone from that device; it was never anywhere else
to begin with.

What *is* true, once you deploy: `/api/deals` and `/api/instacart` are public
URLs on the internet, same as the rest of the site. If you configure a key for
either one, anyone who finds those two specific URLs could call them directly
(not through the UI) — not to read anything of yours, since there's nothing to
read, but to spend what the key allows: Anthropic usage on `/api/deals`,
Instacart's rate limit on `/api/instacart`.

Two things now guard against that, both added in this pass:

- **A passphrase gate, off by default.** Set `APP_ACCESS_KEY` in Vercel and
  both endpoints require it. The first time any device tries CHECK or Open in
  Instacart, the browser prompts once for the passphrase, then remembers it
  for that device via `localStorage`. Leave `APP_ACCESS_KEY` unset (the
  default) and neither endpoint ever prompts — this is opt-in, not a change to
  the zero-config default.
- **The per-IP rate limiter now trusts the right address.** It previously read
  the *first* address in the `X-Forwarded-For` header, which is exactly the
  part a client controls — anyone could reset their own limit by sending a
  made-up value there on every request. It now reads the *last* entry, the one
  Vercel's own edge appends, which a client can't spoof.

Neither of these is a full login system, and the rate limiting is still
best-effort (see below) — but a determined caller now needs your passphrase to
get anywhere, instead of nothing at all standing between them and your key.

| Variable | Value |
|---|---|
| `APP_ACCESS_KEY` | any passphrase you pick — unset by default (no gate) |

## Open in Instacart (optional, free key)

Sends the week's list to Instacart's Developer Platform, which returns a URL for
a shopping list page on Instacart Marketplace. On a phone, that URL deep-links
into the Instacart app with the list loaded.

Two things worth knowing before you invest time:

1. **It's push-only.** This creates a list page for you. It cannot read your
   Instacart account, your cart, or your order history. Nothing comes back but a
   link.
2. **A development key is self-service; a production key is not.** You sign up
   for the Instacart Developer Platform and create a key in the developer
   dashboard yourself. A *development* key works immediately against
   `connect.dev.instacart.tools`, so you can wire this up and test it today. A
   *production* key — real shoppers, `connect.instacart.com` — goes through an
   Instacart review of your integration first, which their docs put in the weeks
   range.

Set these in Vercel under **Settings → Environment Variables**, then redeploy:

| Variable | Value |
|---|---|
| `INSTACART_API_KEY` | your key from the Instacart developer dashboard |
| `INSTACART_ENV` | `development` (default) or `production` |

Quantities are deliberately always 1. The measurements are in the book and not
in this app, so sending "2 chicken breast" because two recipes use chicken would
be a number nobody checked. Instead each shared item reads "(for 2 recipes)" on
the Instacart page and you judge the size at the shelf.

This endpoint has no login by default, so anyone who finds the URL could call
it directly against your key — Instacart doesn't bill per call, so what's at
risk is your rate limit, not your wallet, but see **Can people access my
data?** above for the `APP_ACCESS_KEY` passphrase gate that closes this off,
and note the 10/min-per-IP cap here is best-effort (per-instance, not a shared
counter — see the ALDI ad section below for why).

## The ALDI ad (optional, costs money)

The **CHECK** button calls `/api/deals`, which runs server-side and asks Claude
to **search the web** for this week's ad near the area you type in. Without a key
it returns a plain "not set up" message and the rest of the app is unaffected.

To enable it, set one environment variable in Vercel under
**Settings → Environment Variables**, then redeploy:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your key from [the Anthropic console](https://console.anthropic.com) |

**Read this before you enable it.** Every press of CHECK bills real API usage to
your account, and this request uses the web-search tool, which costs more than a
plain message — search usage is billed per search on top of tokens. The button
is one tap and nothing stops you from tapping it repeatedly.

Guards that are in place:

- The key lives only on the server. It is never sent to the browser.
- Requests are capped at 5 per minute per IP — see **Can people access my
  data?** above for the fix that made this actually mean per-*IP*.
- `max_uses: 5` bounds how many searches one request can run.
- The endpoint rejects anything but `POST`, and the area you type is stripped
  to letters, numbers, spaces, commas, and periods before it reaches the
  prompt — a place name still works fine, but there's no character left to
  smuggle a second instruction to the model in.
- Set `APP_ACCESS_KEY` (above) to require a passphrase before this endpoint
  runs at all.

The rate limit is **best-effort**: Vercel functions are ephemeral and several
instances can run at once, so the counter isn't shared between them. It stops a
stuck retry loop, not a determined caller. If this ever faces the public
internet, move the counter into a shared store (Vercel KV or Upstash) and add a
hard daily ceiling.

Prices come from a live web search rather than the model's memory — that
distinction is the whole reason the endpoint is worth having. It's still worth a
glance at the real ad before you rely on a number.

### Changing the model

`api/deals.js` uses `claude-opus-5`. For a lookup this small, Sonnet is cheaper
and likely just as good — change the two `model:` lines to `claude-sonnet-5` if
you'd rather. Leave `thinking` alone: it's on by default on these models, and the
web-search tool is noticeably less reliable with it off.

## Testing this yourself

`npm test` (38 rotation/list tests + 11 covering the IP fix and access gate,
no framework, no browser) runs in a couple seconds and needs nothing installed
beyond `npm install`.

`npm run test:e2e` is heavier: it builds the app, boots a local stand-in for
Vercel that runs the *real* `api/deals.js` and `api/instacart.js` with
Anthropic and Instacart's responses faked (no real key, no real network, no
cost), and drives all three buttons in an actual headless Chromium — including
opening the Instacart tab and typing the passphrase into the access-key
prompt. It needs Playwright (`npm install --no-save playwright`, plus
`npx playwright install chromium` on a machine that doesn't already have one).
This is what proved out the two real bugs described above — the popup timing
one only shows up with a real browser enforcing real popup-block rules, not a
plain fetch-based check.

What it can't prove: that Anthropic's and Instacart's real APIs behave exactly
as documented. It proves this app calls them correctly and handles every
response shape they're documented to return — the live call still needs a
real key to fully confirm.

## Layout

```
index.html                 page shell, fonts, theme color
src/main.jsx               boot
src/SkinnyChefWeek.jsx     the whole UI
src/book.js                the recipe index (titles, pages, grocery terms)
src/rotation.js            week maths, rotation, list building — no DOM, no storage
src/apiClient.js           frontend fetch wrapper: handles the access-key prompt/retry
api/_util.js               shared helpers: the IP fix, the access-key gate
api/deals.js               Vercel function: ALDI ad lookup via Claude + web search
api/instacart.js           Vercel function: list -> Instacart shopping list page URL
test/rotation.test.js      38 tests over rotation.js and the book data
test/util.test.js          11 tests over the IP fix and the access gate
test/devserver.mjs         local stand-in for Vercel, real handlers + faked upstreams
test/browser-check.mjs     drives every button in a real browser against devserver.mjs
```

`rotation.js` and `api/_util.js` are deliberately free of browser/Vercel
globals so the tests can import them straight into Node.

## Storage

Everything is on the device, in `localStorage`, under two keys:
`skinny-week:cooked-pages` and `skinny-week:store`. There is no account and no
server-side state. Clearing site data resets the rotation — the app handles that
gracefully, it just starts you over at 0 of 30.
