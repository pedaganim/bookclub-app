import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LIBRARY_CONFIGS } from '../config/libraryConfig';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const MyLibraryHub: React.FC = () => {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<Record<string, number>>({});

  const fetchSummaries = useCallback(async () => {
    if (!user) return;
    try {
      const counts: Record<string, number> = {};

      // Fetch counts for all categories in parallel using a consistent approach.
      // limit:100 ensures DynamoDB scans enough items for the FilterExpression to match.
      await Promise.all(
        LIBRARY_CONFIGS.map(async (cfg) => {
          try {
            const res = await apiService.listToyListings({
              userId: user.userId,
              libraryType: cfg.libraryType,
              limit: 100,
            });
            counts[cfg.libraryType] = res.items.length;
          } catch (e) {
            counts[cfg.libraryType] = 0;
          }
        })
      );

      setSummaries(counts);
    } catch (e) {
      // Global fail
    }
  }, [user]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title="My Library — Manage My Items"
        description="Manage your books, toys, tools, and other shared items in one place."
      />
      
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">My Library</h1>
          <p className="text-lg text-gray-600 max-w-xl">
            Manage everything you're sharing with the community.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LIBRARY_CONFIGS.map((cfg) => (
            <Link
              key={cfg.libraryType}
              to={`/my-library/${cfg.slug}`}
              className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <span className="text-5xl" role="img" aria-label={cfg.label}>
                  {cfg.emoji}
                </span>
                <div className={`${cfg.accentBg} ${cfg.accentText} px-4 py-1.5 rounded-full text-sm font-bold`}>
                  {summaries[cfg.libraryType] ?? 0} {summaries[cfg.libraryType] === 1 ? cfg.itemLabel : cfg.itemLabelPlural}
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                My {cfg.shortLabel}
              </h3>
              <p className="text-gray-500 mt-2 flex-grow">
                Manage your {cfg.itemLabelPlural}, track who has borrowed them, and add new listings.
              </p>
              
              <div className="mt-8 flex items-center text-sm font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                Manage {cfg.shortLabel} <span className="ml-2">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Global Stats or Tips section could go here */}
        <div className="mt-12 bg-indigo-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">Power Sharing 💡</h3>
            <p className="text-indigo-100">
              Items with good photos and clear descriptions are 3x more likely to be borrowed. 
              Take a moment to polish your listings!
            </p>
          </div>
          <Link 
            to="/library"
            className="px-8 py-3 bg-white text-indigo-900 rounded-2xl font-bold hover:bg-indigo-50 transition-colors"
          >
            Browse Public Library
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MyLibraryHub;
