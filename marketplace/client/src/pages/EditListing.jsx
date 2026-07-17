import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ListingForm from '../components/ListingForm';
import { api } from '../lib/api';

export default function EditListing() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/listings/${id}`)
      .then((data) => setListing(data.listing))
      .catch((err) => setError(err.message));
  }, [id]);

  const handleSubmit = async (payload) => {
    await api.patch(`/api/listings/${id}`, payload);
    navigate(`/listings/${id}`);
  };

  const handleRemove = async () => {
    if (!confirm('Remove this listing? This cannot be undone.')) return;
    await api.delete(`/api/listings/${id}`);
    navigate('/dashboard');
  };

  if (error) return <p className="max-w-lg mx-auto px-4 py-8 text-rose-600">{error}</p>;
  if (!listing) return <p className="max-w-lg mx-auto px-4 py-8 text-slate-500">Loading…</p>;
  if (listing.seller.id !== user?.id) {
    return <p className="max-w-lg mx-auto px-4 py-8 text-rose-600">You don't own this listing.</p>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit listing</h1>
      <ListingForm initial={listing} onSubmit={handleSubmit} submitLabel="Save changes" />
      <button
        onClick={handleRemove}
        className="mt-4 w-full py-2 rounded-md border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
      >
        Remove listing
      </button>
    </div>
  );
}
