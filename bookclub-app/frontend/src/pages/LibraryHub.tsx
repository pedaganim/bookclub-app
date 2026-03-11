import React from 'react';
import { Link } from 'react-router-dom';
import { LIBRARY_CONFIGS } from '../config/libraryConfig';

// Book Library card (special — uses existing backend, separate route)
const BOOK_LIBRARY = {
  label: 'Book Library',
  emoji: '📚',
  tagline: 'Browse and borrow books',
  accentBg: 'bg-amber-100',
  accentText: 'text-amber-700',
  route: '/library',
};

const LibraryHub: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Community Library — All Libraries';
    const metaDesc = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
      return m;
    })();
    (metaDesc as HTMLMetaElement).setAttribute('content',
      'One place to borrow books, toys, tools, event gear and more from your local community.'
    );
  }, []);

  const allCards = [
    { ...BOOK_LIBRARY, itemCount: null },
    ...LIBRARY_CONFIGS.map((cfg) => ({
      label: cfg.label,
      emoji: cfg.emoji,
      tagline: cfg.tagline,
      accentBg: cfg.accentBg,
      accentText: cfg.accentText,
      route: `/libraries/${cfg.slug}`,
      itemCount: null,
    })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Community Library</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Borrow, share and discover together. One place for books, toys, tools and more.
          </p>
        </div>
      </div>

      {/* Library cards grid */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">Browse Libraries</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {allCards.map((card) => (
            <Link
              key={card.route}
              to={card.route}
              className={`group rounded-2xl p-6 flex flex-col items-start gap-3 transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${card.accentBg}`}
            >
              <span className="text-4xl" role="img" aria-label={card.label}>
                {card.emoji}
              </span>
              <div>
                <p className={`font-semibold text-base ${card.accentText}`}>{card.label}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">{card.tagline}</p>
              </div>
              <span className={`mt-auto text-xs font-medium ${card.accentText} group-hover:underline`}>
                Browse →
              </span>
            </Link>
          ))}

          {/* Suggest a Library card */}
          <div className="rounded-2xl p-6 flex flex-col items-start gap-3 bg-gray-100 border-2 border-dashed border-gray-300 cursor-default">
            <span className="text-4xl">➕</span>
            <div>
              <p className="font-semibold text-base text-gray-500">More coming soon</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">New libraries are added regularly</p>
            </div>
          </div>
        </div>

        {/* Quick tip */}
        <div className="mt-10 rounded-2xl bg-indigo-50 border border-indigo-100 px-6 py-5 flex gap-4 items-start">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="font-semibold text-indigo-900 text-sm">How it works</p>
            <p className="text-sm text-indigo-700 mt-1">
              Find an item you need → click <strong>Contact Owner</strong> to send them a message → arrange to pick it up.
              Want to share something? Click <strong>Post an Item</strong> inside any library.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryHub;
