import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import ListingCard from '../components/ListingCard';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/api/listings?${params.toString()}`);
        setListings(data.listings);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [q, category]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Buy and sell with the resale community</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Find deals from resellers and suppliers, or list your own items in minutes.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search listings…"
          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-rose-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading listings…</p>
      ) : listings.length === 0 ? (
        <p className="text-slate-500">No listings found. Try a different search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
