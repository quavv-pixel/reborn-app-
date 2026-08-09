# Car Fund Tracker

A standalone, single-page PWA for tracking a 21-week car-savings plan: one week to
pay off a debt, then 20 weekly $250 deposits toward a $5,000 car fund.

## What's here

- `index.html` — the entire app. No build step, no dependencies, no framework —
  plain HTML/CSS/JS. Progress (checked weeks) is saved to `localStorage` on the
  device, same pattern as the rest of REBORN.
- `manifest.json` + `icons/` — makes it installable to a phone home screen as its
  own app, separate from REBORN.

## Running it

Open `index.html` directly in a browser, or serve the folder with any static file
server, e.g.:

```
npx serve car-fund
```

## Deploying it

This folder has no build step, so it deploys as-is. To host it as its own site
(separate from the REBORN app in this repo), point a static host — a new Vercel
project, GitHub Pages, Netlify, etc. — at this `car-fund/` directory as the
project root.

## Editing the plan

All the numbers that drive the tracker (gross pay, tax rate, weekly savings
amount, bills/rides/food budget, the $5,000 goal, the debt amount, and the
Jun 17 2026 start date) live at the top of the `<script>` block in `index.html`
as named constants. Milestone dates and the footer date range are computed from
those constants — change a number once and every date/label on the page follows.
