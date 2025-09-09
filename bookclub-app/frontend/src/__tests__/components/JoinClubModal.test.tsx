import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import JoinClubModal from '../../components/JoinClubModal';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    joinClub: jest.fn(),
  },
}));

describe('JoinClubModal', () => {
  const mockOnClose = jest.fn();
  const mockOnClubJoined = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnClose.mockClear();
    mockOnClubJoined.mockClear();
  });

  it('should render modal with form fields', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    expect(screen.getByText('Join Book Club')).toBeInTheDocument();
    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument();
    expect(screen.getByText('Ask a club admin for the 8-character invite code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join club/i })).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
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
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should update invite code when user types', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: 'ABC12345' } });

    expect(inviteCodeInput).toHaveValue('ABC12345');
  });

  it('should disable join button when invite code is empty', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    const joinButton = screen.getByRole('button', { name: /join club/i });
    expect(joinButton).toBeDisabled();
  });

  it('should enable join button when invite code is provided', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: 'ABC12345' } });

    const joinButton = screen.getByRole('button', { name: /join club/i });
    expect(joinButton).not.toBeDisabled();
  });

  it('should disable submit button when invite code is empty', async () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    // Initially, the submit button should be disabled with empty input
    const submitButton = screen.getByRole('button', { name: /join club/i });
    expect(submitButton).toBeDisabled();
    
    // Verify that the button remains disabled with just whitespace
    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: '   ' } });
    expect(submitButton).toBeDisabled();
  });

  it('should join club successfully with valid invite code', async () => {
    const mockClub = {
      clubId: 'club123',
      name: 'Test Club',
      description: 'Test Description',
      location: 'New York, NY',
      createdBy: 'user456',
      inviteCode: 'ABC12345',
      isPrivate: false,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      userRole: 'member' as const,
      joinedAt: '2023-01-02T00:00:00Z',
    };

    (apiService.joinClub as jest.Mock).mockResolvedValue(mockClub);

    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    // Fill invite code
    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: 'ABC12345' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /join club/i }));

    await waitFor(() => {
      expect(apiService.joinClub).toHaveBeenCalledWith('ABC12345');
    });

    expect(mockOnClubJoined).toHaveBeenCalledWith(mockClub);
  });

  it('should trim whitespace from invite code', async () => {
    const mockClub = {
      clubId: 'club123',
      name: 'Test Club',
      location: 'New York, NY',
      createdBy: 'user456',
      inviteCode: 'ABC12345',
      isPrivate: false,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      userRole: 'member' as const,
      joinedAt: '2023-01-02T00:00:00Z',
    };

    (apiService.joinClub as jest.Mock).mockResolvedValue(mockClub);

    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    // Fill invite code with whitespace
    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: '  ABC12345  ' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /join club/i }));

    await waitFor(() => {
      expect(apiService.joinClub).toHaveBeenCalledWith('ABC12345');
    });

    expect(mockOnClubJoined).toHaveBeenCalledWith(mockClub);
  });

  it('should show loading state during join', async () => {
    (apiService.joinClub as jest.Mock).mockReturnValue(
      new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    // Fill invite code
    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: 'ABC12345' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /join club/i }));

    // Check loading state
    expect(screen.getByRole('button', { name: /joining.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /joining.../i })).toBeDisabled();
  });

  it('should handle join error', async () => {
    // Create fresh mock functions for this test to avoid pollution
    const localMockOnClose = jest.fn();
    const localMockOnClubJoined = jest.fn();
    
    const error = new Error('Invalid invite code');
    (apiService.joinClub as jest.Mock).mockRejectedValue(error);

    render(
      <JoinClubModal 
        onClose={localMockOnClose} 
        onClubJoined={localMockOnClubJoined}
      />
    );

    // Fill invite code
    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: 'INVALID1' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /join club/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid invite code')).toBeInTheDocument();
    });

    expect(localMockOnClubJoined).not.toHaveBeenCalled();
  });

  it('should handle join error without message', async () => {
    // Create fresh mock functions for this test to avoid pollution
    const localMockOnClose = jest.fn();
    const localMockOnClubJoined = jest.fn();
    
    (apiService.joinClub as jest.Mock).mockRejectedValue({});

    render(
      <JoinClubModal 
        onClose={localMockOnClose} 
        onClubJoined={localMockOnClubJoined}
      />
    );

    // Fill invite code
    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    fireEvent.change(inviteCodeInput, { target: { value: 'INVALID1' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /join club/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to join club')).toBeInTheDocument();
    });

    expect(localMockOnClubJoined).not.toHaveBeenCalled();
  });

  it('should respect maxLength constraint', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    expect(inviteCodeInput).toHaveAttribute('maxLength', '8');
  });

  it('should have uppercase text transform style', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    expect(inviteCodeInput).toHaveStyle({ textTransform: 'uppercase' });
  });

  it('should have correct placeholder text', () => {
    render(
      <JoinClubModal 
        onClose={mockOnClose} 
        onClubJoined={mockOnClubJoined}
      />
    );

    const inviteCodeInput = screen.getByLabelText(/invite code/i);
    expect(inviteCodeInput).toHaveAttribute('placeholder', 'Enter 8-character invite code');
  });
});