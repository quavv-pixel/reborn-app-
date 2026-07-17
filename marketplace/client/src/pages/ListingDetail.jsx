import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CONDITIONS, formatPrice } from '../lib/constants';

const CONDITION_LABEL = Object.fromEntries(CONDITIONS.map((c) => [c.value, c.label]));

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');

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

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    const amountCents = Math.round(parseFloat(offerAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter a valid offer amount');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.post('/api/offers', { listingId: listing.id, amountCents });
      navigate(`/messages?conversation=${data.conversationId}`);
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
  const suggestedOffers = [0.85, 0.75, 0.65].map((pct) => Math.round((listing.priceCents * pct) / 100));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 grid sm:grid-cols-2 gap-8">
      <div>
        <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              No image
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {CONDITION_LABEL[listing.condition] || listing.condition}
          </span>
          {listing.location && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {listing.location}
            </span>
          )}
          {listing.status === 'sold' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              Sold
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{listing.title}</h1>
        <p className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-2 tabular-nums">
          {formatPrice(listing.priceCents)}
        </p>

        <div className="flex items-center gap-2.5 mt-4 py-3 border-y border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {listing.seller.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
              {listing.seller.displayName}
            </p>
            {listing.seller.isSupplier && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2 14.5 9H22l-6 4.5L18.5 21 12 16.5 5.5 21 8 13.5 2 9h7.5Z" />
                </svg>
                Verified supplier
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          {listing.description || 'No description provided.'}
        </p>

        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}

        {!isOwner && listing.status === 'active' && !showOfferForm && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleBuy}
              disabled={busy}
              className="flex-1 py-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50"
            >
              Buy now
            </button>
            <button
              onClick={() => setShowOfferForm(true)}
              disabled={busy}
              className="flex-1 py-3 rounded-lg border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Make offer
            </button>
          </div>
        )}

        {!isOwner && listing.status === 'active' && showOfferForm && (
          <form onSubmit={handleSubmitOffer} className="mt-6 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">Your offer</label>
            <div className="flex gap-2 mb-3">
              <span className="flex items-center px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500">
                $
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                autoFocus
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder={(listing.priceCents / 100).toFixed(2)}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
            <div className="flex gap-2 mb-4">
              {suggestedOffers.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setOfferAmount(amt.toFixed(2))}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ${amt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50"
              >
                Send offer
              </button>
              <button
                type="button"
                onClick={() => setShowOfferForm(false)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!isOwner && listing.status === 'active' && (
          <button
            onClick={handleMessageSeller}
            disabled={busy}
            className="mt-3 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
          >
            Message seller instead
          </button>
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
