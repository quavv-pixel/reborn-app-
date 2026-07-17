import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';

import authRoutes from './routes/auth.js';
import listingsRoutes from './routes/listings.js';
import conversationsRoutes from './routes/conversations.js';
import ordersRoutes from './routes/orders.js';
import offersRoutes from './routes/offers.js';
import { stripeWebhookHandler } from './routes/webhook.js';
import { attachSocket } from './socket.js';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// Stripe webhook needs the raw body for signature verification, so it must be
// registered before the global express.json() body parser below.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/offers', offersRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = createServer(app);
const io = attachSocket(httpServer, FRONTEND_URL);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`Marketplace API listening on http://localhost:${PORT}`);
});
