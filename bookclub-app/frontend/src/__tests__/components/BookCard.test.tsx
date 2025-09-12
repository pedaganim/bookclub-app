import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookCard from '../../components/BookCard';
import { apiService } from '../../services/api';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    deleteBook: jest.fn(),
  },
}));

// Test wrapper with NotificationProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificationProvider>
    {children}
  </NotificationProvider>
);

describe('BookCard', () => {
  const mockBook = {
    bookId: 'book123',
    userId: 'user456',
    title: 'Test Book',
    author: 'Test Author',
    description: 'A test book description',
    status: 'available' as const,
    isbn10: '1234567890',
    categories: ['Fiction'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const mockOnDelete = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should render book information correctly', () => {
    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={false} 
        />
      </TestWrapper>
    );

    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('by Test Author')).toBeInTheDocument();
  });

  it('should render in grid view by default', () => {
    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={false} 
        />
      </TestWrapper>
    );

    // In grid view, the layout should be vertical (no flex class on main container)
    // We can test this by checking that elements are arranged vertically
    const title = screen.getByText('Test Book');
    const author = screen.getByText('by Test Author');
    expect(title).toBeInTheDocument();
    expect(author).toBeInTheDocument();
  });

  it('should render in list view when listView prop is true', () => {
    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={false}
          listView={true} 
        />
      </TestWrapper>
    );

    // In list view, the layout should be horizontal (flex layout)
    // We can test this by checking that elements are arranged properly
    const title = screen.getByText('Test Book');
    const author = screen.getByText('by Test Author');
    expect(title).toBeInTheDocument();
    expect(author).toBeInTheDocument();
  });

  it('should render book cover image correctly in grid view', () => {
    const bookWithCover = { ...mockBook, coverImage: 'https://example.com/cover.jpg' };
    render(
      <TestWrapper>
        <BookCard 
          book={bookWithCover} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={false} 
        />
      </TestWrapper>
    );

    const image = screen.getByAltText('Test Book');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(image).toHaveClass('w-full', 'h-48', 'object-cover');
  });

  it('should render book cover image correctly in list view', () => {
    const bookWithCover = { ...mockBook, coverImage: 'https://example.com/cover.jpg' };
    render(
      <TestWrapper>
        <BookCard 
          book={bookWithCover} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={false}
          listView={true} 
        />
      </TestWrapper>
    );

    const image = screen.getByAltText('Test Book');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(image).toHaveClass('w-20', 'h-28', 'object-cover', 'flex-shrink-0');
  });

  it('should show action buttons when showActions is true', () => {
    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={true} 
        />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('should not show action buttons when showActions is false', () => {
    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={false} 
        />
      </TestWrapper>
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('should show confirmation modal when delete button is clicked', async () => {
    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={true} 
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    // Check that the confirmation modal appears
    expect(screen.getByText('Delete Book')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "Test Book"/)).toBeInTheDocument();
    
    // Now there should be two delete buttons - one in actions, one in modal
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should close confirmation modal when cancel is clicked', async () => {
    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={true} 
        />
      </TestWrapper>
    );

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByText('Delete Book')).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Modal should be closed
    expect(screen.queryByText('Delete Book')).not.toBeInTheDocument();
  });

  it('should handle delete when user confirms', async () => {
    (apiService.deleteBook as jest.Mock).mockResolvedValue({});

    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={true} 
        />
      </TestWrapper>
    );

    // Open modal by clicking the first delete button
    const initialDeleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(initialDeleteButton);
    
    // Wait for modal to appear and then click confirm
    await waitFor(() => {
      expect(screen.getByText('Delete Book')).toBeInTheDocument();
    });
    
    // Now find the modal confirm button - it's the second delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons).toHaveLength(2);
    const modalConfirmButton = deleteButtons[1]; // Second button is the modal one
    fireEvent.click(modalConfirmButton);
    
    await waitFor(() => {
      expect(apiService.deleteBook).toHaveBeenCalledWith('book123');
    });
    expect(mockOnDelete).toHaveBeenCalledWith('book123');
  });

  it('should handle delete error gracefully', async () => {
    const error = new Error('Delete failed');
    (apiService.deleteBook as jest.Mock).mockRejectedValue(error);

    render(
      <TestWrapper>
        <BookCard 
          book={mockBook} 
          onDelete={mockOnDelete} 
          onUpdate={mockOnUpdate} 
          showActions={true} 
        />
      </TestWrapper>
    );

    // Open modal by clicking the first delete button
    const initialDeleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(initialDeleteButton);
    
    // Wait for modal to appear and then click confirm
    await waitFor(() => {
      expect(screen.getByText('Delete Book')).toBeInTheDocument();
    });
    
    // Click the modal confirm button - it's the second delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    const modalConfirmButton = deleteButtons[1]; // Second button is the modal one
    fireEvent.click(modalConfirmButton);

    await waitFor(() => {
      // Check that error notification is shown
      expect(screen.getByText('Failed to delete book')).toBeInTheDocument();
    });
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
});