/* eslint-disable testing-library/no-node-access, jest/no-conditional-expect, testing-library/prefer-presence-queries */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Clubs from '../../pages/Clubs';
import { NotificationProvider } from '../../contexts/NotificationContext';
// react-router-dom is mocked below for unit tests

// Mock apiService
jest.mock('../../services/api', () => ({
  apiService: {
    getUserClubs: jest.fn(),
    updateClub: jest.fn(),
    deleteClub: jest.fn(),
  },
}));

// Provide a virtual mock for react-router-dom to avoid requiring the real router in unit tests
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/clubs', state: undefined }),
  Link: ({ children }: any) => <a>{children}</a>,
  NavLink: ({ children }: any) => <a>{children}</a>,
}), { virtual: true });

// Mock AuthContext to simulate authenticated user
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { userId: 'user-1', name: 'Tester' },
  }),
}));

const { apiService } = require('../../services/api');

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificationProvider>
    {children}
  </NotificationProvider>
);

describe('Clubs page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list and shows edit/delete only for creator', async () => {
    (apiService.getUserClubs as jest.Mock).mockResolvedValue({
      items: [
        {
          clubId: 'c1',
          name: 'My Club',
          description: 'Desc',
          location: 'City',
          createdBy: 'user-1',
          isPrivate: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          clubId: 'c2',
          name: 'Other Club',
          description: '',
          location: 'Town',
          createdBy: 'user-2',
          isPrivate: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    });

    render(
      <TestWrapper>
        <Clubs />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('My Club')).toBeInTheDocument();
      expect(screen.getByText('Other Club')).toBeInTheDocument();
    });

    // Creator club has Edit/Delete (now titles on buttons)
    const editButtons = screen.getAllByTitle('Edit Club');
    const deleteButtons = screen.getAllByTitle('Delete Club');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);

    // Non-creator should not have a second pair if only one creator
    // We ensure there is at least one edit for own club
    // And check that there isn't an edit next to Other Club by scoping queries
    const otherClubContainer = screen.getByText('Other Club').closest('div');
    if (otherClubContainer) {
      // should not have an edit button with the title "Edit Club"
      const scopedEdit = otherClubContainer.querySelector('[title="Edit Club"]');
      expect(scopedEdit).toBeNull();
    }
  });

  it('shows Contact Us CTA instead of Create Club button', async () => {
    (apiService.getUserClubs as jest.Mock).mockResolvedValue({ items: [] });

    render(
      <TestWrapper>
        <Clubs />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('You have no clubs yet')).toBeInTheDocument();
    });

    expect(screen.queryByText('Create Club')).not.toBeInTheDocument();
    expect(screen.getByText('Contact Us →')).toBeInTheDocument();
  });

  it('opens join modal when Join with Code is clicked', async () => {
    (apiService.getUserClubs as jest.Mock).mockResolvedValue({ items: [] });
    render(
      <TestWrapper>
        <Clubs />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Join with Code')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Join with Code'));
    expect(screen.getByText('Join Book Club')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Join Book Club')).not.toBeInTheDocument();
    });
  });
});
