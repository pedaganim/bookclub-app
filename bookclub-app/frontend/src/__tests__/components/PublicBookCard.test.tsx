import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PublicBookCard from '../../components/PublicBookCard';

// Mock AuthContext to avoid react-router-dom hook usage during tests
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));


describe('PublicBookCard', () => {
  const mockBook = {
    bookId: 'book123',
    userId: 'user456',
    title: 'Test Book',
    author: 'Test Author',
    description: 'A test book description that should be displayed properly.',
    coverImage: 'https://example.com/cover.jpg',
    status: 'available' as const,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  it('should render book cover image when provided', () => {
    render(<PublicBookCard book={mockBook} />);
    
    const image = screen.getByAltText('Cover of Test Book');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('should use default placeholder when no cover image is provided', () => {
    const bookWithoutCover = { ...mockBook, coverImage: undefined };
    render(<PublicBookCard book={bookWithoutCover} />);
    
    const image = screen.getByAltText('Cover of Test Book');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('data:image/svg+xml');
  });

  it('should use generic alt text when no title is provided', () => {
    const bookWithoutTitle = { ...mockBook, title: '', coverImage: undefined };
    render(<PublicBookCard book={bookWithoutTitle} />);
    
    const image = screen.getByAltText('Book cover');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('data:image/svg+xml');
  });

  it('should display description when provided', () => {
    render(<PublicBookCard book={mockBook} />);
    
    expect(screen.getByText('A test book description that should be displayed properly.')).toBeInTheDocument();
  });

  it('should not display description section when empty', () => {
    const bookWithoutDescription = { ...mockBook, description: '' };
    render(<PublicBookCard book={bookWithoutDescription} />);
    
    // Should only show the borrow action button
    expect(screen.getByText('Borrow from User user456')).toBeInTheDocument();
    expect(screen.queryByText('A test book description')).not.toBeInTheDocument();
  });

  it('should convert all caps description to sentence case', () => {
    const bookWithCapsDescription = { 
      ...mockBook, 
      description: 'THIS IS ALL CAPS DESCRIPTION THAT SHOULD BE CONVERTED' 
    };
    render(<PublicBookCard book={bookWithCapsDescription} />);
    
    expect(screen.getByText('This Is All Caps Description That Should Be Converted')).toBeInTheDocument();
  });

  it('should preserve mixed case description as is', () => {
    const bookWithMixedCase = { 
      ...mockBook, 
      description: 'This is Mixed Case and should stay the Same' 
    };
    render(<PublicBookCard book={bookWithMixedCase} />);
    
    expect(screen.getByText('This is Mixed Case and should stay the Same')).toBeInTheDocument();
  });

  it('should display simplified username from userId', () => {
    render(<PublicBookCard book={mockBook} />);
    
    expect(screen.getByText('Borrow from User user456')).toBeInTheDocument();
  });

  it('should handle fallback when image fails to load', async () => {
    render(<PublicBookCard book={mockBook} />);
    
    const image = screen.getByAltText('Cover of Test Book');
    
    // Simulate image load error
    const errorEvent = new Event('error');
    Object.defineProperty(errorEvent, 'target', {
      value: image,
      enumerable: true,
    });
    
    // Trigger the error event
    image.dispatchEvent(errorEvent);
    
    await waitFor(() => {
      expect(image.getAttribute('src')).toContain('data:image/svg+xml');
    });
  });

  it('should not display title, author, or status fields', () => {
    render(<PublicBookCard book={mockBook} />);
    
    // These fields should not be displayed in the public view
    expect(screen.queryByText('Test Book')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Author')).not.toBeInTheDocument();
    expect(screen.queryByText('available')).not.toBeInTheDocument();
  });
});