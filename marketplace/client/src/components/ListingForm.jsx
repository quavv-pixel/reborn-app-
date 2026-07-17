import { useId, useState } from 'react';
import { CATEGORIES, CONDITIONS } from '../lib/constants';

export default function ListingForm({ initial, onSubmit, submitLabel }) {
  const ids = {
    title: useId(),
    description: useId(),
    price: useId(),
    condition: useId(),
    category: useId(),
    location: useId(),
    imageUrl: useId(),
  };
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [price, setPrice] = useState(initial ? (initial.priceCents / 100).toFixed(2) : '');
  const [category, setCategory] = useState(initial?.category || 'other');
  const [condition, setCondition] = useState(initial?.condition || 'used');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Enter a valid price');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        priceCents,
        category,
        condition,
        imageUrl: imageUrl || null,
        location: location || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={ids.title} className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          id={ids.title}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor={ids.description} className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id={ids.description}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={ids.price} className="block text-sm font-medium mb-1">
            Price (USD)
          </label>
          <input
            id={ids.price}
            required
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor={ids.condition} className="block text-sm font-medium mb-1">
            Condition
          </label>
          <select
            id={ids.condition}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={ids.category} className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          id={ids.category}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={ids.location} className="block text-sm font-medium mb-1">
            Location (optional)
          </label>
          <input
            id={ids.location}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Brooklyn, NY"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor={ids.imageUrl} className="block text-sm font-medium mb-1">
            Image URL (optional)
          </label>
          <input
            id={ids.imageUrl}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          />
        </div>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
