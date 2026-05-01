import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LibraryPage from '../../pages/LibraryPage';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSubdomain } from '../../hooks/useSubdomain';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    listBooksPublic: jest.fn(),
    listBooks: jest.fn(),
    getUserClubs: jest.fn().mockResolvedValue({ items: [] }),
    listMembers: jest.fn().mockResolvedValue({ items: [] }),
  },
}));

// Mock contexts
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ addNotification: jest.fn() }),
}));
jest.mock('../../hooks/useSubdomain', () => ({
  useSubdomain: jest.fn(),
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
  return function MockPublicBookCard({ book, isMemberOfBookClub }: { book: any; isMemberOfBookClub?: boolean }) {
    return (
      <div data-testid={`book-${book.bookId || book.listingId}`}>
        <span>{book.title}</span>
        {isMemberOfBookClub && <span data-testid="member-badge">Member</span>}
      </div>
    );
  };
});
jest.mock('../../components/SEO', () => () => <div data-testid="seo" />);

describe('LibraryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false, user: null });
    (useSubdomain as jest.Mock).mockReturnValue({ isSubdomain: false, club: null });
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

  it('should filter by club when in subdomain mode', async () => {
    (useSubdomain as jest.Mock).mockReturnValue({ 
      isSubdomain: true, 
      club: { clubId: 'club-123', name: 'Test Club' } 
    });
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: [] });

    render(<LibraryPage />);

    await waitFor(() => {
      expect(apiService.listBooksPublic).toHaveBeenCalledWith(expect.objectContaining({
        clubId: 'club-123'
      }));
    });
  });

  it('should determine club membership status for items', async () => {
    (useAuth as jest.Mock).mockReturnValue({ 
      isAuthenticated: true, 
      user: { userId: 'me' } 
    });
    (apiService.getUserClubs as jest.Mock).mockResolvedValue({
      items: [{ clubId: 'club-member', userStatus: 'active' }]
    });
    const mockItems = [
      { bookId: '1', title: 'Club Book', clubId: 'club-member' },
      { bookId: '2', title: 'Non-Club Book' }
    ];
    (apiService.listBooks as jest.Mock).mockResolvedValue({ items: mockItems });

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('book-1')).toBeInTheDocument();
    });
    
    // Book 1 should have membership badge because we mocked user as member of club-member
    expect(screen.queryAllByTestId('member-badge').length).toBeGreaterThan(0);
  });
});