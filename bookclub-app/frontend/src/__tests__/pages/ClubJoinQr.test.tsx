/* eslint-disable testing-library/no-node-access, jest/no-conditional-expect, testing-library/prefer-presence-queries */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClubJoinQr from '../../pages/ClubJoinQr';
import { NotificationProvider } from '../../contexts/NotificationContext';

import { BrandProvider } from '../../contexts/BrandContext';

const mockNavigate = jest.fn();
const mockParams = { clubId: 'club-test-123' };
const mockUseAuth = jest.fn();

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}), { virtual: true });

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock apiService
jest.mock('../../services/api', () => ({
  apiService: {
    getClub: jest.fn(),
    requestClubJoin: jest.fn(),
  },
}));

const { apiService } = require('../../services/api');

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificationProvider>
    <BrandProvider>
      {children}
    </BrandProvider>
  </NotificationProvider>
);

describe('ClubJoinQr landing page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });
  });

  it('renders sign-in prompt when not authenticated', async () => {
    render(
      <TestWrapper>
        <ClubJoinQr />
      </TestWrapper>
    );

    expect(screen.getByText('Sign In with Google to Join')).toBeInTheDocument();
    expect(screen.getByText('You have been invited to join this library club. Please sign in to request membership access.')).toBeInTheDocument();

    // Verify localStorage behavior when clicking sign in
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(screen.getByText('Sign In with Google to Join'));
    expect(setItemSpy).toHaveBeenCalledWith('pendingClubJoin', 'club-test-123');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    setItemSpy.mockRestore();
  });

  it('renders Request to Join when authenticated but not a member', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    (apiService.getClub as jest.Mock).mockResolvedValue({
      clubId: 'club-test-123',
      name: 'Adventure Club',
      description: 'Exciting books',
      location: 'Melbourne',
      isMember: false,
      userStatus: undefined,
    });

    render(
      <TestWrapper>
        <ClubJoinQr />
      </TestWrapper>
    );

    expect(await screen.findByText('Adventure Club')).toBeInTheDocument();
    expect(screen.getByText('Send Request to Join')).toBeInTheDocument();

    (apiService.requestClubJoin as jest.Mock).mockResolvedValue({
      status: 'pending',
    });

    fireEvent.click(screen.getByText('Send Request to Join'));
    await waitFor(() => {
      expect(apiService.requestClubJoin).toHaveBeenCalledWith('club-test-123');
    });
  });

  it('renders Request Pending when membership status is pending', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    (apiService.getClub as jest.Mock).mockResolvedValue({
      clubId: 'club-test-123',
      name: 'Adventure Club',
      description: 'Exciting books',
      location: 'Melbourne',
      isMember: false,
      userStatus: 'pending',
    });

    render(
      <TestWrapper>
        <ClubJoinQr />
      </TestWrapper>
    );

    expect(await screen.findByText('Request Pending')).toBeInTheDocument();
    expect(screen.getByText('Back to Library Hub')).toBeInTheDocument();
  });

  it('renders Already a Member when user is active member', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    (apiService.getClub as jest.Mock).mockResolvedValue({
      clubId: 'club-test-123',
      name: 'Adventure Club',
      description: 'Exciting books',
      location: 'Melbourne',
      isMember: true,
      userStatus: 'active',
    });

    render(
      <TestWrapper>
        <ClubJoinQr />
      </TestWrapper>
    );

    expect(await screen.findByText('Already a Member')).toBeInTheDocument();
    expect(screen.getByText(/explore (club|neighbourhood) library/i)).toBeInTheDocument();
  });
});
