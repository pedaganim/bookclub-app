import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClubCard from '../../components/ClubCard';
import { BookClub } from '../../types';
import { BrowserRouter } from 'react-router-dom';

// Mock react-router-dom to avoid requiring Router context in unit tests
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: any) => <a data-testid="link">{children}</a>,
  NavLink: ({ children }: any) => <a data-testid="nav-link">{children}</a>,
}), { virtual: true });

// Wrapper for routing context - now just renders UI directly since RRD is mocked
const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui);
};

// Mock Heroicons to avoid "undefined" component error in test environment
jest.mock('@heroicons/react/24/outline', () => ({
  UserGroupIcon: () => <div data-testid="icon-user-group" />,
  MapPinIcon: () => <div data-testid="icon-map-pin" />,
  Cog6ToothIcon: () => <div data-testid="icon-cog" />,
  TrashIcon: () => <div data-testid="icon-trash" />,
  UserPlusIcon: () => <div data-testid="icon-user-plus" />,
  InboxArrowDownIcon: () => <div data-testid="icon-inbox" />,
  ClipboardDocumentIcon: () => <div data-testid="icon-clipboard" />,
  ArrowRightOnRectangleIcon: () => <div data-testid="icon-logout" />,
  MagnifyingGlassIcon: () => <div data-testid="icon-search" />,
}));

describe('ClubCard', () => {
  const mockClub: BookClub = {
    clubId: 'club123',
    name: 'Test Book Club',
    slug: 'test-book-club',
    description: 'A test book club description',
    location: 'New York, NY',
    createdBy: 'user456',
    inviteCode: 'ABC12345',
    isPrivate: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    userRole: 'member',
    joinedAt: '2023-01-02T00:00:00Z',
    memberCount: 15,
  };

  const mockOnJoin = jest.fn();
  const mockOnLeave = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnManageRequests = jest.fn();
  const mockOnCopyInvite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render club information correctly', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
      />
    );

    expect(screen.getByText('Test Book Club')).toBeInTheDocument();
    expect(screen.getByText('A test book club description')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
    expect(screen.getByText('15 Members')).toBeInTheDocument();
  });

  it('should show Creator badge when isCreator is true', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isCreator={true}
      />
    );

    expect(screen.getByText('Creator')).toBeInTheDocument();
  });

  it('should show Admin badge when isAdmin is true and not creator', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isAdmin={true}
        isCreator={false}
      />
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should show Member badge when isMember is true and not admin/creator', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isMember={true}
        isAdmin={false}
      />
    );

    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('should show Request Sent badge when isRequested is true', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isRequested={true}
      />
    );

    expect(screen.getByText('Request Sent')).toBeInTheDocument();
  });

  it('should show private badge for private clubs', () => {
    const privateClub = { ...mockClub, isPrivate: true };
    renderWithRouter(
      <ClubCard 
        club={privateClub} 
      />
    );

    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('should show Join button when not a member and not requested', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isMember={false}
        isRequested={false}
        onJoin={mockOnJoin}
      />
    );

    expect(screen.getByText('Join Club')).toBeInTheDocument();
  });

  it('should show edit and delete buttons for creator', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isCreator={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTitle('Edit Club')).toBeInTheDocument();
    expect(screen.getByTitle('Delete Club')).toBeInTheDocument();
  });

  it('should show leave button for admin who is not creator', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isAdmin={true}
        isCreator={false}
        onLeave={mockOnLeave}
      />
    );

    expect(screen.getByTitle('Leave Club')).toBeInTheDocument();
  });

  it('should show manage requests and invite buttons for admin', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isAdmin={true}
        onManageRequests={mockOnManageRequests}
        onCopyInvite={mockOnCopyInvite}
      />
    );

    expect(screen.getByTitle('Manage Requests')).toBeInTheDocument();
    expect(screen.getByTitle('Copy Invite Code')).toBeInTheDocument();
  });

  it('should handle button clicks correctly', () => {
    renderWithRouter(
      <ClubCard 
        club={mockClub} 
        isCreator={true}
        isAdmin={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onManageRequests={mockOnManageRequests}
        onCopyInvite={mockOnCopyInvite}
      />
    );

    fireEvent.click(screen.getByTitle('Edit Club'));
    expect(mockOnEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Delete Club'));
    expect(mockOnDelete).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Manage Requests'));
    expect(mockOnManageRequests).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Copy Invite Code'));
    expect(mockOnCopyInvite).toHaveBeenCalled();
  });
});