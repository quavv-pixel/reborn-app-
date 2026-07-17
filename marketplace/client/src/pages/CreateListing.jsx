import { useNavigate } from 'react-router-dom';
import ListingForm from '../components/ListingForm';
import { api } from '../lib/api';

export default function CreateListing() {
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    const data = await api.post('/api/listings', payload);
    navigate(`/listings/${data.listing.id}`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">List an item for sale</h1>
      <ListingForm onSubmit={handleSubmit} submitLabel="Publish listing" />
    </div>
  );
}
