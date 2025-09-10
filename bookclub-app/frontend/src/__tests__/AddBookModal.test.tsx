import { render, screen } from '@testing-library/react';
import AddBookModal from '../components/AddBookModal';

// Mock image processing service
jest.mock('../services/imageProcessingService', () => ({
  imageProcessingService: {
    processImages: jest.fn(),
    cleanup: jest.fn(),
  },
}));

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    generateUploadUrl: jest.fn(),
    uploadFile: jest.fn(),
    createBook: jest.fn(),
    extractImageMetadata: jest.fn()
  }
}));

describe('Add Books Modal (Bulk Upload)', () => {
  const mockOnClose = jest.fn();
  const mockOnBookAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders bulk upload UI with correct title', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    expect(screen.getByText('Add Books')).toBeInTheDocument();
    expect(screen.getByText('Upload multiple book cover images to automatically create book entries. Each image will be processed to extract book information.')).toBeInTheDocument();
  });

  test('shows multi-image upload component', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    expect(screen.getByText('Upload up to 10 book images. Images will be automatically downsized and validated.')).toBeInTheDocument();
    expect(screen.getByText('📁 Add Images (0/10)')).toBeInTheDocument();
  });

  test('shows Cancel and Create Books buttons', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create 0 Books')).toBeInTheDocument();
  });

  test('Create Books button is disabled when no valid book images', () => {
    render(<AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />);
    
    const createButton = screen.getByText('Create 0 Books');
    expect(createButton).toBeDisabled();
  });
});