import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../../pages/Home';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { BrandProvider } from '../../contexts/BrandContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: any) => <a>{children}</a>,
}), { virtual: true });

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { userId: 'u-1', name: 'Test User' },
    canAccessClubs: true,
  }),
}));

jest.mock('../../services/api', () => ({
  apiService: {
    getUserClubs: jest.fn(),
    listEvents: jest.fn(),
    listBooksPublic: jest.fn(),
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

describe('Home Page (Prototype Redesign)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.getUserClubs as jest.Mock).mockResolvedValue({
      items: [
        {
          clubId: 'club-1',
          name: 'Willow Park Neighbourhood',
          slug: 'willow-park',
          userStatus: 'active',
        },
      ],
    });
    (apiService.listEvents as jest.Mock).mockResolvedValue([]);
    (apiService.listBooksPublic as jest.Mock).mockResolvedValue({
      items: [
        {
          bookId: 'b-1',
          title: 'The Hobbit',
          category: 'book',
          coverImage: 'https://example.com/hobbit.jpg',
        },
      ],
    });
  });

  it('renders the neighbourhood banner and hero with Activities highlighted', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    // Verify Active Neighbourhood
    expect(await screen.findByText('Willow Park Neighbourhood')).toBeInTheDocument();

    // Verify Hero title and primary CTA
    expect(screen.getByText(/Your neighbourhood\./i)).toBeInTheDocument();
    expect(screen.getByText(/More to share\./i)).toBeInTheDocument();
    expect(screen.getByText('Explore activities')).toBeInTheDocument();
    expect(screen.getByText('Browse library')).toBeInTheDocument();

    // Verify Quick Action Grid cards
    expect(screen.getByText('Make an activity plan')).toBeInTheDocument();
    expect(screen.getAllByText('Borrow around the corner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Find something familiar')).toBeInTheDocument();
  });

  it('renders Section 1 (Happening in your neighbourhood) with activity cards before library', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    // Heading for Activities section
    expect(await screen.findByText('Happening in your neighbourhood')).toBeInTheDocument();
    expect(screen.getByText('All activities →')).toBeInTheDocument();

    // Check sample activity cards
    const matches1 = screen.getAllByText('Creative little makers');
    expect(matches1.length).toBeGreaterThanOrEqual(1);

    const matches2 = screen.getAllByText('Build a robot, change the world');
    expect(matches2.length).toBeGreaterThanOrEqual(1);
  });

  it('opens activity modal when an activity card is clicked', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    const matches = await screen.findAllByText('Creative little makers');
    fireEvent.click(matches[0]);

    // Modal opens showing activity details
    await waitFor(() => {
      expect(screen.getByText('Join activity →')).toBeInTheDocument();
    });
  });
});
