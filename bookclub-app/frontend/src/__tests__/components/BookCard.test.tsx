import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookCard from '../../components/BookCard';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    deleteBook: jest.fn(),
  },
}));

// Mock window.confirm and window.alert
const mockConfirm = jest.fn();
const mockAlert = jest.fn();
Object.defineProperty(window, 'confirm', { value: mockConfirm });
Object.defineProperty(window, 'alert', { value: mockAlert });

describe('BookCard', () => {
  const mockBook = {
    bookId: 'book123',
    userId: 'user456',
    title: 'Test Book',
    author: 'Test Author',
    description: 'A test book description',
    status: 'available' as const,
    coverImage: 'https://example.com/test-cover.jpg',
    isbn10: '1234567890',
    categories: ['Fiction'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const mockOnDelete = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should render book information correctly', () => {
    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={false} 
      />
    );

    expect(screen.getByText('Test Book')).toBeInTheDocument();
    // Author is no longer displayed in image-only view
    expect(screen.queryByText('by Test Author')).not.toBeInTheDocument();
    // Cover image should be present
    expect(screen.getByAltText('Test Book')).toBeInTheDocument();
  });

  it('should render in grid view by default', () => {
    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={false} 
      />
    );

    // In grid view, check that image is displayed with correct styling
    const image = screen.getByAltText('Test Book');
    expect(image).toBeInTheDocument();
    expect(image).toHaveClass('w-full', 'h-64', 'object-cover');
    
    // Title should be displayed
    const title = screen.getByText('Test Book');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-center');
  });

  it('should render in list view when listView prop is true', () => {
    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={false}
        listView={true} 
      />
    );

    // In list view, check that image is displayed with correct styling
    const image = screen.getByAltText('Test Book');
    expect(image).toBeInTheDocument();
    expect(image).toHaveClass('w-20', 'h-28', 'object-cover');
    
    // Title should be displayed but not author
    const title = screen.getByText('Test Book');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('truncate');
  });

  it('should render book cover image correctly in grid view', () => {
    const bookWithCover = { ...mockBook, coverImage: 'https://example.com/cover.jpg' };
    render(
      <BookCard 
        book={bookWithCover} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={false} 
      />
    );

    const image = screen.getByAltText('Test Book');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(image).toHaveClass('w-full', 'h-64', 'object-cover');
  });

  it('should render book cover image correctly in list view', () => {
    const bookWithCover = { ...mockBook, coverImage: 'https://example.com/cover.jpg' };
    render(
      <BookCard 
        book={bookWithCover} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={false}
        listView={true} 
      />
    );

    const image = screen.getByAltText('Test Book');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(image).toHaveClass('w-20', 'h-28', 'object-cover');
  });

  it('should show action buttons when showActions is true', () => {
    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={true} 
      />
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('should not show action buttons when showActions is false', () => {
    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={false} 
      />
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('should handle delete when user confirms', async () => {
    (apiService.deleteBook as jest.Mock).mockResolvedValue({});
    mockConfirm.mockReturnValue(true);

    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={true} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this book?');
    
    await waitFor(() => {
      expect(apiService.deleteBook).toHaveBeenCalledWith('book123');
    });
    expect(mockOnDelete).toHaveBeenCalledWith('book123');
  });

  it('should not delete when user cancels confirmation', async () => {
    mockConfirm.mockReturnValue(false);

    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={true} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this book?');
    expect(apiService.deleteBook).not.toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('should handle delete error gracefully', async () => {
    const error = new Error('Delete failed');
    (apiService.deleteBook as jest.Mock).mockRejectedValue(error);
    mockConfirm.mockReturnValue(true);

    render(
      <BookCard 
        book={mockBook} 
        onDelete={mockOnDelete} 
        onUpdate={mockOnUpdate} 
        showActions={true} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to delete book');
    });
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
});