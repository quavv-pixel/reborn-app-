import { Router } from 'express';
import Stripe from 'stripe';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

router.post('/checkout', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured on this server. Set STRIPE_SECRET_KEY to enable checkout.',
    });
  }

  const { listingId } = req.body || {};
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'active') {
    return res.status(400).json({ error: 'This listing is no longer available' });
  }
  if (listing.seller_id === req.userId) {
    return res.status(400).json({ error: 'You cannot buy your own listing' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: listing.price_cents,
          product_data: {
            name: listing.title,
            description: listing.description?.slice(0, 500) || undefined,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${frontendUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/listings/${listing.id}`,
    metadata: {
      listingId: String(listing.id),
      buyerId: String(req.userId),
      sellerId: String(listing.seller_id),
    },
  });

  db.prepare(
    `INSERT INTO orders (listing_id, buyer_id, seller_id, amount_cents, stripe_session_id, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  ).run(listing.id, req.userId, listing.seller_id, listing.price_cents, session.id);

  res.json({ url: session.url });
});

function serializeOrder(row) {
  return {
    id: row.id,
    listing: { id: row.listing_id, title: row.listing_title, imageUrl: row.listing_image },
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amountCents: row.amount_cents,
    status: row.status,
    createdAt: row.created_at,
  };
}

router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, l.title AS listing_title, l.image_url AS listing_image
       FROM orders o JOIN listings l ON l.id = o.listing_id
       WHERE o.buyer_id = ? OR o.seller_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.userId, req.userId);
  res.json({ orders: rows.map(serializeOrder) });
});

router.get('/by-session/:sessionId', requireAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT o.*, l.title AS listing_title, l.image_url AS listing_image
       FROM orders o JOIN listings l ON l.id = o.listing_id
       WHERE o.stripe_session_id = ?`
    )
    .get(req.params.sessionId);
  if (!row) return res.status(404).json({ error: 'Order not found' });
  if (row.buyer_id !== req.userId && row.seller_id !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ order: serializeOrder(row) });
});

export default router;
