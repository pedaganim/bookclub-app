import { render, screen } from '@testing-library/react';
import AddBookModal from '../components/AddBookModal';

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn()
}));

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    searchBookMetadata: jest.fn(),
    generateUploadUrl: jest.fn(),
    uploadFile: jest.fn(),
    createBook: jest.fn()
  }
}));

describe('Enhanced AddBookModal', () => {
  const mockOnClose = jest.fn();
  const mockOnBookAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders enhanced UI with photo capture options', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    expect(screen.getByText('Add New Book')).toBeInTheDocument();
    expect(screen.getByText('📷 Take Photo')).toBeInTheDocument();
    expect(screen.getByText('📁 Upload Image')).toBeInTheDocument();
    expect(screen.getByText('Take a photo of the book cover or upload an image to automatically fill in book details')).toBeInTheDocument();
  });

  test('maintains existing form functionality', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    expect(screen.getByPlaceholderText('Enter book title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter author name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Brief description of the book')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Add Book')).toBeInTheDocument();
  });

  test('shows image capture buttons', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    const takePhotoButton = screen.getByRole('button', { name: '📷 Take Photo' });
    const uploadButton = screen.getByRole('button', { name: '📁 Upload Image' });
    
    expect(takePhotoButton).toBeInTheDocument();
    expect(uploadButton).toBeInTheDocument();
  });
});