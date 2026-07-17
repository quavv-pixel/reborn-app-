import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, attachUserIfPresent } from '../middleware/auth.js';

const router = Router();

export const CATEGORIES = [
  'sneakers',
  'streetwear',
  'electronics',
  'collectibles',
  'accessories',
  'home',
  'other',
];
export const CONDITIONS = ['new', 'like_new', 'used', 'for_parts'];

function serializeListing(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    category: row.category,
    condition: row.condition,
    imageUrl: row.image_url,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    seller: {
      id: row.seller_id,
      displayName: row.seller_name,
      isSupplier: !!row.seller_is_supplier,
    },
  };
}

const LISTING_SELECT = `
  SELECT listings.*, users.display_name AS seller_name, users.is_supplier AS seller_is_supplier
  FROM listings
  JOIN users ON users.id = listings.seller_id
`;

router.get('/', attachUserIfPresent, (req, res) => {
  const { q, category, condition, status } = req.query;
  const clauses = [];
  const params = {};

  if (status) {
    clauses.push('listings.status = @status');
    params.status = String(status);
  } else {
    clauses.push("listings.status != 'removed'");
  }
  if (category && CATEGORIES.includes(category)) {
    clauses.push('listings.category = @category');
    params.category = category;
  }
  if (condition && CONDITIONS.includes(condition)) {
    clauses.push('listings.condition = @condition');
    params.condition = condition;
  }
  if (q) {
    clauses.push('(listings.title LIKE @q OR listings.description LIKE @q)');
    params.q = `%${String(q).trim()}%`;
  }
  if (req.query.location) {
    clauses.push('listings.location LIKE @location');
    params.location = `%${String(req.query.location).trim()}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`${LISTING_SELECT} ${where} ORDER BY listings.created_at DESC LIMIT 200`)
    .all(params);
  res.json({ listings: rows.map(serializeListing) });
});

router.get('/category-counts', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT category, COUNT(*) AS count FROM listings WHERE status = 'active' GROUP BY category`
    )
    .all();
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const row of rows) counts[row.category] = row.count;
  res.json({ counts });
});

router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare(`${LISTING_SELECT} WHERE listings.seller_id = ? ORDER BY listings.created_at DESC`)
    .all(req.userId);
  res.json({ listings: rows.map(serializeListing) });
});

router.get('/:id', attachUserIfPresent, (req, res) => {
  const row = db.prepare(`${LISTING_SELECT} WHERE listings.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Listing not found' });
  res.json({ listing: serializeListing(row) });
});

router.post('/', requireAuth, (req, res) => {
  const { title, description, priceCents, category, condition, imageUrl, location } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return res.status(400).json({ error: 'priceCents must be a positive number' });
  }
  const cat = CATEGORIES.includes(category) ? category : 'other';
  const cond = CONDITIONS.includes(condition) ? condition : 'used';

  const info = db
    .prepare(
      `INSERT INTO listings (seller_id, title, description, price_cents, category, condition, image_url, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.userId,
      title.trim(),
      String(description || '').trim(),
      Math.round(priceCents),
      cat,
      cond,
      imageUrl || null,
      location ? String(location).trim() : null
    );

  const row = db.prepare(`${LISTING_SELECT} WHERE listings.id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ listing: serializeListing(row) });
});

router.patch('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Listing not found' });
  if (existing.seller_id !== req.userId) {
    return res.status(403).json({ error: 'You do not own this listing' });
  }

  const { title, description, priceCents, category, condition, imageUrl, location, status } = req.body || {};
  const next = {
    title: title !== undefined ? String(title).trim() : existing.title,
    description: description !== undefined ? String(description).trim() : existing.description,
    price_cents:
      priceCents !== undefined && Number.isFinite(priceCents) && priceCents > 0
        ? Math.round(priceCents)
        : existing.price_cents,
    category: CATEGORIES.includes(category) ? category : existing.category,
    condition: CONDITIONS.includes(condition) ? condition : existing.condition,
    image_url: imageUrl !== undefined ? imageUrl : existing.image_url,
    location: location !== undefined ? (location ? String(location).trim() : null) : existing.location,
    status: ['active', 'sold', 'removed'].includes(status) ? status : existing.status,
  };

  db.prepare(
    `UPDATE listings SET title = @title, description = @description, price_cents = @price_cents,
     category = @category, condition = @condition, image_url = @image_url, location = @location,
     status = @status, updated_at = datetime('now') WHERE id = @id`
  ).run({ ...next, id: existing.id });

  const row = db.prepare(`${LISTING_SELECT} WHERE listings.id = ?`).get(existing.id);
  res.json({ listing: serializeListing(row) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Listing not found' });
  if (existing.seller_id !== req.userId) {
    return res.status(403).json({ error: 'You do not own this listing' });
  }
  db.prepare("UPDATE listings SET status = 'removed', updated_at = datetime('now') WHERE id = ?").run(
    existing.id
  );
  res.status(204).end();
});

export default router;
