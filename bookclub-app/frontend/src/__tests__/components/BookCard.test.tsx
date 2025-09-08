import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookCard from '../../components/BookCard';
import { Book } from '../../types';

// Mock the entire apiService module
jest.mock('../../services/api', () => ({
  apiService: {
    updateBook: jest.fn(),
    deleteBook: jest.fn()
  }
}));

const mockBook: Book = {
  bookId: 'test-book-id',
  userId: 'test-user-id',
  title: 'Test Book',
  author: 'Test Author',
  description: 'Test description',
  coverImage: 'https://example.com/cover.jpg',
  status: 'available',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

const mockBookWithoutImage: Book = {
  ...mockBook,
  coverImage: undefined
};

describe('BookCard Edit Restrictions', () => {
  const mockOnDelete = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should only show content fields in edit modal (no status field)', () => {
    render(
      <BookCard
        book={mockBook}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
        showActions={true}
      />
    );

    fireEvent.click(screen.getByText('Edit'));

    // Should show content fields
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Author')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();

    // Should NOT show status field
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
    expect(screen.queryByText('Borrowed')).not.toBeInTheDocument();
    expect(screen.queryByText('Reading')).not.toBeInTheDocument();
  });

  it('should show image delete option when book has cover image', () => {
    render(
      <BookCard
        book={mockBook}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
        showActions={true}
      />
    );

    fireEvent.click(screen.getByText('Edit'));

    expect(screen.getByText('Cover Image')).toBeInTheDocument();
    expect(screen.getByText('Delete Image')).toBeInTheDocument();
    expect(screen.getByAltText('Test Book (edit preview)')).toBeInTheDocument();
    expect(screen.getByText('Image can only be deleted, not replaced. Add a new image when creating a book.')).toBeInTheDocument();
  });

  it('should not show image section when book has no cover image', () => {
    render(
      <BookCard
        book={mockBookWithoutImage}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
        showActions={true}
      />
    );

    fireEvent.click(screen.getByText('Edit'));

    expect(screen.queryByText('Cover Image')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete Image')).not.toBeInTheDocument();
  });

  it('should show deletion warning when image delete is clicked', () => {
    render(
      <BookCard
        book={mockBook}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
        showActions={true}
      />
    );

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Delete Image'));

    expect(screen.getByText('Cover image will be removed when you save changes.')).toBeInTheDocument();
    expect(screen.queryByText('Delete Image')).not.toBeInTheDocument();
  });

  it('should not show any file upload input in edit modal', () => {
    render(
      <BookCard
        book={mockBook}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
        showActions={true}
      />
    );

    fireEvent.click(screen.getByText('Edit'));

    // Should not have any file input
    expect(screen.queryByDisplayValue('file')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose file')).not.toBeInTheDocument();
    expect(screen.queryByText('Browse')).not.toBeInTheDocument();
  });
});