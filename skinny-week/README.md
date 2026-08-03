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

`npm test` runs the rotation and list-building tests (38 of them, no framework).

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

**This endpoint is unauthenticated.** There's no login in this app to gate on,
so anyone who finds the URL can create list pages against your key. Instacart
doesn't bill per call, so the exposure is your rate limit rather than your
wallet, and requests are capped at 10/min per IP — but that cap is per-instance
and best-effort, same caveat as the ad lookup below. If that bothers you, the
options are to keep the site private, or add a shared secret and a small login.

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
- Requests are capped at 5 per minute per IP.
- `max_uses: 5` bounds how many searches one request can run.
- The endpoint rejects anything but `POST`, and the area you type is truncated
  to 60 characters and flattened to one line before it reaches the prompt.

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

## Layout

```
index.html                 page shell, fonts, theme color
src/main.jsx               boot
src/SkinnyChefWeek.jsx     the whole UI
src/book.js                the recipe index (titles, pages, grocery terms)
src/rotation.js            week maths, rotation, list building — no DOM, no storage
api/deals.js               Vercel function: ALDI ad lookup via Claude + web search
api/instacart.js           Vercel function: list -> Instacart shopping list page URL
test/rotation.test.js      38 tests over rotation.js and the book data
```

`rotation.js` is deliberately free of browser globals so the tests can import it
straight into Node.

## Storage

Everything is on the device, in `localStorage`, under two keys:
`skinny-week:cooked-pages` and `skinny-week:store`. There is no account and no
server-side state. Clearing site data resets the rotation — the app handles that
gracefully, it just starts you over at 0 of 30.
