import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import ListingCard from '../components/ListingCard';
import CategorySidebar from '../components/CategorySidebar';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    api
      .get('/api/listings/category-counts')
      .then((data) => setCounts(data.counts))
      .catch(() => {});
  }, [listings.length]);

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

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const activeLabel = CATEGORIES.find((c) => c.value === category)?.label;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      <aside className="hidden md:block sticky top-16 self-start">
        <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Categories
        </h2>
        <CategorySidebar active={category} onSelect={setCategory} counts={counts} total={totalCount} />
      </aside>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sneakers, streetwear, electronics…"
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="md:hidden rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {activeLabel || 'All listings'}
          </h1>
          {!loading && <span className="text-sm text-slate-400">{listings.length} results</span>}
        </div>

        {error && <p className="text-rose-600 mb-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500">Loading listings…</p>
        ) : listings.length === 0 ? (
          <p className="text-slate-500">No listings found. Try a different search or category.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
