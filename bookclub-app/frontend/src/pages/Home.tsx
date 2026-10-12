import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book, BookClub } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import PublicBookCard from '../components/PublicBookCard';
import SEO from '../components/SEO';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  MapPinIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface PrototypeActivity {
  id: string;
  title: string;
  category: 'Arts' | 'STEM' | 'Outdoors' | 'Sport' | 'Reading' | 'Dance';
  suburb: string;
  minAge: number;
  maxAge: number;
  cost: number | null;
  date: string;
  time: string;
  description: string;
  host: string;
  distance: string;
}

const SAMPLE_ACTIVITIES: PrototypeActivity[] = [
  {
    id: 'act-1',
    title: 'Creative little makers',
    category: 'Arts',
    suburb: 'Werribee',
    minAge: 5,
    maxAge: 12,
    cost: 0,
    date: '2026-12-21',
    time: '09:30',
    description: 'A morning of colour, clay and big ideas. Create something wonderful to take home.',
    host: 'Community Arts Studio',
    distance: '350 m away',
  },
  {
    id: 'act-2',
    title: 'Build a robot, change the world',
    category: 'STEM',
    suburb: 'Tarneit',
    minAge: 8,
    maxAge: 14,
    cost: 35,
    date: '2026-12-22',
    time: '10:00',
    description: 'Team up, experiment and bring your very own robot creation to life with local junior makers.',
    host: 'Little Inventors',
    distance: '750 m away',
  },
  {
    id: 'act-3',
    title: 'Wild explorers club',
    category: 'Outdoors',
    suburb: 'Point Cook',
    minAge: 6,
    maxAge: 12,
    cost: 15,
    date: '2026-12-23',
    time: '09:00',
    description: 'Discover nature through a guided trail, scavenger hunt and outdoor games in the local park.',
    host: 'Nature Neighbours',
    distance: '1.2 km away',
  },
  {
    id: 'act-4',
    title: 'Cricket, friends & sunshine',
    category: 'Sport',
    suburb: 'Hoppers Crossing',
    minAge: 7,
    maxAge: 13,
    cost: 20,
    date: '2027-01-05',
    time: '09:30',
    description: 'Learn cricket basics and have a go with friendly neighbourhood coaches. All abilities welcome.',
    host: 'Community Cricket',
    distance: '1.8 km away',
  },
  {
    id: 'act-5',
    title: 'Stories come to life',
    category: 'Reading',
    suburb: 'Wyndham Vale',
    minAge: 4,
    maxAge: 9,
    cost: 0,
    date: '2027-01-06',
    time: '11:00',
    description: 'Storytelling, dress-ups and creative play for curious young minds. Parents stay and connect.',
    host: 'Local Learning Collective',
    distance: '600 m away',
  },
  {
    id: 'act-6',
    title: 'Move, groove & make friends',
    category: 'Dance',
    suburb: 'Tarneit',
    minAge: 6,
    maxAge: 15,
    cost: 25,
    date: '2027-01-07',
    time: '10:00',
    description: 'A joyful introduction to dance with games, music and a mini performance with neighbours.',
    host: 'Happy Feet Studio',
    distance: '900 m away',
  },
];

const CategoryArt: React.FC<{ category: string; className?: string }> = ({ category, className = 'h-36 w-full' }) => {
  const styles: Record<string, { bg: string; fill: string; accent: string }> = {
    Arts: { bg: '#faeae1', fill: '#d18765', accent: '#f7d0bd' },
    STEM: { bg: '#e5edf5', fill: '#5f8cb4', accent: '#c6daf0' },
    Outdoors: { bg: '#e7edd8', fill: '#779958', accent: '#cfdec0' },
    Sport: { bg: '#faedd2', fill: '#d4a13e', accent: '#f7e0aa' },
    Reading: { bg: '#ede5f0', fill: '#9c81b0', accent: '#dccee3' },
    Dance: { bg: '#f7e1e7', fill: '#c97792', accent: '#f5c6d3' },
  };

  const c = styles[category] || styles.Arts;

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`} style={{ backgroundColor: c.bg }}>
      <svg viewBox="0 0 400 200" className="w-full h-full object-cover" aria-hidden="true">
        <circle cx="320" cy="40" r="72" fill={c.fill} opacity="0.18" />
        <path d="M0 180 Q120 130 220 170 T400 150 V200 H0" fill={c.fill} opacity="0.25" />
        {category === 'STEM' && (
          <g fill={c.fill}>
            <rect x="150" y="60" width="100" height="90" rx="16" />
            <circle cx="180" cy="95" r="9" fill="#fff" />
            <circle cx="220" cy="95" r="9" fill="#fff" />
            <path d="M180 128 H220 M200 60 V35" stroke="#fff" strokeWidth="6" />
            <circle cx="200" cy="32" r="8" fill={c.fill} />
          </g>
        )}
        {category === 'Reading' && (
          <g fill={c.fill}>
            <path d="M100 65 Q150 45 200 70 V165 Q150 140 100 160 Z" />
            <path d="M200 70 Q250 45 300 65 V160 Q250 140 200 165 Z" fill="#fff" opacity="0.9" />
          </g>
        )}
        {category === 'Sport' && (
          <g fill={c.fill}>
            <circle cx="200" cy="105" r="55" />
            <path d="M170 60 Q220 100 170 150" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="5 5" />
            <path d="M180 55 Q230 100 180 155" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="5 5" />
          </g>
        )}
        {category === 'Outdoors' && (
          <g fill={c.fill}>
            <path d="M110 160 L155 50 L200 160 Z" />
            <path d="M185 160 L240 70 L295 160 Z" fill={c.accent} />
          </g>
        )}
        {category === 'Dance' && (
          <g fill={c.fill}>
            <path d="M180 120 V50 L235 38 V105" stroke={c.fill} strokeWidth="12" fill="none" />
            <ellipse cx="165" cy="125" rx="20" ry="15" />
            <ellipse cx="222" cy="110" rx="20" ry="15" />
          </g>
        )}
        {(category === 'Arts' || !['STEM', 'Reading', 'Sport', 'Outdoors', 'Dance'].includes(category)) && (
          <g fill={c.fill}>
            <path d="M130 160 L150 65 L205 80 L185 175 Z" />
            <path d="M210 158 L240 48 L270 57 L240 168 Z" fill="#fff" opacity="0.8" />
            <circle cx="130" cy="70" r="16" fill={c.accent} />
          </g>
        )}
      </svg>
    </div>
  );
};

const Home: React.FC = () => {
  const { name: brandName } = useBrand();
  const { isAuthenticated, canAccessClubs } = useAuth();
  const navigate = useNavigate();

  const [activeClub, setActiveClub] = useState<BookClub | null>(null);
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [lostFoundCount, setLostFoundCount] = useState<number>(2);
  const [selectedActivity, setSelectedActivity] = useState<PrototypeActivity | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch user clubs/neighbourhoods if authenticated
      if (isAuthenticated) {
        try {
          const clubRes = await apiService.getUserClubs();
          const activeList: BookClub[] = (clubRes.items || []).filter((c: any) => c.userStatus === 'active');
          if (activeList.length > 0) {
            const first = activeList[0];
            setActiveClub(first);
          }
        } catch {
          // ignore
        }
      }

      // 2. Fetch public library items
      try {
        const booksRes = await apiService.listBooksPublic({ limit: 6, bare: true });
        const items = Array.isArray(booksRes.items) ? booksRes.items : [];
        const normalItems = items.filter((b: any) => b.category !== 'lost_found').slice(0, 4);
        const lostItems = items.filter((b: any) => b.category === 'lost_found');
        setLibraryBooks(normalItems);
        if (lostItems.length > 0) {
          setLostFoundCount(lostItems.length);
        }
      } catch {
        setLibraryBooks([]);
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (isoOrYmd: string) => {
    try {
      const d = new Date(isoOrYmd.includes('T') ? isoOrYmd : `${isoOrYmd}T12:00:00`);
      return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return isoOrYmd;
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-gray-900 pb-16">
      <SEO
        title={`${brandName} — Your neighbourhood, more to share`}
        description="Discover local holiday activities for families, borrow books and toys around the corner, and connect with your neighbourhood."
      />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
        
        {/* Active Neighbourhood Bar */}
        <div className="bg-white border border-[#dfe6dc] rounded-2xl px-5 py-3.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              ⌖ Your Neighbourhood
            </span>
            <div className="text-sm font-semibold text-gray-800">
              {activeClub ? activeClub.name : 'Wyndham Pilot · Local Neighbourhood'}
              <span className="ml-2 text-xs font-medium text-gray-400">
                {isAuthenticated ? (activeClub ? 'Active member' : 'Demo member') : 'Community preview'}
              </span>
            </div>
          </div>
          <Link
            to={canAccessClubs ? "/neighbourhoods" : "/neighbourhoods/browse"}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            {activeClub ? 'Change neighbourhood →' : 'Browse neighbourhoods →'}
          </Link>
        </div>

        {/* Hero Section (Activities Highlighted First) */}
        <section className="bg-gradient-to-br from-[#e4f1e8] via-[#e8f0dc] to-[#edf4e8] border border-[#d6e5d8] rounded-3xl overflow-hidden mb-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center">
            <div className="p-8 md:p-12 md:col-span-7">
              <span className="inline-block uppercase tracking-widest text-[11px] font-black text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full mb-3">
                A little closer · A lot more connected
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#173f35] tracking-tight leading-tight">
                Your neighbourhood.<br />
                <span className="text-emerald-700">More to share.</span>
              </h1>
              <p className="mt-3 text-base text-[#476054] max-w-lg leading-relaxed">
                Discover holiday activities for your kids, borrow useful items around the corner, or bring the neighbours together. It all starts close to home.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={canAccessClubs ? "/activities" : "/neighbourhoods"}
                  className="px-6 py-3 rounded-xl bg-[#175244] hover:bg-[#114035] text-white font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                >
                  Explore activities
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  to="/library"
                  className="px-5 py-3 rounded-xl bg-white/90 hover:bg-white text-[#173f35] border border-[#ccdacf] font-semibold text-sm transition-all shadow-xs"
                >
                  Browse library
                </Link>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Summer school holidays & weekend community gatherings
              </div>
            </div>

            {/* Hero Graphic / SVG Art */}
            <div className="p-6 md:p-8 md:col-span-5 flex justify-center items-center">
              <div className="w-full max-w-sm bg-white/70 backdrop-blur-xs rounded-2xl p-4 border border-white/60 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center justify-between">
                  <span>Happening Nearby</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">Today</span>
                </div>
                <div className="space-y-2.5">
                  {SAMPLE_ACTIVITIES.slice(0, 2).map(act => (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className="cursor-pointer bg-white p-3 rounded-xl border border-gray-100 hover:border-emerald-300 transition-all flex items-center gap-3 shadow-2xs group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-105 transition-transform">
                        {act.category === 'Arts' ? '🎨' : '🤖'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{act.title}</h4>
                        <p className="text-[11px] text-gray-500">{formatDate(act.date)} · Ages {act.minAge}–{act.maxAge}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                        {act.cost === 0 ? 'Free' : `$${act.cost}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid (3 cards) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Link
            to={canAccessClubs ? "/activities" : "/neighbourhoods"}
            className="bg-white border border-[#dfe6dc] rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
              ☀️
            </div>
            <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
              Make an activity plan
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Creative workshops, sports, and holiday fun for your little adventurers.
            </p>
          </Link>

          <Link
            to="/library"
            className="bg-white border border-[#dfe6dc] rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
              ♻️
            </div>
            <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
              Borrow around the corner
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Books, toys, tools, and board games shared by your neighbours.
            </p>
          </Link>

          <Link
            to="/library/lost-found"
            className="bg-white border border-[#dfe6dc] rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
              🔎
            </div>
            <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
              Find something familiar
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Help lost scooters, toys, and keys find their way back home.
            </p>
          </Link>
        </section>

        {/* SECTION 1: ACTIVITIES (Highlighted First!) */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-2">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                Good times nearby
              </span>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                Happening in your neighbourhood
              </h2>
            </div>
            <Link
              to={canAccessClubs ? "/activities" : "/neighbourhoods"}
              className="text-sm font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 transition-colors"
            >
              All activities →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SAMPLE_ACTIVITIES.slice(0, 6).map((act) => (
              <article
                key={act.id}
                className="bg-white border border-[#dfe6dc] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col group cursor-pointer"
                onClick={() => setSelectedActivity(act)}
              >
                <div className="relative">
                  <CategoryArt category={act.category} />
                  <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-emerald-900 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                    {act.category}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-gray-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs">
                    {act.distance}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      AGES {act.minAge}–{act.maxAge} · {act.suburb}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mt-1 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {act.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-medium">
                      <CalendarDaysIcon className="h-3.5 w-3.5 text-gray-400" />
                      {formatDate(act.date)} · {act.time}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      By {act.host}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900">
                      {act.cost === 0 ? 'Free' : `$${act.cost} / session`}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
                    >
                      View activity ↗
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 2: COMMUNITY LIBRARY */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-2">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                Community library
              </span>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                Borrow around the corner
              </h2>
            </div>
            <Link
              to="/library"
              className="text-sm font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 transition-colors"
            >
              Browse library →
            </Link>
          </div>

          {libraryBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {libraryBooks.map((book) => (
                <div key={book.bookId} className="h-full">
                  <PublicBookCard book={book} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#dfe6dc] rounded-2xl p-8 text-center">
              <span className="text-3xl mb-2 inline-block">📚</span>
              <h3 className="font-bold text-gray-800 text-base">Community items ready to borrow</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Explore books, toys, sports gear, and games shared by local families in your neighbourhood.
              </p>
              <Link
                to="/library"
                className="mt-4 inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Browse all library items
              </Link>
            </div>
          )}
        </section>

        {/* SECTION 3: LOST & FOUND CALLOUT BANNER */}
        <section className="bg-gradient-to-r from-[#eef4ea] to-[#e4ede0] border border-[#d3e3cf] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              Little things · Big connections
            </span>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">
              {lostFoundCount} local Lost & Found items
            </h3>
            <p className="text-xs text-gray-600 mt-1 max-w-md">
              Help a neighbour recover something they love, or report something found in the park or street.
            </p>
          </div>
          <Link
            to="/library/lost-found"
            className="px-5 py-2.5 rounded-xl bg-white border border-[#cfddcc] text-[#173f35] font-bold text-xs hover:bg-[#175244] hover:text-white hover:border-[#175244] transition-all shadow-xs whitespace-nowrap"
          >
            View Lost & Found →
          </Link>
        </section>
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative">
              <CategoryArt category={selectedActivity.category} className="h-44 w-full" />
              <button
                onClick={() => setSelectedActivity(null)}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-600 p-1.5 rounded-full shadow-md transition-colors"
                aria-label="Close dialog"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-3 bg-white/95 text-emerald-900 font-bold text-xs px-3 py-1 rounded-full shadow-xs">
                {selectedActivity.category}
              </span>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md">
                  Ages {selectedActivity.minAge}–{selectedActivity.maxAge}
                </span>
                <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                  {selectedActivity.suburb}
                </span>
                <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md">
                  {selectedActivity.cost === 0 ? 'Free' : `$${selectedActivity.cost} / session`}
                </span>
              </div>

              <h2 className="text-2xl font-black text-gray-900 mt-2">
                {selectedActivity.title}
              </h2>

              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                {selectedActivity.description}
              </p>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mt-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-700 font-semibold">
                  <CalendarDaysIcon className="h-4 w-4 text-emerald-700" />
                  {formatDate(selectedActivity.date)} · {selectedActivity.time}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  Hosted by {selectedActivity.host} ({selectedActivity.suburb})
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActivity(null);
                    navigate(canAccessClubs ? '/activities' : '/neighbourhoods');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-sm"
                >
                  Join activity →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
