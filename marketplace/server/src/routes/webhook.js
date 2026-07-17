import Stripe from 'stripe';
import db from '../db/index.js';

export function stripeWebhookHandler(req, res) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !stripeSecretKey) {
    return res.status(503).send('Stripe is not configured on this server');
  }
  const stripe = new Stripe(stripeSecretKey);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const order = db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(session.id);
    if (order && order.status !== 'paid') {
      const markPaid = db.transaction(() => {
        db.prepare(
          "UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?"
        ).run(order.id);
        db.prepare(
          "UPDATE listings SET status = 'sold', updated_at = datetime('now') WHERE id = ?"
        ).run(order.listing_id);
      });
      markPaid();
    }
  }

  res.json({ received: true });
}
