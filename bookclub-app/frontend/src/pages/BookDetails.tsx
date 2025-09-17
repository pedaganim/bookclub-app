import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Book } from '../types';

const Section: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <div className="bg-white rounded-md border border-gray-200 p-4 text-sm text-gray-800 whitespace-pre-wrap break-words">
      {children}
    </div>
  </div>
);

const BookDetails: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Defensive helpers to avoid rendering non-string values (e.g., objects like {NULL: true})
  const asText = (v: any): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    // Anything else (objects/arrays), do not render as text
    return '';
  };
  const hasText = (v: any): boolean => asText(v).trim().length > 0;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        if (!bookId) {
          setError('Missing book id');
          setLoading(false);
          return;
        }
        const b = await apiService.getBook(bookId);
        setBook(b);
      } catch (e: any) {
        setError(e?.message || 'Failed to load book');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <div className="mt-4">
          <Link to="/library" className="text-indigo-600 hover:text-indigo-800 hover:underline">Back to Library</Link>
        </div>
      </div>
    );
  }

  if (!book) return null;

  const cover = (typeof (book.coverImage as any) === 'string' && (book.coverImage as any)) ||
    "data:image/svg+xml,%3csvg width='300' height='400' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='300' height='400' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' font-size='16' fill='%23374151' text-anchor='middle' dy='.3em'%3eBook%3c/text%3e%3c/svg%3e";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6">
          <Link to="/library" className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm">← Back to Library</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="sm:flex sm:gap-6">
            <div className="sm:w-1/3">
              <div className="w-full bg-gray-100 rounded-md overflow-hidden" style={{ aspectRatio: '3 / 4' }}>
                <img src={cover} alt={book.title ? `Cover of ${book.title}` : 'Book cover'} className="w-full h-full object-cover object-center" />
              </div>
            </div>
            <div className="sm:w-2/3 mt-4 sm:mt-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{asText(book.title) || 'Untitled Book'}</h1>
              <p className="text-gray-700 mb-1"><span className="font-medium">Author:</span> {asText(book.author) || 'Unknown'}</p>
              {book.userName && (
                <p className="text-gray-700 mb-1"><span className="font-medium">Owner:</span> {book.userName}</p>
              )}
              {(book.clubName || book.clubId) && (
                <p className="text-gray-700 mb-1">
                  <span className="font-medium">Club:</span> {book.clubName || 'Member Club'}
                  {book.clubId && (
                    <>
                      {' '}
                      <Link to="/clubs" className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm">(manage)</Link>
                    </>
                  )}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm">
                {hasText(book.isbn10) && (<p className="text-gray-600"><span className="font-medium">ISBN-10:</span> {asText(book.isbn10)}</p>)}
                {hasText(book.isbn13) && (<p className="text-gray-600"><span className="font-medium">ISBN-13:</span> {asText(book.isbn13)}</p>)}
                {hasText(book.publishedDate) && (<p className="text-gray-600"><span className="font-medium">Published:</span> {asText(book.publishedDate)}</p>)}
                {hasText(book.pageCount) && (<p className="text-gray-600"><span className="font-medium">Pages:</span> {asText(book.pageCount)}</p>)}
                {hasText(book.language) && (<p className="text-gray-600"><span className="font-medium">Language:</span> {asText(book.language)}</p>)}
                {hasText(book.publisher) && (<p className="text-gray-600"><span className="font-medium">Publisher:</span> {asText(book.publisher)}</p>)}
              </div>
            </div>
          </div>

          {/* Tabs for content sections */}
          <div className="mt-6">
            <TabView book={{
              ...book,
              // Coerce fields used inside tabs to safe strings
              description: asText(book.description) || undefined,
              textractExtractedText: asText((book as any).textractExtractedText) || undefined,
              clean_description: asText((book as any).clean_description) || undefined,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const TabView: React.FC<{ book: Book }> = ({ book }) => {
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'extracted', label: 'Extracted' },
    { key: 'clean', label: 'Cleaned' },
    { key: 'google', label: 'Google Metadata' },
  ] as const;
  const [active, setActive] = React.useState<typeof tabs[number]['key']>('overview');
  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${active === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {active === 'overview' && (
          <>
            {book.description ? (
              <Section title="Description">{book.description}</Section>
            ) : (
              <div className="text-sm text-gray-500">No description available.</div>
            )}
          </>
        )}
        {active === 'extracted' && (
          book.textractExtractedText ? (
            <Section title={`Extracted Text${book.textractConfidence ? ` (confidence ${book.textractConfidence}%)` : ''}`}>
              {book.textractExtractedText}
            </Section>
          ) : (
            <div className="text-sm text-gray-500">No extracted text available.</div>
          )
        )}
        {active === 'clean' && (
          book.clean_description ? (
            <Section title="Clean Description">{book.clean_description}</Section>
          ) : (
            <div className="text-sm text-gray-500">No cleaned description available.</div>
          )
        )}
        {active === 'google' && (
          book.google_metadata ? (
            <Section title="Google Metadata (raw)"><pre className="text-xs overflow-auto">{JSON.stringify(book.google_metadata, null, 2)}</pre></Section>
          ) : (
            <div className="text-sm text-gray-500">No Google metadata available.</div>
          )
        )}
      </div>
    </div>
  );
};

export default BookDetails;
