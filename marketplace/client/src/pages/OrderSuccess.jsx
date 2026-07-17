import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatPrice } from '../lib/constants';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout session.');
      return;
    }
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      attempts += 1;
      try {
        const data = await api.get(`/api/orders/by-session/${sessionId}`);
        if (cancelled) return;
        setOrder(data.order);
        if (data.order.status !== 'paid' && attempts < 8) {
          setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      {error && <p className="text-rose-600">{error}</p>}
      {!error && !order && <p className="text-slate-500">Confirming your order…</p>}
      {order && (
        <>
          <h1 className="text-2xl font-bold mb-2">
            {order.status === 'paid' ? 'Payment successful 🎉' : 'Payment processing…'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-1">{order.listing.title}</p>
          <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-6">
            {formatPrice(order.amountCents)}
          </p>
          <p className="text-sm text-slate-500 mb-6">
            {order.status === 'paid'
              ? "You can message the seller to arrange delivery details."
              : "We're waiting for confirmation from Stripe — this page will update automatically."}
          </p>
          <Link to="/dashboard" className="text-indigo-600 dark:text-indigo-400 font-medium">
            Go to your dashboard
          </Link>
        </>
      )}
    </div>
  );
}
