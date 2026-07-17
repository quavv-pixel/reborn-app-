import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function serializeConversation(row, viewerId) {
  const otherId = row.buyer_id === viewerId ? row.seller_id : row.buyer_id;
  const otherName = row.buyer_id === viewerId ? row.seller_name : row.buyer_name;
  return {
    id: row.id,
    role: row.buyer_id === viewerId ? 'buyer' : 'seller',
    listing: row.listing_id
      ? { id: row.listing_id, title: row.listing_title, imageUrl: row.listing_image }
      : null,
    otherUser: { id: otherId, displayName: otherName },
    lastMessage: row.last_message
      ? { body: row.last_message, createdAt: row.last_message_at }
      : null,
    createdAt: row.created_at,
  };
}

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, l.title AS listing_title, l.image_url AS listing_image,
              buyer.display_name AS buyer_name, seller.display_name AS seller_name,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_at
       FROM conversations c
       JOIN users buyer ON buyer.id = c.buyer_id
       JOIN users seller ON seller.id = c.seller_id
       LEFT JOIN listings l ON l.id = c.listing_id
       WHERE c.buyer_id = ? OR c.seller_id = ?
       ORDER BY COALESCE(last_message_at, c.created_at) DESC`
    )
    .all(req.userId, req.userId);
  res.json({ conversations: rows.map((r) => serializeConversation(r, req.userId)) });
});

router.post('/', requireAuth, (req, res) => {
  const { listingId, sellerId } = req.body || {};
  let resolvedSellerId = sellerId;
  let resolvedListingId = listingId || null;

  if (listingId) {
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    resolvedSellerId = listing.seller_id;
  }

  if (!resolvedSellerId) {
    return res.status(400).json({ error: 'listingId or sellerId is required' });
  }
  if (resolvedSellerId === req.userId) {
    return res.status(400).json({ error: 'You cannot start a conversation with yourself' });
  }

  const existing = db
    .prepare(
      `SELECT * FROM conversations WHERE buyer_id = ? AND seller_id = ? AND
       ((? IS NULL AND listing_id IS NULL) OR listing_id = ?)`
    )
    .get(req.userId, resolvedSellerId, resolvedListingId, resolvedListingId);

  let conversation = existing;
  if (!conversation) {
    const info = db
      .prepare('INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)')
      .run(resolvedListingId, req.userId, resolvedSellerId);
    conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
  }

  const row = db
    .prepare(
      `SELECT c.*, l.title AS listing_title, l.image_url AS listing_image,
              buyer.display_name AS buyer_name, seller.display_name AS seller_name
       FROM conversations c
       JOIN users buyer ON buyer.id = c.buyer_id
       JOIN users seller ON seller.id = c.seller_id
       LEFT JOIN listings l ON l.id = c.listing_id
       WHERE c.id = ?`
    )
    .get(conversation.id);
  res.status(existing ? 200 : 201).json({ conversation: serializeConversation(row, req.userId) });
});

function serializeMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    body: m.body,
    kind: m.kind,
    offerId: m.offer_id,
    offerStatus: m.offer_status ?? null,
    offerAmountCents: m.offer_amount_cents ?? null,
    createdAt: m.created_at,
  };
}

function assertParticipant(conversationId, userId) {
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!convo) return { error: 404 };
  if (convo.buyer_id !== userId && convo.seller_id !== userId) return { error: 403 };
  return { convo };
}

router.get('/:id/messages', requireAuth, (req, res) => {
  const { error } = assertParticipant(req.params.id, req.userId);
  if (error) return res.status(error).json({ error: error === 404 ? 'Not found' : 'Forbidden' });

  const rows = db
    .prepare(
      `SELECT messages.*, offers.status AS offer_status, offers.amount_cents AS offer_amount_cents
       FROM messages LEFT JOIN offers ON offers.id = messages.offer_id
       WHERE messages.conversation_id = ? ORDER BY messages.id ASC`
    )
    .all(req.params.id);
  res.json({ messages: rows.map(serializeMessage) });
});

router.post('/:id/messages', requireAuth, (req, res) => {
  const { convo, error } = assertParticipant(req.params.id, req.userId);
  if (error) return res.status(error).json({ error: error === 404 ? 'Not found' : 'Forbidden' });

  const { body } = req.body || {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'Message body is required' });
  }

  const info = db
    .prepare('INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)')
    .run(convo.id, req.userId, String(body).trim());
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  const payload = serializeMessage(message);

  req.app.get('io')?.to(`conversation:${convo.id}`).emit('new_message', payload);
  res.status(201).json({ message: payload });
});

export default router;
