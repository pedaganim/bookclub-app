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

  const renderGoogleMetadata = (meta: any) => {
    if (!meta || typeof meta !== 'object') return null;
    const v = (meta as any).volumeInfo || meta;
    const title = asText(v.title);
    const authors = Array.isArray(v.authors) ? v.authors.filter(Boolean).join(', ') : asText(v.authors);
    const publisher = asText(v.publisher);
    const publishedDate = asText(v.publishedDate);
    const categories = Array.isArray(v.categories) ? v.categories.filter(Boolean).join(', ') : asText(v.categories);
    const pageCount = typeof v.pageCount === 'number' ? String(v.pageCount) : asText(v.pageCount);
    const language = asText(v.language);
    const description = asText(v.description);
    const identifiers = Array.isArray(v.industryIdentifiers)
      ? v.industryIdentifiers
          .map((id: any) => {
            const type = asText(id?.type);
            const val = asText(id?.identifier);
            return type && val ? `${type}: ${val}` : val || '';
          })
          .filter(Boolean)
          .join(' · ')
      : '';

    const rows: Array<{ label: string; value: string }> = [];
    if (title) rows.push({ label: 'Title', value: title });
    if (authors) rows.push({ label: 'Authors', value: authors });
    if (publisher) rows.push({ label: 'Publisher', value: publisher });
    if (publishedDate) rows.push({ label: 'Published', value: publishedDate });
    if (categories) rows.push({ label: 'Categories', value: categories });
    if (pageCount) rows.push({ label: 'Pages', value: pageCount });
    if (language) rows.push({ label: 'Language', value: language });
    if (identifiers) rows.push({ label: 'Identifiers', value: identifiers });

    return (
      <div className="space-y-2">
        {rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {rows.map((r, i) => (
              <p key={i} className="text-gray-700"><span className="font-medium">{r.label}:</span> {r.value}</p>
            ))}
          </div>
        )}
        {description && (
          <Section title="Description">{description}</Section>
        )}
        {/* Fallback raw JSON (collapsed view could be added later) */}
        {!rows.length && !description && (
          <Section title="Google Metadata (raw)"><pre className="text-xs overflow-auto">{JSON.stringify(meta, null, 2)}</pre></Section>
        )}
      </div>
    );
  };

  const renderMcpMetadata = (meta: any) => {
    if (!meta || typeof meta !== 'object') return null;
    const titleCands: Array<{ value: string; confidence?: number }> = Array.isArray((meta as any).title_candidates) ? (meta as any).title_candidates : [];
    const authorCands: Array<{ value: string; confidence?: number }> = Array.isArray((meta as any).author_candidates) ? (meta as any).author_candidates : [];
    const lang = asText((meta as any).language_guess) || 'en';
    const source = asText((meta as any).source) || 'mcp';

    const fmt = (arr: Array<{ value: string; confidence?: number }>) =>
      arr.filter(Boolean).map((c, i) => (
        <li key={i} className="text-sm text-gray-700">
          <span className="font-medium">{asText(c.value)}</span>
          {typeof c.confidence === 'number' && (
            <span className="text-gray-500"> (conf {Math.round((c.confidence as number) * 100)}%)</span>
          )}
        </li>
      ));

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Source: {source} · Language: {lang}</div>
        {titleCands.length > 0 ? (
          <Section title="Title Candidates">
            <ul className="list-disc ml-5 space-y-1">{fmt(titleCands)}</ul>
          </Section>
        ) : (
          <div className="text-sm text-gray-500">No title candidates.</div>
        )}
        {authorCands.length > 0 ? (
          <Section title="Author Candidates">
            <ul className="list-disc ml-5 space-y-1">{fmt(authorCands)}</ul>
          </Section>
        ) : (
          <div className="text-sm text-gray-500">No author candidates.</div>
        )}
      </div>
    );
  };

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

          {/* Inline sections (no tabs) */}
          <div className="mt-6 space-y-4">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview</h3>
              {hasText(book.description) ? (
                <Section title="Description">{asText(book.description)}</Section>
              ) : (
                <div className="text-sm text-gray-500">No description available.</div>
              )}
            </div>

            {/* Extracted */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Extracted</h3>
              {hasText((book as any).textractExtractedText) ? (
                <Section title={`Extracted Text${(book as any).textractConfidence ? ` (confidence ${(book as any).textractConfidence}%)` : ''}`}>
                  {asText((book as any).textractExtractedText)}
                </Section>
              ) : (
                <div className="text-sm text-gray-500">No extracted text available.</div>
              )}
            </div>

            {/* Cleaned */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cleaned</h3>
              {hasText((book as any).clean_description) ? (
                <Section title="Clean Description">{asText((book as any).clean_description)}</Section>
              ) : (
                <div className="text-sm text-gray-500">No cleaned description available.</div>
              )}
            </div>

            {/* Google Metadata */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Metadata</h3>
              {(book as any).google_metadata ? (
                renderGoogleMetadata((book as any).google_metadata)
              ) : (
                <div className="text-sm text-gray-500">No Google metadata available.</div>
              )}
            </div>

            {/* MCP Analysis */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">MCP Analysis</h3>
              {(book as any).mcp_metadata ? (
                renderMcpMetadata((book as any).mcp_metadata)
              ) : (
                <div className="text-sm text-gray-500">No MCP analysis available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
