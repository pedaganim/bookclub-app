import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiImageUpload from '../../components/MultiImageUpload';
import { imageProcessingService } from '../../services/imageProcessingService';

// Mock the image processing service
jest.mock('../../services/imageProcessingService', () => ({
  imageProcessingService: {
    processImages: jest.fn(),
    cleanup: jest.fn(),
  },
}));

const mockImageProcessingService = imageProcessingService as jest.Mocked<typeof imageProcessingService>;

describe('MultiImageUpload', () => {
  const mockOnImagesProcessed = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => 'blob:fake-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <MultiImageUpload
        onImagesProcessed={mockOnImagesProcessed}
        onError={mockOnError}
        {...props}
      />
    );
  };

  it('should render the upload interface', () => {
    renderComponent();
    
    expect(screen.getByText(/Add Images \(0\/25\)/)).toBeInTheDocument();
    expect(screen.getByText(/Upload up to 25 book images/)).toBeInTheDocument();
  });

  it('should handle file selection and processing', async () => {
    const mockFiles = [
      new File(['fake-image-data'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test2.jpg', { type: 'image/jpeg' }),
    ];

    const mockProcessedImages = [
      {
        file: mockFiles[0],
        originalFile: mockFiles[0],
        preview: 'blob:fake-url-1',
        isValid: true,
        isBook: true,
        confidence: 85,
      },
      {
        file: mockFiles[1],
        originalFile: mockFiles[1],
        preview: 'blob:fake-url-2',
        isValid: false,
        validationMessage: 'Not a book',
        isBook: false,
        confidence: 40,
      },
    ];

    // Mock processing each file individually
    mockImageProcessingService.processImages.mockResolvedValueOnce([mockProcessedImages[0]])
      .mockResolvedValueOnce([mockProcessedImages[1]]);

    renderComponent();

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    await waitFor(() => {
      expect(mockImageProcessingService.processImages).toHaveBeenCalledTimes(2);
    });

    // Should be called twice - once for each file
    expect(mockOnImagesProcessed).toHaveBeenCalledTimes(2);
  });

  it('should show processing progress', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });

    let resolveProcessing: (value: any) => void;
    const processingPromise = new Promise(resolve => {
      resolveProcessing = resolve;
    });

    mockImageProcessingService.processImages.mockReturnValue(processingPromise);

    renderComponent();

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, [mockFile]);

    // Should show processing indicator
    expect(screen.getByText(/Processing images.../)).toBeInTheDocument();

    // Resolve the processing
    resolveProcessing!([{
      file: mockFile,
      originalFile: mockFile,
      preview: 'blob:fake-url',
      isValid: true,
      isBook: true,
    }]);

    await waitFor(() => {
      expect(screen.queryByText(/Processing images.../)).not.toBeInTheDocument();
    });
  });

  it('should enforce maximum image limit', async () => {
    const mockFiles = Array.from({ length: 26 }, (_, i) => 
      new File(['fake-image-data'], `test${i}.jpg`, { type: 'image/jpeg' })
    );

    renderComponent({ maxImages: 25 });

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    expect(mockOnError).toHaveBeenCalledWith('Maximum 25 images allowed. You can add 25 more.');
    expect(mockImageProcessingService.processImages).not.toHaveBeenCalled();
  });

  it('should allow removing individual images', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });

    const mockProcessedImage = {
      file: mockFile,
      originalFile: mockFile,
      preview: 'blob:fake-url',
      isValid: true,
      isBook: true,
      confidence: 85,
    };

    mockImageProcessingService.processImages.mockResolvedValue([mockProcessedImage]);

    renderComponent();

    // Upload file first
    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, [mockFile]);

    await waitFor(() => {
      expect(screen.getByLabelText('Remove image 1')).toBeInTheDocument();
    });

    // Remove the image
    const removeButton = screen.getByLabelText('Remove image 1');
    await userEvent.click(removeButton);

    expect(mockOnImagesProcessed).toHaveBeenLastCalledWith([]);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('should allow clearing all images', async () => {
    const mockFiles = [
      new File(['fake-image-data'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test2.jpg', { type: 'image/jpeg' }),
    ];

    const mockProcessedImages = mockFiles.map((file, index) => ({
      file,
      originalFile: file,
      preview: `blob:fake-url-${index}`,
      isValid: true,
      isBook: true,
    }));

    mockImageProcessingService.processImages.mockResolvedValue(mockProcessedImages);

    renderComponent();

    // Upload files first
    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    await waitFor(() => {
      expect(screen.getByText('🗑️ Clear All')).toBeInTheDocument();
    });

    // Clear all images
    const clearButton = screen.getByText('🗑️ Clear All');
    await userEvent.click(clearButton);

    expect(mockOnImagesProcessed).toHaveBeenLastCalledWith([]);
    expect(mockImageProcessingService.cleanup).toHaveBeenCalled();
  });

  it('should show validation status for each image', async () => {
    const mockFiles = [
      new File(['fake-image-data'], 'valid.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'invalid.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'warning.jpg', { type: 'image/jpeg' }),
    ];

    const mockProcessedImages = [
      {
        file: mockFiles[0],
        originalFile: mockFiles[0],
        preview: 'blob:fake-url-1',
        isValid: true,
        isBook: true,
        confidence: 90,
      },
      {
        file: mockFiles[1],
        originalFile: mockFiles[1],
        preview: 'blob:fake-url-2',
        isValid: false,
        validationMessage: 'Not a book cover',
        isBook: false,
        confidence: 30,
      },
      {
        file: mockFiles[2],
        originalFile: mockFiles[2],
        preview: 'blob:fake-url-3',
        isValid: true,
        isBook: false,
        validationMessage: 'Low confidence detection',
        confidence: 45,
      },
    ];

    // Mock processing each file individually
    mockImageProcessingService.processImages.mockResolvedValueOnce([mockProcessedImages[0]])
      .mockResolvedValueOnce([mockProcessedImages[1]])
      .mockResolvedValueOnce([mockProcessedImages[2]]);

    renderComponent();

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    await waitFor(() => {
      // Check for validation indicators
      const checkmarks = screen.getAllByText('✓');
      const crosses = screen.getAllByText('✗');
      const warnings = screen.getAllByText('⚠');
      
      expect(checkmarks.length).toBeGreaterThan(0); // Valid book
      expect(crosses.length).toBeGreaterThan(0); // Invalid
      expect(warnings.length).toBeGreaterThan(0); // Warning
      
      // Check for validation messages
      expect(screen.getByText('Not a book cover')).toBeInTheDocument();
      expect(screen.getByText('Low confidence detection')).toBeInTheDocument();
    });
  });

  it('should show summary statistics', async () => {
    const mockFiles = [
      new File(['fake-image-data'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test3.jpg', { type: 'image/jpeg' }),
    ];

    const mockProcessedImages = [
      { file: mockFiles[0], originalFile: mockFiles[0], preview: 'blob:1', isValid: true, isBook: true },
      { file: mockFiles[1], originalFile: mockFiles[1], preview: 'blob:2', isValid: false, isBook: false },
      { file: mockFiles[2], originalFile: mockFiles[2], preview: 'blob:3', isValid: true, isBook: false },
    ];

    // Mock file sizes
    Object.defineProperty(mockFiles[0], 'size', { value: 1024 });
    Object.defineProperty(mockFiles[1], 'size', { value: 2048 });
    Object.defineProperty(mockFiles[2], 'size', { value: 1536 });

    // Mock processing each file individually
    mockImageProcessingService.processImages.mockResolvedValueOnce([mockProcessedImages[0]])
      .mockResolvedValueOnce([mockProcessedImages[1]])
      .mockResolvedValueOnce([mockProcessedImages[2]]);

    renderComponent();

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    await waitFor(() => {
      expect(screen.getByText(/Valid: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Book content: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Invalid: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Total size: \d+KB/)).toBeInTheDocument();
    });
  });

    await waitFor(() => {
      expect(screen.getByText(/Valid: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Book content: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Invalid: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Total size: \d+KB/)).toBeInTheDocument();
    });
  });

  it('should be disabled when prop is set', () => {
    renderComponent({ disabled: true });
    
    expect(screen.getByText(/Add Images \(0\/25\)/)).toBeDisabled();
  });
});