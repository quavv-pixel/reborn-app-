import { Link } from 'react-router-dom';
import { CONDITIONS, formatPrice } from '../lib/constants';

const CONDITION_LABEL = Object.fromEntries(CONDITIONS.map((c) => [c.value, c.label]));

export default function ListingCard({ listing }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all bg-white dark:bg-slate-900"
    >
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            No image
          </div>
        )}
        <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-slate-700 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
          {CONDITION_LABEL[listing.condition] || listing.condition}
        </span>
        {listing.status === 'sold' && (
          <span className="absolute top-2 right-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-600 text-white">
            Sold
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium truncate text-sm text-slate-700 dark:text-slate-300">{listing.title}</h3>
        <p className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
          {formatPrice(listing.priceCents)}
        </p>
        <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">
            {listing.seller.displayName}
            {listing.seller.isSupplier && (
              <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-medium">&middot; Supplier</span>
            )}
          </span>
          {listing.location && <span className="shrink-0 ml-2 truncate max-w-[40%]">{listing.location}</span>}
        </div>
      </div>
    </Link>
  );
}
