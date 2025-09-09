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

describe('CreateClubModal', () => {
  const mockOnClose = jest.fn();
  const mockOnClubCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnClose.mockClear();
    mockOnClubCreated.mockClear();
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

    // Find the close button by looking for the button containing the X icon
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(button => 
      button.querySelector('svg') && button.className.includes('text-gray-400')
    );
    
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
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
});