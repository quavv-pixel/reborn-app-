import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatPrice } from '../lib/constants';
import ListingCard from '../components/ListingCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/api/listings/mine'), api.get('/api/orders/mine')])
      .then(([listingsData, ordersData]) => {
        setListings(listingsData.listings);
        setOrders(ordersData.orders);
      })
      .catch((err) => setError(err.message));
  }, []);

  const purchases = orders.filter((o) => o.buyerId === user.id);
  const sales = orders.filter((o) => o.sellerId === user.id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-2xl font-bold">Your dashboard</h1>
      {error && <p className="text-rose-600">{error}</p>}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Your listings</h2>
          <Link to="/listings/new" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            + New listing
          </Link>
        </div>
        {listings.length === 0 ? (
          <p className="text-slate-500 text-sm">You haven't listed anything yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your purchases</h2>
        <OrderTable orders={purchases} emptyText="You haven't bought anything yet." />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your sales</h2>
        <OrderTable orders={sales} emptyText="No sales yet." />
      </section>
    </div>
  );
}

function OrderTable({ orders, emptyText }) {
  if (orders.length === 0) return <p className="text-slate-500 text-sm">{emptyText}</p>;
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      {orders.map((o) => (
        <div
          key={o.id}
          className="flex items-center justify-between p-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800/60"
        >
          <Link to={`/listings/${o.listing.id}`} className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
            {o.listing.title}
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{formatPrice(o.amountCents)}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                o.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            >
              {o.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
