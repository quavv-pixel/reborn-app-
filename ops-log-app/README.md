# REBORN — standalone app

This is your REBORN tracker pulled out of Claude into a real, ordinary
website project. Once deployed it runs on a real server 24/7 — your phone
and your computer are never involved in keeping it "on."

## What's different from the Claude version

- **Storage**: `src/storage.js` replaces Claude's `window.storage` with your
  browser's own `localStorage`. Same API, so `LifeTracker.jsx` didn't need
  to change. Data stays on whichever device/browser you use it in — no
  cross-device sync yet (see "Later" below).
- Everything else — themes, profiles, gym/routine/meals/budget — is exactly
  what you had.
- **Real push notifications**: optional, self-hosted, and off by default —
  see "Real push notifications" below. The static Vercel deploy above is
  unaffected either way.

## Deploy it (about 20–30 minutes, all free)

**1. Get a GitHub account** (skip if you have one): github.com → Sign up.

**2. Create a new repository**
   - On github.com, click **New repository**, name it `reborn`, keep it
     Public or Private (either works), click **Create repository**.

**3. Upload this folder**
   - On the new repo's page, click **uploading an existing file**.
   - Drag in every file from this folder (keep the folder structure —
     `src/`, `public/`, `package.json`, etc.).
   - Commit the upload.

**4. Get a Vercel account**: vercel.com → **Sign up** → choose
   **Continue with GitHub** (this links the two automatically).

**5. Import the project**
   - In Vercel, click **Add New → Project**.
   - Pick your `reborn` repo from the list → **Import**.
   - Vercel auto-detects Vite. Leave the defaults. Click **Deploy**.
   - Wait ~1 minute. You'll get a URL like `reborn-yourname.vercel.app`.

**6. Put it on your phone**
   - Open that URL on your phone's browser.
   - iPhone (Safari): Share button → **Add to Home Screen**.
   - Android (Chrome): ⋮ menu → **Add to Home screen** / **Install app**.
   - You now have an app icon that opens full-screen, no browser bar.

From here on, every time you want to update the app: change the code,
upload the changed files to the same GitHub repo (or push via `git` if
you're comfortable with it), and Vercel automatically redeploys within
about a minute. Nothing on your end needs to stay running.

## Later, if you want real cross-device sync + real login

Replace the internals of `src/storage.js` with a client for a
backend-as-a-service like Firebase or Supabase (both have free tiers).
Because `LifeTracker.jsx` only ever calls `window.storage.get/set/...`,
none of the app code has to change — only what's inside that one file.
That's also what would let the profile switcher become a real
password-protected login instead of a name-only convenience.

## Real push notifications (a different, self-hosted deploy)

The bell icon in the header always works one way: foreground notifications
via the browser's plain `Notification` API, which only fire while this tab
is open. That's true whether you're running this locally or on Vercel above
— nothing about it changed.

`server/` adds a second, optional path to real background push — reminders
that arrive even with the app fully closed, the way a native app's
notifications do. This **cannot run on Vercel's static/serverless
deploy** above: it needs one persistent Node process holding a 30-second
scheduler loop and writing local files, which serverless functions don't
provide. Think of it as a separate, self-hosted sibling of the static site —
same UI, same code, run differently. Regimen-app
(github.com/VIP5O9/Regimen-app) is the reference this was built from; if
you're comfortable running that, this works the same way.

### Quick start

```bash
npm install
npm run build
npm start
```

The server prints a sign-in URL with an access token in it:

```
http://localhost:3131/?token=xxxxxxxxxxxxxxxxxxxxxxxx
```

Open that once — the token saves itself into the browser and drops out of
the address bar; every visit after that is just `http://localhost:3131`.
Then tap the bell. If a backend is reachable, it registers a service worker
and arms real push instead of the foreground fallback; the header tooltip
tells you which one is active.

### Configuration

Copy `.env.example` to `.env` and uncomment what you need — everything is
optional, but push stays disabled until `REBORN_CONTACT` is set:

| Variable | Default | What it does |
|----------|---------|---------------|
| `REBORN_CONTACT` | *unset* | VAPID subject for Web Push. **Push is off until you set this.** Must be a real `mailto:` or `https:` URL you control — Apple 403s on anything else. |
| `REBORN_TOKEN` | auto | API access token. Unset means a random one is generated into `data/token.json` and printed at startup. |
| `PORT` | `3131` | HTTP port. |
| `REBORN_HOST` | `0.0.0.0` | Bind address. Set `127.0.0.1` for loopback only. |
| `REBORN_DATA_DIR` | `./data` | Where state, tokens, and keys live. |

### Getting it onto your phone

Two things are non-negotiable, same as any Web Push setup:

1. **HTTPS.** Service workers and Web Push refuse to run over plain `http`
   (`localhost` is the one exception, and only on the machine itself).
2. **`REBORN_CONTACT` must be set**, or push stays disabled.

Getting HTTPS to your phone is your choice — Tailscale, Cloudflare Tunnel,
ngrok, or a reverse proxy with a real certificate. Once you have an HTTPS
URL: open `https://<your-host>/?token=<your token>`, add it to your home
screen, open it from there (push only works from the installed app), and
tap the bell.

### Security

The API is never open — every `/api/*` route requires the bearer token,
reads included, since the schedule and subscription list are a log of your
day. `/api/subscribe` validates the endpoint URL before storing it (blocking
localhost, private ranges, and cloud metadata addresses), so the server
can't be turned into an SSRF relay. Token comparison is constant-time.

Run the security tests with `npm test`.

### What stays private

Never committed, all gitignored: `data/token.json`, `data/vapid.json`,
`data/subs.json`, `data/schedule.json`, `data/state.json`, and `.env`.
