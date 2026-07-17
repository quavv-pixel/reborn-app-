import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/constants';

export default function ListingCard({ listing }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-slate-900"
    >
      <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium truncate">{listing.title}</h3>
          {listing.status === 'sold' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 shrink-0">
              Sold
            </span>
          )}
        </div>
        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          {formatPrice(listing.priceCents)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {listing.seller.displayName}
          {listing.seller.isSupplier ? ' · Supplier' : ''}
        </p>
      </div>
    </Link>
  );
}
