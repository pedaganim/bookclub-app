import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookLibrary from '../../pages/BookLibrary';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    listBooksPublic: jest.fn(),
  },
}));

// Mock the PublicBookCard component to simplify testing
jest.mock('../../components/PublicBookCard', () => {
  return function MockPublicBookCard({ book }: { book: any }) {
    return (
      <div data-testid={`book-${book.bookId}`}>
        <span>{book.title}</span>
        <span>{book.description}</span>
      </div>
    );
  };
});

describe('BookLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (apiService.listBooksPublic as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<BookLibrary />);
    
    expect(screen.getByText('Loading our library...')).toBeInTheDocument();
  });

  it('should render page title and description', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<BookLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText('Our Library')).toBeInTheDocument();
    });
    expect(screen.getByText('Discover books shared by our community')).toBeInTheDocument();
  });

  it('should render empty state when no books are available', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<BookLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText('No books are available in our library yet.')).toBeInTheDocument();
    });
  });

  it('should render books when available', async () => {
    const mockBooks = [
      {
        bookId: '1',
        userId: 'user123',
        title: 'Book 1',
        description: 'Description 1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        bookId: '2',
        userId: 'user456',
        title: 'Book 2',
        description: 'Description 2',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: mockBooks });
    
    render(<BookLibrary />);
    
    await waitFor(() => {
      expect(screen.getByTestId('book-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('book-2')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (apiService.listBooksPublic as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<BookLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should handle malformed API response', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ invalid: 'response' });
    
    render(<BookLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText('No books are available in our library yet.')).toBeInTheDocument();
    });
  });

  it('should call public API without authentication', async () => {
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<BookLibrary />);
    
    await waitFor(() => {
      expect(apiService.listBooksPublic).toHaveBeenCalledWith({ 
        search: undefined, 
        limit: 10, 
        nextToken: undefined 
      });
    });
  });
});