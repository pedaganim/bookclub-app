import React from 'react';
import { Link } from 'react-router-dom';
import { LIBRARY_CONFIGS } from '../config/libraryConfig';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';


const LibraryHub: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO 
        title="Community Library — Share & Borrow Together"
        description="One place to borrow books, toys, tools, event gear and more from your local community. Discover, share and borrow together."
      />
      
      {/* Library categories section */}
      <div id="browse-libraries" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-grow">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">The Collection</h2>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-none uppercase italic">
              Explore Our <span className="text-gray-400">Libraries</span>
            </h3>
          </div>
          <p className="text-gray-500 max-w-sm text-sm font-medium">
            Each library is managed by your local neighbors. Pick a category and see what's available today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {LIBRARY_CONFIGS.map((lib) => (
            <Link
              key={lib.slug}
              to={`/library/${lib.slug}`}
              className="group relative bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col"
            >
              {/* Decorative accent */}
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700 ${lib.accentBg}`} />
              
              <div className="mb-8 relative">
                <span className="text-6xl block group-hover:scale-110 transition-transform duration-500 origin-left" role="img" aria-label={lib.label}>
                  {lib.emoji}
                </span>
              </div>
              
              <div className="relative flex-grow">
                <h4 className={`text-2xl font-bold mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight`}>
                  {lib.label}
                </h4>
                <p className="text-gray-500 leading-relaxed font-medium">
                  {lib.tagline}. {lib.description}
                </p>
              </div>
              
              <div className="mt-10 pt-6 border-t border-gray-50 flex items-center justify-between">
                <span className={`text-[11px] font-black uppercase tracking-widest ${lib.accentText}`}>
                  View items →
                </span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${lib.accentBg} ${lib.accentText} group-hover:bg-indigo-600 group-hover:text-white`}>
                   +
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* High-Impact Hero Section (Moved Below Libraries) */}
      <div className="relative overflow-hidden bg-white border-t border-gray-100">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-indigo-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-50 rounded-full blur-3xl opacity-50" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 tracking-tighter mb-6 uppercase italic">
            Borrow <span className="text-indigo-600">Everything.</span><br />
            Share Your <span className="text-amber-500 underline decoration-amber-200">World.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Join thousands of neighbors sharing books, tools, toys, and more. 
            Save money, reduce waste, and build a stronger community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-tight hover:bg-black transition-all shadow-2xl active:scale-95"
            >
              Start Browsing
            </button>
            {isAuthenticated ? (
              <Link 
                to="/my-library"
                className="w-full sm:w-auto px-10 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 block sm:inline-block"
              >
                Go to My Dashboard
              </Link>
            ) : (
              <Link 
                to="/login"
                className="w-full sm:w-auto px-10 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 block sm:inline-block"
              >
                Join the Community
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Footer-like Tip Section */}
      <div className="bg-indigo-900 py-16 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h3 className="text-3xl font-black uppercase tracking-tight mb-4 italic leading-tight">Ready to declutter your life?</h3>
          <p className="text-indigo-100 mb-8 text-lg">
            Start sharing the things you don't use every day and discover hidden treasures in your neighborhood.
          </p>
          <Link 
            to={isAuthenticated ? "/my-library" : "/login"}
            className="inline-block px-12 py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-tight hover:bg-indigo-50 transition-all"
          >
            {isAuthenticated ? "Go to Dashboard" : "Get Started Now"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LibraryHub;
