import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LibraryPage from '../../pages/LibraryPage';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    listBooksPublic: jest.fn(),
    getUserClubs: jest.fn().mockResolvedValue({ items: [] }),
  },
}));

// Mock contexts
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));
jest.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ addNotification: jest.fn() }),
}));
jest.mock('../../hooks/useSubdomain', () => ({
  useSubdomain: () => ({ isSubdomain: false, club: null }),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ categorySlug: 'books' }),
  useLocation: () => ({ state: null }),
  Link: ({ children, to }: any) => <a href={typeof to === 'string' ? to : '#'}>{children}</a>,
}));

// Mock components
jest.mock('../../components/PublicBookCard', () => {
  return function MockPublicBookCard({ book }: { book: any }) {
    return (
      <div data-testid={`book-${book.bookId || book.listingId}`}>
        <span>{book.title}</span>
      </div>
    );
  };
});
jest.mock('../../components/SEO', () => () => <div data-testid="seo" />);

describe('LibraryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (apiService.listBooksPublic as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<LibraryPage />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title and description from config', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<LibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Book Library')).toBeInTheDocument();
    });
    expect(screen.getByText(/Discover books shared by your community/)).toBeInTheDocument();
  });

  it('should render empty state from config', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<LibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No books listed yet. Be the first to share one!')).toBeInTheDocument();
    });
  });

  it('should render items when available', async () => {
    const mockItems = [
      {
        bookId: '1',
        userId: 'user123',
        title: 'Book 1',
        category: 'book',
      },
      {
        bookId: '2',
        userId: 'user456',
        title: 'Book 2',
        category: 'book',
      },
    ];

    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: mockItems });
    
    render(<LibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('book-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('book-2')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (apiService.listBooksPublic as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<LibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should handle malformed API response', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ invalid: 'response' });
    
    render(<LibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No books listed yet. Be the first to share one!')).toBeInTheDocument();
    });
  });

  it('should call public API with correct parameters', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<LibraryPage />);
    
    await waitFor(() => {
      expect(apiService.listBooksPublic).toHaveBeenCalledWith(expect.objectContaining({
        limit: 25, 
        bare: true,
      }));
    });
  });
});