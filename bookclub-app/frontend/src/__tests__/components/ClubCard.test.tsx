import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClubCard from '../../components/ClubCard';
import { BookClub } from '../../types';

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', { value: mockConfirm });

describe('ClubCard', () => {
  const mockClub: BookClub = {
    clubId: 'club123',
    name: 'Test Book Club',
    description: 'A test book club description',
    location: 'New York, NY',
    createdBy: 'user456',
    inviteCode: 'ABC12345',
    isPrivate: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    userRole: 'member',
    joinedAt: '2023-01-02T00:00:00Z',
  };

  const mockOnLeave = jest.fn();
  const mockOnCopyInvite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  it('should render club information correctly', () => {
    render(
      <ClubCard 
        club={mockClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.getByText('Test Book Club')).toBeInTheDocument();
    expect(screen.getByText('A test book club description')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
    expect(screen.getByText(/Joined 1\/2\/2023/)).toBeInTheDocument();
  });

  it('should show admin star icon for admin users', () => {
    const adminClub = { ...mockClub, userRole: 'admin' as const };
    render(
      <ClubCard 
        club={adminClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    const adminIcon = screen.getByTitle('Admin');
    expect(adminIcon).toBeInTheDocument();
  });

  it('should not show admin star icon for regular members', () => {
    render(
      <ClubCard 
        club={mockClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    const adminIcon = screen.queryByTitle('Admin');
    expect(adminIcon).not.toBeInTheDocument();
  });

  it('should show private badge for private clubs', () => {
    const privateClub = { ...mockClub, isPrivate: true };
    render(
      <ClubCard 
        club={privateClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('should not show private badge for public clubs', () => {
    render(
      <ClubCard 
        club={mockClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.queryByText('Private')).not.toBeInTheDocument();
  });

  it('should show copy invite button for admin users', () => {
    const adminClub = { ...mockClub, userRole: 'admin' as const };
    render(
      <ClubCard 
        club={adminClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.getByRole('button', { name: /copy invite/i })).toBeInTheDocument();
  });

  it('should not show copy invite button for regular members', () => {
    render(
      <ClubCard 
        club={mockClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.queryByRole('button', { name: /copy invite/i })).not.toBeInTheDocument();
  });

  it('should always show leave button', () => {
    render(
      <ClubCard 
        club={mockClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
  });

  it('should handle copy invite button click', () => {
    const adminClub = { ...mockClub, userRole: 'admin' as const };
    render(
      <ClubCard 
        club={adminClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /copy invite/i }));
    expect(mockOnCopyInvite).toHaveBeenCalledWith('ABC12345');
  });

  it('should handle leave when user confirms', () => {
    mockConfirm.mockReturnValue(true);
    render(
      <ClubCard 
        club={mockClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /leave/i }));

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to leave "Test Book Club"?');
    expect(mockOnLeave).toHaveBeenCalledWith('club123');
  });

  it('should not handle leave when user cancels confirmation', () => {
    mockConfirm.mockReturnValue(false);
    render(
      <ClubCard 
        club={mockClub} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /leave/i }));

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to leave "Test Book Club"?');
    expect(mockOnLeave).not.toHaveBeenCalled();
  });

  it('should render without description when not provided', () => {
    const clubWithoutDescription = { ...mockClub, description: undefined };
    render(
      <ClubCard 
        club={clubWithoutDescription} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.getByText('Test Book Club')).toBeInTheDocument();
    expect(screen.queryByText('A test book club description')).not.toBeInTheDocument();
  });

  it('should use createdAt when joinedAt is not available', () => {
    const clubWithoutJoinedAt = { ...mockClub, joinedAt: undefined };
    render(
      <ClubCard 
        club={clubWithoutJoinedAt} 
        onLeave={mockOnLeave} 
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.getByText(/Joined 1\/1\/2023/)).toBeInTheDocument();
  });
});