import React from 'react';
import { ToyListing } from '../types';

const CONDITION_LABELS: Record<string, { label: string; classes: string }> = {
  new: { label: 'New', classes: 'bg-green-100 text-green-800' },
  like_new: { label: 'Like New', classes: 'bg-teal-100 text-teal-800' },
  good: { label: 'Good', classes: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Fair', classes: 'bg-yellow-100 text-yellow-800' },
};

interface LibraryItemCardProps {
  listing: ToyListing;
  emoji?: string;
  onDelete?: (listingId: string) => void;
  onContact?: (listing: ToyListing) => void;
  isDeleting?: boolean;
  isContacting?: boolean;
  hideContactButton?: boolean;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
};

const LibraryItemCard: React.FC<LibraryItemCardProps> = ({
  listing,
  emoji = '📦',
  onDelete,
  onContact,
  isDeleting,
  isContacting,
  hideContactButton,
}) => {
  const condition = CONDITION_LABELS[listing.condition] ?? { label: listing.condition, classes: 'bg-gray-100 text-gray-700' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden">
      {/* Image placeholder or actual image */}
      <div className="w-full bg-gray-100 flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
        {listing.images && listing.images.length > 0 ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-5xl opacity-40" role="img" aria-label={listing.title}>{emoji}</span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {(listing.status === 'draft' || listing.status === 'pending_review') ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              AI analysing…
            </span>
          ) : (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${condition.classes}`}>
              {condition.label}
            </span>
          )}
          {listing.status === 'swapped' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              Unavailable
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug">{listing.title}</h3>

        {/* Description */}
        {listing.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{listing.description}</p>
        )}

        {/* Looking for */}
        {listing.wantInReturn && (
          <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-2.5 py-1.5 mb-3 line-clamp-1">
            <span className="font-medium">Wants:</span> {listing.wantInReturn}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-50 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div>
              {listing.userName && <span className="font-medium text-gray-600">{listing.userName}</span>}
              {listing.location && <span className="block">📍 {listing.location}</span>}
            </div>
            <span>{timeAgo(listing.createdAt)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {!hideContactButton && onContact && listing.status !== 'swapped' && (
              <button
                onClick={() => onContact(listing)}
                disabled={isContacting}
                className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {isContacting ? 'Opening…' : 'Contact Owner'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(listing.listingId)}
                disabled={isDeleting}
                aria-label="Delete listing"
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryItemCard;
