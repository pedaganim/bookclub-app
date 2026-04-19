import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddBookModal from '../components/AddBookModal';
import { NotificationProvider } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

// No image processing service in simplified workflow

// Mock config
jest.mock('../config', () => ({
  config: {
    apiBaseUrl: 'https://api.example.com',
    env: 'test'
  }
}));

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    generateUploadUrl: jest.fn(),
    uploadFile: jest.fn(),
    uploadAnySize: jest.fn(),
    createBook: jest.fn(),
    extractImageMetadata: jest.fn(),
    getPreExtractedMetadata: jest.fn(),
    listBooks: jest.fn()
  }
}));

// Mock URL methods
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'mock-url') });
}
if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn() });
}

describe('Add Books Modal (Bulk Upload)', () => {
  const mockOnClose = jest.fn();
  const mockOnBookAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = () =>
    render(
      <NotificationProvider>
        <AddBookModal onClose={mockOnClose} onBookAdded={mockOnBookAdded} />
      </NotificationProvider>
    );

  test('renders bulk upload UI with correct title', () => {
    renderWithProviders();
    expect(screen.getByText('Add Books')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Upload Images'));
    expect(
      screen.getByText(
        'Upload multiple book cover images to create entries quickly. We skip image processing; you can edit details later.'
      )
    ).toBeInTheDocument();
  });

  test('shows multi-image upload component', () => {
    renderWithProviders();
    fireEvent.click(screen.getByText('Upload Images'));
    expect(
      screen.getByText("Upload up to 10 book images. We'll upload them as-is and process details in the background.")
    ).toBeInTheDocument();
    expect(screen.getByText('📁 Add Book Cover Image (0/10)')).toBeInTheDocument();
  });

  test('shows Cancel and Upload Images buttons', () => {
    renderWithProviders();
    fireEvent.click(screen.getByText('Upload Images'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Upload 0 Images')).toBeInTheDocument();
  });

  test('Upload Images button is disabled when no images selected', () => {
    renderWithProviders();
    fireEvent.click(screen.getByText('Upload Images'));
    const uploadButton = screen.getByText('Upload 0 Images');
    expect(uploadButton).toBeDisabled();
  });

  test('uploads images when metadata extraction is not available', async () => {
    // Mock successful upload but no metadata available
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    (apiService.uploadAnySize as jest.Mock).mockResolvedValue({
      fileUrl: 'https://s3.amazonaws.com/mock-bucket/mock-key.jpg',
      key: 'mock-key.jpg',
      bucket: 'mock-bucket'
    });
    
    (apiService.createBook as jest.Mock).mockResolvedValue({
      bookId: 'test-book-1',
      title: 'Test Book',
      author: 'Unknown'
    });
    
    // Render the component
    renderWithProviders();

    // Go to upload tab
    fireEvent.click(screen.getByText('Upload Images'));

    // Mock file selection
    const input = screen.getByLabelText('Select multiple image files');
    fireEvent.change(input, { target: { files: [mockFile] } });

    // Click upload
    const uploadButton = screen.getByText('Upload 1 Image');
    fireEvent.click(uploadButton);

    // Verify background upload steps
    await waitFor(() => {
      expect(apiService.uploadAnySize).toHaveBeenCalledWith(mockFile, expect.any(Object));
      expect(apiService.createBook).toHaveBeenCalledWith(expect.objectContaining({
        coverImage: 'https://s3.amazonaws.com/mock-bucket/mock-key.jpg',
        extractFromImage: true
      }));
    });

    // Success notification should be shown eventually
    await waitFor(() => {
       expect(screen.getByText(/Added 1\/1 book/)).toBeInTheDocument();
    });
  });

  test('handles manual book entry', async () => {
    (apiService.createBook as jest.Mock).mockResolvedValue({
      bookId: 'manual-book',
      title: 'Manual Title',
      author: 'Manual Author'
    });

    renderWithProviders();

    // Switch to manual tab (as 'upload' is now default)
    fireEvent.click(screen.getByText('Enter Manually'));

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Manual Title' } });
    fireEvent.change(screen.getByLabelText(/Author/i), { target: { value: 'Manual Author' } });
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.createBook).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Manual Title',
        author: 'Manual Author'
      }));
      expect(mockOnBookAdded).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  test('handles manual book entry with optional image', async () => {
    const mockFile = new File(['test'], 'manual-cover.jpg', { type: 'image/jpeg' });
    
    (apiService.uploadAnySize as jest.Mock).mockResolvedValue({
      fileUrl: 'https://s3.amazonaws.com/mock-bucket/manual-key.jpg',
      key: 'manual-key.jpg',
      bucket: 'mock-bucket'
    });
    
    (apiService.createBook as jest.Mock).mockResolvedValue({
      bookId: 'manual-book-with-image',
      title: 'Manual Title',
      author: 'Manual Author'
    });

    renderWithProviders();

    // Switch to manual tab (as 'upload' is now default)
    fireEvent.click(screen.getByText('Enter Manually'));

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Manual Title' } });
    fireEvent.change(screen.getByLabelText(/Author/i), { target: { value: 'Manual Author' } });
    
    // Mock image selection
    const input = screen.getByLabelText(/Upload a cover image/i);
    fireEvent.change(input, { target: { files: [mockFile] } });

    // Verify preview
    expect(screen.getByAltText('Manual cover preview')).toBeInTheDocument();
    expect(screen.getByText('manual-cover.jpg')).toBeInTheDocument();

    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.uploadAnySize).toHaveBeenCalledWith(mockFile);
      expect(apiService.createBook).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Manual Title',
        author: 'Manual Author',
        coverImage: 'https://s3.amazonaws.com/mock-bucket/manual-key.jpg',
        s3Bucket: 'mock-bucket',
        s3Key: 'manual-key.jpg'
      }));
    });
  });
});