import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { NotificationContext } from '../contexts/NotificationContext';
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
  const { isAuthenticated, user } = useAuth();
  const notificationCtx = React.useContext(NotificationContext);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Defensive helpers to avoid rendering non-string values (e.g., objects like {NULL: true})
  const asText = (v: any): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    // Anything else (objects/arrays), do not render as text
    return '';
  };

  const handleSaveEdits = async (updates: Partial<Book>) => {
    if (!bookId) return;
    try {
      const updated = await apiService.updateBook(bookId, updates);
      setBook(updated);
      notificationCtx?.addNotification('success', 'Book updated');
      setShowEditModal(false);
    } catch (e: any) {
      notificationCtx?.addNotification('error', e?.message || 'Failed to update book');
    }
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
    const averageRating = (meta as any).averageRating ?? (v as any).averageRating;
    const ratingsCount = (meta as any).ratingsCount ?? (v as any).ratingsCount;
    const priceObj = (meta as any).price;
    const buyLink = (meta as any).buyLink;
    const isEbook = (meta as any).isEbook;
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
    if (typeof averageRating === 'number') {
      const ratingStr = ratingsCount ? `${averageRating.toFixed(1)} / 5 (${ratingsCount})` : `${averageRating.toFixed(1)} / 5`;
      rows.push({ label: 'Rating', value: ratingStr });
    }
    if (priceObj && typeof priceObj.amount === 'number') {
      const currency = priceObj.currencyCode || 'USD';
      rows.push({ label: 'Price (approx.)', value: `${currency} ${priceObj.amount.toFixed(2)}` });
    }

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
        {(buyLink || typeof isEbook === 'boolean') && (
          <div className="flex items-center gap-3 text-sm">
            {buyLink && (
              <a href={buyLink} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">Buy on Google Play</a>
            )}
            {typeof isEbook === 'boolean' && (
              <span className="text-gray-600">Format: {isEbook ? 'eBook' : 'Print'}</span>
            )}
          </div>
        )}
        {/* Fallback raw JSON (collapsed view could be added later) */}
        {!rows.length && !description && (
          <Section title="Google Metadata (raw)"><pre className="text-xs overflow-auto">{JSON.stringify(meta, null, 2)}</pre></Section>
        )}
      </div>
    );
  };

  const renderBedrockMetadata = (meta: any) => {
    if (!meta || typeof meta !== 'object') return null;
    const titleCands: Array<{ value: string; confidence?: number }> = Array.isArray((meta as any).title_candidates) ? (meta as any).title_candidates : [];
    const authorCands: Array<{ value: string; confidence?: number }> = Array.isArray((meta as any).author_candidates) ? (meta as any).author_candidates : [];
    const lang = asText((meta as any).language_guess) || 'en';
    const source = asText((meta as any).source) || 'bedrock';
    const categories: string[] = Array.isArray((meta as any).categories) ? (meta as any).categories : [];
    const ageGroup = asText((meta as any).age_group) || '';
    const audience: string[] = Array.isArray((meta as any).audience) ? (meta as any).audience : [];
    const themes: string[] = Array.isArray((meta as any).themes) ? (meta as any).themes : [];
    const contentWarnings: string[] = Array.isArray((meta as any).content_warnings) ? (meta as any).content_warnings : [];

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
        {(categories.length || ageGroup || audience.length || themes.length || contentWarnings.length) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-800 mb-1">Categories</div>
                <div className="flex flex-wrap gap-1">
                  {categories.map((c, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{asText(c)}</span>
                  ))}
                </div>
              </div>
            )}
            {ageGroup && (
              <div>
                <div className="text-sm font-medium text-gray-800 mb-1">Age Group</div>
                <div className="text-sm text-gray-700">{ageGroup}</div>
              </div>
            )}
            {audience.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-800 mb-1">Audience</div>
                <div className="flex flex-wrap gap-1">
                  {audience.map((a, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{asText(a)}</span>
                  ))}
                </div>
              </div>
            )}
            {themes.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-800 mb-1">Themes</div>
                <div className="flex flex-wrap gap-1">
                  {themes.map((t, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{asText(t)}</span>
                  ))}
                </div>
              </div>
            )}
            {contentWarnings.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-sm font-medium text-gray-800 mb-1">Content Warnings</div>
                <div className="flex flex-wrap gap-1">
                  {contentWarnings.map((w, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">{asText(w)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
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

  const isOwner = !!(user?.userId && book.userId && user.userId === (book.userId as any));

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!bookId || deleting) return;
    const confirm = window.confirm('Are you sure you want to delete this book? This cannot be undone.');
    if (!confirm) return;
    try {
      setDeleting(true);
      await apiService.deleteBook(bookId);
      notificationCtx?.addNotification('success', 'Book deleted');
      window.location.assign('/library');
    } catch (e: any) {
      notificationCtx?.addNotification('error', e?.message || 'Failed to delete book');
    } finally {
      setDeleting(false);
    }
  };

  const handleBorrow = async () => {
    if (!isAuthenticated) {
      window.location.assign('/login');
      return;
    }
    try {
      const { apiService } = await import('../services/api');
      const { trackBorrowIntent } = await import('../services/analytics');
      const conversation = await apiService.dmCreateConversation(book.userId as any);
      const title = book.title ? `"${book.title}"` : 'your book';
      const message = `Hi! I'm interested in borrowing ${title}. Is it available?`;
      await apiService.dmSendMessage(conversation.conversationId, book.userId as any, message);
      try { trackBorrowIntent(book.userId as any, book.bookId, book.title || '', { currentUserId: user?.userId, source: 'BookDetails' }); } catch {}
      notificationCtx?.addNotification('success', 'Message sent to the owner. Opening chat…');
      window.location.assign(`/messages/${conversation.conversationId}`);
    } catch (e) {
      notificationCtx?.addNotification('error', 'Could not start a chat. Opening Messages…');
      window.location.assign('/messages');
    }
  };

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

          {/* Actions */}
          <div className="mt-4 sm:mt-6">
            {isAuthenticated && isOwner ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="text-sm font-medium text-white px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className={`text-sm font-medium px-4 py-2 rounded-md ${deleting ? 'bg-red-300 cursor-not-allowed text-white' : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'}`}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ) : (
              book.userId ? (
                <button
                  type="button"
                  onClick={handleBorrow}
                  className="text-sm font-medium text-white px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
                  title={book.userName ? `Borrow from ${book.userName}` : 'Borrow from owner'}
                >
                  {`Borrow from ${book.userName || 'owner'}`}
                </button>
              ) : null
            )}
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

            {/* Google Metadata */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Metadata</h3>
              {(book as any).google_metadata ? (
                renderGoogleMetadata((book as any).google_metadata)
              ) : (
                <div className="text-sm text-gray-500">No Google metadata available.</div>
              )}
            </div>

            {/* Bedrock Analysis */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bedrock Analysis</h3>
              {((book as any).mcp_metadata && (book as any).mcp_metadata.bedrock) ? (
                renderBedrockMetadata((book as any).mcp_metadata.bedrock)
              ) : (
                <div className="text-sm text-gray-500">No Bedrock analysis available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isAuthenticated && isOwner && (
        <EditModal
          open={showEditModal}
          initial={{ title: book.title, author: book.author, description: (book as any).description || '' }}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdits}
        />
      )}
    </div>
  );
};

export default BookDetails;

// Inline Edit Modal
const EditModal: React.FC<{
  open: boolean;
  initial: { title?: string | null; author?: string | null; description?: string | null };
  onClose: () => void;
  onSave: (updates: Partial<Book>) => void;
}> = ({ open, initial, onClose, onSave }) => {
  const [title, setTitle] = React.useState(initial.title || '');
  const [author, setAuthor] = React.useState(initial.author || '');
  const [description, setDescription] = React.useState(initial.description || '');
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    setTitle(initial.title || '');
    setAuthor(initial.author || '');
    setDescription(initial.description || '');
  }, [initial.title, initial.author, initial.description, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-1">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Book</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Author</label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onSave({ title, author, description });
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
