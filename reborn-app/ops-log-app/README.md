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
