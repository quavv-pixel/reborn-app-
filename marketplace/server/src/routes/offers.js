import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function serializeOffer(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    conversationId: row.conversation_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amountCents: row.amount_cents,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findOrCreateConversation(listingId, buyerId, sellerId) {
  const existing = db
    .prepare(
      'SELECT * FROM conversations WHERE buyer_id = ? AND seller_id = ? AND listing_id = ?'
    )
    .get(buyerId, sellerId, listingId);
  if (existing) return existing;
  const info = db
    .prepare('INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)')
    .run(listingId, buyerId, sellerId);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
}

function messagePayload(messageId) {
  const row = db
    .prepare(
      `SELECT messages.*, offers.status AS offer_status, offers.amount_cents AS offer_amount_cents
       FROM messages LEFT JOIN offers ON offers.id = messages.offer_id
       WHERE messages.id = ?`
    )
    .get(messageId);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    kind: row.kind,
    offerId: row.offer_id,
    offerStatus: row.offer_status,
    offerAmountCents: row.offer_amount_cents,
    createdAt: row.created_at,
  };
}

router.post('/', requireAuth, (req, res) => {
  const { listingId, amountCents } = req.body || {};
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'active') {
    return res.status(400).json({ error: 'This listing is no longer available' });
  }
  if (listing.seller_id === req.userId) {
    return res.status(400).json({ error: 'You cannot make an offer on your own listing' });
  }
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return res.status(400).json({ error: 'amountCents must be a positive number' });
  }

  const pending = db
    .prepare(
      "SELECT id FROM offers WHERE listing_id = ? AND buyer_id = ? AND status = 'pending'"
    )
    .get(listing.id, req.userId);
  if (pending) {
    return res.status(409).json({ error: 'You already have a pending offer on this listing' });
  }

  const conversation = findOrCreateConversation(listing.id, req.userId, listing.seller_id);

  const insertOffer = db.transaction(() => {
    const offerInfo = db
      .prepare(
        `INSERT INTO offers (listing_id, conversation_id, buyer_id, seller_id, amount_cents, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`
      )
      .run(listing.id, conversation.id, req.userId, listing.seller_id, Math.round(amountCents));
    const messageInfo = db
      .prepare(
        `INSERT INTO messages (conversation_id, sender_id, body, kind, offer_id)
         VALUES (?, ?, ?, 'offer', ?)`
      )
      .run(conversation.id, req.userId, `Offered $${(amountCents / 100).toFixed(2)}`, offerInfo.lastInsertRowid);
    return { offerId: offerInfo.lastInsertRowid, messageId: messageInfo.lastInsertRowid };
  });
  const { offerId, messageId } = insertOffer();

  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
  const message = messagePayload(messageId);
  req.app.get('io')?.to(`conversation:${conversation.id}`).emit('new_message', message);

  res.status(201).json({ offer: serializeOffer(offer), conversationId: conversation.id });
});

router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, l.title AS listing_title, l.image_url AS listing_image
       FROM offers o JOIN listings l ON l.id = o.listing_id
       WHERE o.buyer_id = ? OR o.seller_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.userId, req.userId);
  res.json({
    offers: rows.map((r) => ({
      ...serializeOffer(r),
      listing: { id: r.listing_id, title: r.listing_title, imageUrl: r.listing_image },
    })),
  });
});

router.patch('/:id', requireAuth, (req, res) => {
  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.seller_id !== req.userId) {
    return res.status(403).json({ error: 'Only the seller can respond to this offer' });
  }
  if (offer.status !== 'pending') {
    return res.status(400).json({ error: 'This offer has already been responded to' });
  }

  const { action } = req.body || {};
  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: "action must be 'accept' or 'decline'" });
  }
  const nextStatus = action === 'accept' ? 'accepted' : 'declined';

  const respond = db.transaction(() => {
    db.prepare("UPDATE offers SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      nextStatus,
      offer.id
    );
    const body =
      nextStatus === 'accepted'
        ? `Accepted the $${(offer.amount_cents / 100).toFixed(2)} offer`
        : `Declined the $${(offer.amount_cents / 100).toFixed(2)} offer`;
    const messageInfo = db
      .prepare(
        `INSERT INTO messages (conversation_id, sender_id, body, kind, offer_id)
         VALUES (?, ?, ?, 'offer', ?)`
      )
      .run(offer.conversation_id, req.userId, body, offer.id);
    return messageInfo.lastInsertRowid;
  });
  const messageId = respond();

  const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(offer.id);
  const message = messagePayload(messageId);
  const io = req.app.get('io');
  io?.to(`conversation:${offer.conversation_id}`).emit('new_message', message);
  io?.to(`conversation:${offer.conversation_id}`).emit('offer_updated', serializeOffer(updated));

  res.json({ offer: serializeOffer(updated) });
});

export default router;
