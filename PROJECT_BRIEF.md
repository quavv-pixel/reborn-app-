# REBORN — Project Brief

> Copy-paste this whole file into any AI assistant (or hand it to a developer) and they will
> know everything about this project. Written 2026-07-26.

---

## 1. What this app is

REBORN is a personal life-tracker built as a **PWA** (a website that installs to a phone's
home screen and behaves like an app). One install supports multiple password-protected
profiles on the same device. It tracks:

- **Gym** — weekly split (7 day cards), lift logging with auto-fill from your last set,
  personal bests, exercise library grouped by muscle group
- **Routine** — daily schedule blocks (exportable to the phone calendar as .ics), habit
  checklist grouped by category with streaks, daily mood log
- **Meals** — meal log with calories against a daily goal, plus a "meal book" of reusable foods
- **Budget** — transactions, monthly budget, weekly income, bills with paid/unpaid tracking per
  month, savings goal with weekly-pace projection, optional debt payoff that runs before savings
- **Home** — greeting hero with an animated wave (speed + color react to today's progress),
  circular progress rings, daily quote, 7-day calorie sparkline, jump-to cards

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS (single ~2,600-line `src/LifeTracker.jsx`) |
| Storage | `localStorage` on the device via a small `window.storage` wrapper (`src/storage.js`) |
| Fonts | Inter (UI), JetBrains Mono (labels/numbers), Cormorant Garamond (REBORN wordmark) |
| PWA | `public/manifest.json` + `public/sw.js` service worker |
| Optional push backend | Node/Express + web-push in `server/` (only when self-hosted; NOT used on Vercel) |
| Tests | `test/security.test.js` — 27 tests for the backend's auth + SSRF guards |
| Hosting | Vercel, auto-deploys from `main` → https://reborn-app-nine.vercel.app |

## 3. Architecture facts that matter

- **All data lives on the device.** Nothing is uploaded anywhere. Each profile's data is
  namespaced under `p:<ProfileName>:<key>` inside one localStorage blob (`ops-log:__all__`).
  Keys per profile: `gym-data`, `routine-data`, `meals-data`, `budget-data`, `theme`.
  Device-level key: `device:theme` (picker screen theme). Profile registry: `profiles-list`.
- **Profiles are password-gated, not real accounts.** Passwords are hashed client-side
  (SHA-256 + per-profile salt, Web Crypto). This stops a family member from tapping into your
  profile; it does NOT stop someone with dev tools on the same device. There is no server to
  log into, no password reset, no cross-device sync.
- **New profiles start 100% blank** (no seeded habits/schedule/bills/lifts) — deliberate,
  after real personal data was once baked into defaults and strangers saw it.
- **Profiles can be renamed and deleted** from the unlock screen; both actions require the
  profile's password. Rename migrates all storage keys; delete wipes them permanently.
- **14 themes** driven entirely by CSS custom properties (`--bg`, `--panel`, `--field`,
  `--border`, `--text`, `--dim`, `--accent`, `--accent2`, `--danger`) in a `THEMES` object.
  The picker screen has its own device-level theme that new profiles inherit.
- **iOS status bar** is handled: `viewport-fit=cover`, safe-area padding, and a `theme-color`
  meta that JS re-tints to the active theme.
- **Notifications**: in-browser reminders work while a tab is open. Real push (app closed)
  requires self-hosting the `server/` backend with VAPID keys; it has constant-time token
  auth, SSRF-safe endpoint validation, and atomic JSON writes. Vercel's static hosting cannot
  do real push.
- **Deploys**: push to `main` → Vercel builds automatically. A private Claude-artifact preview
  is also rebuilt after every change. GitHub Pages workflow exists
  (`.github/workflows/deploy-pages.yml` + `npm run build:pages`) but needs a one-time manual
  toggle: repo **Settings → Pages → Source → GitHub Actions**.

## 4. What's weak or missing today (ranked)

1. **No backup or export.** localStorage is fragile: if Safari clears website data (which iOS
   does to rarely-used sites), or the user deletes the app icon and Safari data, **everything
   is gone forever**. Biggest real risk in the whole app. Fix: a "Download my data" / "Restore
   from file" JSON export-import button — no backend needed, ~an afternoon of work.
2. **No cross-device sync.** A profile lives only on the phone that created it. The
   `storage.js` wrapper was designed so its internals can be swapped for Firebase/Supabase
   without touching app code — that was intentional, and it's the upgrade path.
3. **No password reset.** Forget a profile password and that profile's data is unreachable
   (by design, but users will hate it). A recovery phrase shown once at creation would fix it.
4. **One giant component.** `LifeTracker.jsx` is ~2,600 lines. It works, but splitting it
   into files per tab would make future changes faster and safer.
5. **No error monitoring.** If the app crashes on someone's phone you will never know.
   Sentry's free tier is enough.
6. **No UI tests.** The 27 tests cover only the push backend. The Playwright scripts used
   during development (fresh-profile blankness, rename/delete, theme persistence) could be
   committed and run in CI.
7. **Offline behavior is untested.** The service worker exists for push, but there's no
   offline asset caching — the installed app may fail to open without internet.
8. **Meal book / exercise library are hardcoded** in the component; fine for now, but they
   belong in a JSON file users could eventually edit.

## 5. Can it handle selling to 100+ people?

**Short answer: yes — the app will not crash, because there is nothing to crash.**

The Vercel deployment is static files. Each person's phone downloads ~70 KB of gzipped
JavaScript once, then runs everything locally and stores everything locally. 100 users or
100,000 users make zero difference to load — there's no shared server, no database, no
per-user cost. Vercel's free tier serves this fine.

**But "won't crash" is not the same as "ready to sell."** What actually breaks at 100 paying
customers is everything around the code:

| Gap | Why it matters at 100+ users | Fix |
|---|---|---|
| Data loss (see 4.1) | The first customer whose iPhone clears Safari storage loses months of logs and demands a refund | Export/backup now; cloud sync later |
| No accounts | Can't tie a purchase to a person; can't gate access; anyone with the URL gets the app free | Supabase/Firebase auth (storage.js swap makes this feasible) |
| No payments | Nothing to sell with | Stripe Payment Links or LemonSqueezy/Gumroad (they handle sales tax) |
| No custom domain | `reborn-app-nine.vercel.app` looks unfinished | Buy a domain (~$12/yr), attach in Vercel |
| No privacy policy / terms | Legally required in most places once money changes hands, even for a local-only app | One page each; local-only storage makes them short |
| No support channel | 100 customers = questions | An email address + a simple FAQ page |
| No update notice | Users on an old cached version won't know a fix shipped | Service-worker "new version available — refresh" banner |

**Realistic path to selling:**
1. **Now (free tier / beta):** add export-backup, custom domain, privacy page. Share the link;
   collect feedback. Cost: ~$12/year.
2. **First paying users:** Gumroad/LemonSqueezy license key that the app checks once and
   remembers locally. No backend yet. Weekend of work.
3. **Real product:** Supabase (free tier covers hundreds of users) for accounts + sync via the
   `storage.js` swap, Stripe subscriptions, Sentry monitoring. At this point one device dying
   never loses a customer's data, and the same account works on phone + laptop. This is the
   version that justifies charging monthly.

## 6. Repo map

```
index.html                 PWA shell: viewport-fit, theme-color, dark base bg
src/LifeTracker.jsx        the entire app UI + logic + THEMES
src/storage.js             window.storage wrapper over localStorage (swap point for cloud sync)
src/push.js                frontend bridge to the optional push backend
src/main.jsx, App.jsx      boot
public/manifest.json       PWA manifest (relative paths — works on any host)
public/sw.js               service worker (push display)
server/server.js           optional self-hosted push backend (Express, 30s scheduler)
server/security.js         token auth (timing-safe) + SSRF-safe URL validation
server/config.js           dependency-free .env loader
test/security.test.js      27 backend security tests (npm test)
.github/workflows/deploy-pages.yml   GitHub Pages deploy (needs one manual Settings toggle)
vite.config.js             base path override via VITE_BASE (for Pages subpath)
```

## 7. House rules learned the hard way

- Never put anything personal-looking in default/seed data — it ships to every stranger.
- Every change: `npm test` (27 passing) → `npm run build` → Playwright-verify on a fresh
  profile → PR to `main` → merge → Vercel auto-deploys → rebuild the private artifact preview.
- All UI theming goes through the CSS variables; never hardcode a color in a component.
- `window.storage` is the only storage API the app may touch — keeps the cloud-sync swap possible.
