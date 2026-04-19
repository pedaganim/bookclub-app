import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiImageUpload from '../../components/MultiImageUpload';

// No image processing service in simplified component

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
    
    expect(screen.getByText(/Add Book Cover Image \(0\/25\)/)).toBeInTheDocument();
    expect(screen.getByText(/Upload up to 25 book images/)).toBeInTheDocument();
  });

  it('should handle file selection and preview', async () => {
    const mockFiles = [
      new File(['fake-image-data'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test2.jpg', { type: 'image/jpeg' }),
    ];

    renderComponent();

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    await waitFor(() => {
      expect(mockOnImagesProcessed).toHaveBeenCalledTimes(1);
    });
    const firstCallArg = (mockOnImagesProcessed as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(firstCallArg)).toBe(true);
    expect(firstCallArg).toHaveLength(2);
    expect(firstCallArg[0].file.name).toBe('test1.jpg');
    expect(firstCallArg[1].file.name).toBe('test2.jpg');
  });

  it('should enforce maximum image limit', async () => {
    const mockFiles = Array.from({ length: 26 }, (_, i) => 
      new File(['fake-image-data'], `test${i}.jpg`, { type: 'image/jpeg' })
    );

    renderComponent({ maxImages: 25 });

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    expect(mockOnError).toHaveBeenCalledWith('Maximum 25 images allowed. You can add 25 more.');
  });

  it('should allow removing individual images', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });

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
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should allow clearing all images', async () => {
    const mockFiles = [
      new File(['fake-image-data'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test2.jpg', { type: 'image/jpeg' }),
    ];

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
  });

  // Removed validation/status tests; simplified UI no longer shows these

  it('should show summary with selected count and total size', async () => {
    const mockFiles = [
      new File(['fake-image-data'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['fake-image-data'], 'test3.jpg', { type: 'image/jpeg' }),
    ];

    // Mock file sizes
    Object.defineProperty(mockFiles[0], 'size', { value: 1024 });
    Object.defineProperty(mockFiles[1], 'size', { value: 2048 });
    Object.defineProperty(mockFiles[2], 'size', { value: 1536 });

    renderComponent();

    const fileInput = screen.getByLabelText('Select multiple image files');
    await userEvent.upload(fileInput, mockFiles);

    await waitFor(() => {
      expect(screen.getByText(/Selected: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Total size: \d+KB/)).toBeInTheDocument();
    });
  });

  it('should be disabled when prop is set', () => {
    renderComponent({ disabled: true });
    
    expect(screen.getByText(/Add Book Cover Image \(0\/25\)/)).toBeDisabled();
  });
});