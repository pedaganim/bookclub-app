import { render, screen } from '@testing-library/react';
import AddBookModal from '../components/AddBookModal';

// Mock OCR service
jest.mock('../services/ocrService', () => ({
  ocrService: {
    extractText: jest.fn(),
    extractBookDetails: jest.fn(),
    cleanup: jest.fn().mockResolvedValue(undefined)
  }
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

// Get the mocked OCR service
const { ocrService } = jest.requireMock('../services/ocrService');

describe('Enhanced AddBookModal', () => {
  const mockOnClose = jest.fn();
  const mockOnBookAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    ocrService.cleanup.mockResolvedValue(undefined);
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

  test('shows accessible image capture buttons with proper ARIA labels', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    const takePhotoButton = screen.getByRole('button', { name: /take a photo of the book cover using your camera/i });
    const uploadButton = screen.getByRole('button', { name: /upload an image of the book cover from your device/i });
    
    expect(takePhotoButton).toBeInTheDocument();
    expect(uploadButton).toBeInTheDocument();
    expect(takePhotoButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    expect(uploadButton).toHaveClass('focus:ring-2', 'focus:ring-green-500');
  });
});