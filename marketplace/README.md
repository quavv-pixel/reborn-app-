# Reborn Market

A marketplace for the resale community: list items for sale, buy from other
resellers, and message sellers/suppliers in real time.

## Stack

- **Server**: Node.js + Express, SQLite (via `better-sqlite3`), JWT auth in an
  httpOnly cookie, Socket.IO for real-time chat, Stripe Checkout for payments.
- **Client**: React + Vite, Tailwind CSS v4, React Router, `socket.io-client`.

## Features

- Email/password sign up and log in (bcrypt-hashed passwords, JWT sessions).
- Browse listings via a category sidebar (Facebook Marketplace-style) with
  live per-category counts, plus keyword/category/condition search.
- Bold, price-forward listing cards and detail pages (StockX-style), with
  condition and location chips.
- Create, edit, and remove your own listings, including a location field.
- "Buy now" **and** "Make offer" on every listing (OfferUp-style). Offers
  appear as inline cards in the chat thread the seller can Accept/Decline in
  real time; once accepted, the buyer gets a "Pay $X" button for that price.
- Message sellers about a listing; messages and offer updates deliver in real
  time over WebSockets (Socket.IO).
- "Buy now" (or an accepted offer) launches a Stripe Checkout session; a
  webhook marks the order paid and the listing sold once Stripe confirms
  payment.
- Dashboard for your listings, purchases, and sales.

## Project layout

```
marketplace/
  server/   Express API + SQLite database + Socket.IO
  client/   React (Vite) frontend
```

## Running locally

### 1. Server

```bash
cd server
cp .env.example .env   # then fill in JWT_SECRET and (optionally) Stripe keys
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default and stores its SQLite
database at `server/data/marketplace.db` (created automatically).

### 2. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The app runs on `http://localhost:5173` and talks to the API at the URL in
`VITE_API_URL`.

## Stripe setup (optional)

Checkout works without Stripe configured — the "Buy now" button will simply
return a clear error until you add keys. To enable real payments:

1. Create a [Stripe](https://dashboard.stripe.com/register) account and grab
   your **test mode** secret key from the Stripe dashboard.
2. Set `STRIPE_SECRET_KEY` in `server/.env`.
3. Forward webhooks to your local server for testing:
   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```
   Copy the `whsec_...` signing secret it prints into `STRIPE_WEBHOOK_SECRET`.
4. Restart the server. "Buy now" will create a real Stripe Checkout session;
   completing payment (use Stripe's test card `4242 4242 4242 4242`) marks the
   order paid and the listing sold.

This uses the platform as the merchant of record (a single Stripe account
collects payment). A production marketplace that pays out to individual
sellers directly would want **Stripe Connect** instead — that's a bigger
integration (connected accounts, onboarding, transfers) and isn't wired up
here.

## Notes / simplifications

- Images are added by URL, not file upload — plug in S3/Cloudinary if you
  want real image uploads.
- SQLite is used for simplicity; swap in Postgres (e.g. via `pg` +
  Kysely/Prisma) for a production deployment with concurrent writers.
- There's no admin/moderation tooling, ratings, or shipping/tracking — this
  is an MVP foundation, not a full production marketplace.
