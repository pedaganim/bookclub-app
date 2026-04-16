import React from 'react';
import { ToyListing } from '../types';

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-green-100 text-green-800' },
  like_new: { label: 'Like New', color: 'bg-teal-100 text-teal-800' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
};

const CATEGORY_LABELS: Record<string, string> = {
  books: '📚 Books',
  outdoor: '🌳 Outdoor',
  educational: '🎓 Educational',
  dolls: '🧸 Dolls',
  vehicles: '🚗 Vehicles',
  other: '🎁 Other',
};

interface ToyListingCardProps {
  listing: ToyListing;
  onDelete?: (listingId: string) => void;
  isDeleting?: boolean;
}

const ToyListingCard: React.FC<ToyListingCardProps> = ({ listing, onDelete, isDeleting }) => {
  const condition = CONDITION_LABELS[listing.condition] ?? { label: listing.condition, color: 'bg-gray-100 text-gray-700' };
  const category = listing.category ? CATEGORY_LABELS[listing.category] ?? listing.category : null;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col">
      {/* Status badge */}
      {listing.status === 'swapped' && (
        <div className="absolute top-3 right-3 bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
          Swapped
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${condition.color}`}>
            {condition.label}
          </span>
          {category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {category}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">{listing.title}</h3>

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
        )}

        {/* Want in return */}
        {listing.wantInReturn && (
          <p className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mb-3">
            <span className="font-medium">Looking for:</span> {listing.wantInReturn}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex flex-col gap-0.5">
            {listing.userName && <span className="font-medium text-gray-700">{listing.userName}</span>}
            {listing.location && <span>📍 {listing.location}</span>}
            <span>{timeAgo(listing.createdAt)}</span>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(listing.listingId)}
              disabled={isDeleting}
              aria-label="Delete listing"
              className="ml-3 flex-shrink-0 text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
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
  );
};

export default ToyListingCard;
