import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatPrice } from '../lib/constants';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/api/listings/${id}`)
      .then((data) => setListing(data.listing))
      .catch((err) => setError(err.message));
  }, [id]);

  const handleMessageSeller = async () => {
    if (!user) return navigate('/login');
    setBusy(true);
    setError('');
    try {
      const data = await api.post('/api/conversations', { listingId: listing.id });
      navigate(`/messages?conversation=${data.conversation.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBuy = async () => {
    if (!user) return navigate('/login');
    setBusy(true);
    setError('');
    try {
      const data = await api.post('/api/orders/checkout', { listingId: listing.id });
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (error && !listing) {
    return <p className="max-w-3xl mx-auto px-4 py-8 text-rose-600">{error}</p>;
  }
  if (!listing) {
    return <p className="max-w-3xl mx-auto px-4 py-8 text-slate-500">Loading…</p>;
  }

  const isOwner = user?.id === listing.seller.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 grid sm:grid-cols-2 gap-8">
      <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No image
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
          {formatPrice(listing.priceCents)}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Sold by {listing.seller.displayName}
          {listing.seller.isSupplier ? ' · Supplier' : ''} · {listing.condition.replace('_', ' ')}
        </p>
        {listing.status === 'sold' && (
          <p className="mt-3 inline-block text-sm px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            This item has been sold
          </p>
        )}
        <p className="mt-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {listing.description || 'No description provided.'}
        </p>

        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}

        {!isOwner && listing.status === 'active' && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleBuy}
              disabled={busy}
              className="flex-1 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Buy now
            </button>
            <button
              onClick={handleMessageSeller}
              disabled={busy}
              className="flex-1 py-2 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Message seller
            </button>
          </div>
        )}
        {isOwner && (
          <div className="mt-6">
            <button
              onClick={() => navigate(`/listings/${listing.id}/edit`)}
              className="py-2 px-4 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Edit listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
