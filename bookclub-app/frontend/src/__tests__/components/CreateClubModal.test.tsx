import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateClubModal from '../../components/CreateClubModal';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    createClub: jest.fn(),
  },
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};

// Mock fetch for reverse geocoding
global.fetch = jest.fn();

describe('CreateClubModal', () => {
  const mockOnClose = jest.fn();
  const mockOnClubCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnClose.mockClear();
    mockOnClubCreated.mockClear();
    
    // Reset geolocation mock
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render modal with form fields', () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    expect(screen.getByText('Create Book Club')).toBeInTheDocument();
    expect(screen.getByLabelText(/club name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/member limit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/make this club private/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create club/i })).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    // Find the close button by its aria-label
    const closeButton = screen.getByLabelText('Close modal');
    
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when cancel button is clicked', () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should update form fields when user types', () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    const nameInput = screen.getByLabelText(/club name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const locationInput = screen.getByLabelText(/location/i);
    const memberLimitInput = screen.getByLabelText(/member limit/i);

    fireEvent.change(nameInput, { target: { value: 'Test Club' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.change(locationInput, { target: { value: 'New York, NY' } });
    fireEvent.change(memberLimitInput, { target: { value: '10' } });

    expect(nameInput).toHaveValue('Test Club');
    expect(descriptionInput).toHaveValue('Test Description');
    expect(locationInput).toHaveValue('New York, NY');
    expect(memberLimitInput).toHaveValue(10);
  });

  it('should toggle private checkbox', () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    const privateCheckbox = screen.getByLabelText(/make this club private/i);
    expect(privateCheckbox).not.toBeChecked();

    fireEvent.click(privateCheckbox);
    expect(privateCheckbox).toBeChecked();

    fireEvent.click(privateCheckbox);
    expect(privateCheckbox).not.toBeChecked();
  });

  it('should show error when club name is empty', async () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create club/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Club name is required')).toBeInTheDocument();
    });

    expect(apiService.createClub).not.toHaveBeenCalled();
  });

  it('should show error when location is empty', async () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    const nameInput = screen.getByLabelText(/club name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Club' } });

    const submitButton = screen.getByRole('button', { name: /create club/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Location is required')).toBeInTheDocument();
    });

    expect(apiService.createClub).not.toHaveBeenCalled();
  });

  it('should create club successfully with valid data', async () => {
    const mockClub = {
      clubId: 'club123',
      name: 'Test Club',
      description: 'Test Description',
      location: 'New York, NY',
      createdBy: 'user456',
      inviteCode: 'ABC12345',
      isPrivate: false,
      memberLimit: 10,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    (apiService.createClub as jest.Mock).mockResolvedValue(mockClub);

    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/club name/i), { target: { value: 'Test Club' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test Description' } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'New York, NY' } });
    fireEvent.change(screen.getByLabelText(/member limit/i), { target: { value: '10' } });
    fireEvent.click(screen.getByLabelText(/make this club private/i));

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create club/i }));

    await waitFor(() => {
      expect(apiService.createClub).toHaveBeenCalledWith({
        name: 'Test Club',
        description: 'Test Description',
        location: 'New York, NY',
        isPrivate: true,
        memberLimit: 10,
      });
    });

    expect(mockOnClubCreated).toHaveBeenCalledWith(mockClub);
  });

  it('should create club without optional fields', async () => {
    const mockClub = {
      clubId: 'club123',
      name: 'Test Club',
      location: 'New York, NY',
      createdBy: 'user456',
      inviteCode: 'ABC12345',
      isPrivate: false,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    (apiService.createClub as jest.Mock).mockResolvedValue(mockClub);

    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    // Fill only required fields
    fireEvent.change(screen.getByLabelText(/club name/i), { target: { value: 'Test Club' } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'New York, NY' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create club/i }));

    await waitFor(() => {
      expect(apiService.createClub).toHaveBeenCalledWith({
        name: 'Test Club',
        description: undefined,
        location: 'New York, NY',
        isPrivate: false,
        memberLimit: undefined,
      });
    });

    expect(mockOnClubCreated).toHaveBeenCalledWith(mockClub);
  });

  it('should show loading state during creation', async () => {
    (apiService.createClub as jest.Mock).mockReturnValue(
      new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/club name/i), { target: { value: 'Test Club' } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'New York, NY' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create club/i }));

    // Check loading state
    expect(screen.getByRole('button', { name: /creating.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled();
  });

  it('should handle creation error', async () => {
    // Create fresh mock functions for this test to avoid pollution
    const localMockOnClose = jest.fn();
    const localMockOnClubCreated = jest.fn();
    
    const error = new Error('Creation failed');
    (apiService.createClub as jest.Mock).mockRejectedValue(error);

    render(
      <CreateClubModal 
        onClose={localMockOnClose} 
        onClubCreated={localMockOnClubCreated}
      />
    );

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/club name/i), { target: { value: 'Test Club' } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'New York, NY' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create club/i }));

    await waitFor(() => {
      expect(screen.getByText('Creation failed')).toBeInTheDocument();
    });

    expect(localMockOnClubCreated).not.toHaveBeenCalled();
  });

  it('should handle creation error without message', async () => {
    // Create fresh mock functions for this test to avoid pollution
    const localMockOnClose = jest.fn();
    const localMockOnClubCreated = jest.fn();
    
    (apiService.createClub as jest.Mock).mockRejectedValue({});

    render(
      <CreateClubModal 
        onClose={localMockOnClose} 
        onClubCreated={localMockOnClubCreated}
      />
    );

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/club name/i), { target: { value: 'Test Club' } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'New York, NY' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create club/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to create club')).toBeInTheDocument();
    });

    expect(localMockOnClubCreated).not.toHaveBeenCalled();
  });

  it('should respect maxLength constraints', () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    const nameInput = screen.getByLabelText(/club name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const locationInput = screen.getByLabelText(/location/i);

    expect(nameInput).toHaveAttribute('maxLength', '100');
    expect(descriptionInput).toHaveAttribute('maxLength', '500');
    expect(locationInput).toHaveAttribute('maxLength', '100');
  });

  it('should respect min/max constraints for member limit', () => {
    render(
      <CreateClubModal 
        onClose={mockOnClose} 
        onClubCreated={mockOnClubCreated}
      />
    );

    const memberLimitInput = screen.getByLabelText(/member limit/i);
    expect(memberLimitInput).toHaveAttribute('min', '2');
    expect(memberLimitInput).toHaveAttribute('max', '1000');
  });

  describe('Location Auto-Discovery', () => {
    it('should render "Use My Location" button', () => {
      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument();
    });

    it('should show message when geolocation is not supported', () => {
      // Mock unsupported geolocation
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      });

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      expect(screen.getByText('Geolocation is not supported by this browser')).toBeInTheDocument();
    });

    it('should successfully get location and populate field', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const mockGeocodingResponse = {
        address: {
          city: 'New York',
          state: 'New York',
          country: 'United States',
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGeocodingResponse),
      });

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('New York, New York')).toBeInTheDocument();
      });

      expect(screen.getByText('Location detected successfully!')).toBeInTheDocument();
    });

    it('should handle permission denied error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByText('Location access denied. Please enter location manually.')).toBeInTheDocument();
      });
    });

    it('should handle position unavailable error', async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByText('Location information unavailable. Please enter manually.')).toBeInTheDocument();
      });
    });

    it('should handle timeout error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByText('Location request timed out. Please try again or enter manually.')).toBeInTheDocument();
      });
    });

    it('should handle geocoding failure and use coordinates as fallback', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('40.7128, -74.0060')).toBeInTheDocument();
      });

      expect(screen.getByText('Location detected successfully!')).toBeInTheDocument();
    });

    it('should show loading state while getting location', async () => {
      let resolveGeolocation: (position: any) => void;
      const geolocationPromise = new Promise((resolve) => {
        resolveGeolocation = resolve;
      });

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        geolocationPromise.then(success);
      });

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      // Check loading state
      expect(screen.getByText(/getting.../i)).toBeInTheDocument();
      expect(locationButton).toBeDisabled();

      // Resolve the geolocation
      resolveGeolocation!({
        coords: { latitude: 40.7128, longitude: -74.0060 },
      });

      await waitFor(() => {
        expect(screen.queryByText(/getting.../i)).not.toBeInTheDocument();
      });
    });

    it('should handle different address formats from geocoding', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const mockGeocodingResponse = {
        address: {
          town: 'Brooklyn',
          state: 'New York',
          country: 'United States',
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGeocodingResponse),
      });

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Brooklyn, New York')).toBeInTheDocument();
      });
    });

    it('should clear location message after 3 seconds on success', async () => {
      jest.useFakeTimers();

      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const mockGeocodingResponse = {
        address: {
          city: 'New York',
          state: 'New York',
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGeocodingResponse),
      });

      const { act } = require('@testing-library/react');

      render(
        <CreateClubModal 
          onClose={mockOnClose} 
          onClubCreated={mockOnClubCreated}
        />
      );

      const locationButton = screen.getByRole('button', { name: /use my location/i });
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByText('Location detected successfully!')).toBeInTheDocument();
      });

      // Fast forward 3 seconds
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Location detected successfully!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});