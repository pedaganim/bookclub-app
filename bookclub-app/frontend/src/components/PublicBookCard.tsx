import React from 'react';
import { Book } from '../types';

interface PublicBookCardProps {
  book: Book;
}

const PublicBookCard: React.FC<PublicBookCardProps> = ({ book }) => {
  // Function to format description text properly
  const formatDescription = (text?: string) => {
    if (!text) return '';
    
    // Convert to proper sentence case if it's all caps
    if (text === text.toUpperCase()) {
      return text.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }
    
    return text;
  };

  // Get username from userName field or fallback to simplified userId
  const getDisplayUsername = (book: Book) => {
    if (book.userName) {
      return book.userName;
    }
    // Fallback to simplified version of the userId
    return `User ${book.userId.slice(-Math.min(8, book.userId.length))}`;
  };

  // Default placeholder image when no cover image is provided
  const defaultBookImage = "data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100' height='100' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' font-size='14' fill='%23374151' text-anchor='middle' dy='.3em'%3eBook%3c/text%3e%3c/svg%3e";

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image - Consistent portrait aspect ratio and crop */}
      <div className="w-full bg-gray-100" style={{ aspectRatio: '3 / 4' }}>
        <img
          src={book.coverImage || defaultBookImage}
          alt={book.title ? `Cover of ${book.title}` : 'Book cover'}
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            // Fallback to default image if cover image fails to load
            (e.target as HTMLImageElement).src = defaultBookImage;
          }}
        />
      </div>
      
      <div className="p-4">
        {/* Description */}
        {book.description && (
          <div className="mb-3">
            <p
              className="text-gray-700 text-sm leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {formatDescription(book.description)}
            </p>
          </div>
        )}
        
        {/* Username */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
            Shared by {getDisplayUsername(book)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PublicBookCard;