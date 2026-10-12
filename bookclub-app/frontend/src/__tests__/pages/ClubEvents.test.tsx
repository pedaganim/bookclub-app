/* eslint-disable testing-library/no-node-access, jest/no-conditional-expect, testing-library/prefer-presence-queries */
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClubEvents from '../../pages/ClubEvents';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { BrandProvider } from '../../contexts/BrandContext';

const mockNavigate = jest.fn();
let mockParams = { slug: 'club-fiction-001' };
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
    resolveClubSlug: jest.fn(),
    getUserClubs: jest.fn(),
    getClub: jest.fn(),
    listEvents: jest.fn(),
    rsvpEvent: jest.fn(),
    volunteerEvent: jest.fn(),
    commentEvent: jest.fn(),
    remindEvent: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    listMembers: jest.fn(),
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

describe('ClubEvents Page Component', () => {
  const dummyUser = { userId: 'u-1', name: 'Maddy Testing' };
  const dummyClub = {
    clubId: 'club-fiction-001',
    name: 'Fiction Lovers',
    slug: 'club-fiction-001',
    createdBy: 'u-admin',
    userRole: 'member',
  };
  const dummyClubsList = {
    items: [
      { clubId: 'club-fiction-001', name: 'Fiction Lovers', slug: 'club-fiction-001', userStatus: 'active' },
      { clubId: 'club-scifi-002', name: 'Sci-Fi Enthusiasts', slug: 'club-scifi-002', userStatus: 'active' }
    ]
  };
  const dummyEvent: any = {
    eventId: 'evt-100',
    clubId: 'club-fiction-001',
    title: 'Reading Dune: Part 1',
    description: 'We will discuss the first 150 pages of Dune.',
    location: 'Central Library Room 3A',
    dateTime: new Date(Date.now() + 86400000).toISOString(), // 1 day in the future
    createdBy: 'u-admin',
    creatorName: 'Alice',
    volunteerTasks: ['Bring snacks', 'Setup chairs'],
    volunteers: {
      'u-volunteer-1': { name: 'Bob', task: 'Setup chairs', signedUpAt: new Date().toISOString() }
    },
    rsvps: {
      'u-1': { name: 'Maddy Testing', status: 'going', updatedAt: new Date().toISOString() }
    },
    discussions: [
      { commentId: 'c-1', userId: 'u-2', name: 'Charlie', content: 'Hyped for Dune!', createdAt: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { slug: 'club-fiction-001' };
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: dummyUser,
      loading: false,
    });
    (apiService.resolveClubSlug as jest.Mock).mockResolvedValue({ clubId: 'club-fiction-001' });
    (apiService.getUserClubs as jest.Mock).mockResolvedValue(dummyClubsList);
    (apiService.getClub as jest.Mock).mockResolvedValue(dummyClub);
    (apiService.listEvents as jest.Mock).mockResolvedValue([dummyEvent]);
    (apiService.listMembers as jest.Mock).mockResolvedValue({ items: [] });
  });

  it('renders loading spinner initially', () => {
    (apiService.resolveClubSlug as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (apiService.getUserClubs as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (apiService.getClub as jest.Mock).mockImplementation(() => new Promise(() => {})); // pending
    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );
    expect(screen.getByText('Loading club events...')).toBeInTheDocument();
  });

  it('loads and renders club details, event info including location and discussions', async () => {
    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    // Verify club name and title
    expect(await screen.findByText('Fiction Lovers Activities')).toBeInTheDocument();
    
    // Find event card and click it to open details view
    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    // Verify location is shown in event detail
    expect(await screen.findByText('Central Library Room 3A')).toBeInTheDocument();

    // Verify volunteering tasks are rendered
    expect(screen.getByText('Bring snacks')).toBeInTheDocument();
    expect(screen.getByText('Claimed by Bob')).toBeInTheDocument();

    // Verify discussions chat is rendered
    expect(screen.getByText('Hyped for Dune!')).toBeInTheDocument();
  });

  it('renders dropdown and navigates to the selected club when changed', async () => {
    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    expect(await screen.findByText('Fiction Lovers Activities')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi Enthusiasts')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'club-scifi-002' } });

    expect(mockNavigate).toHaveBeenCalledWith('/neighbourhoods/club-scifi-002/activities');
  });

  it('allows user to submit an RSVP status', async () => {
    (apiService.rsvpEvent as jest.Mock).mockResolvedValue({
      ...dummyEvent,
      rsvps: {
        'u-1': { name: 'Maddy Testing', status: 'interested', updatedAt: new Date().toISOString() }
      }
    });

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    // Find and click the event card to open details
    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    // Find the RSVP button for Interested
    const interestedBtn = await screen.findByRole('button', { name: /interested/i });
    fireEvent.click(interestedBtn);

    await waitFor(() => {
      expect(apiService.rsvpEvent).toHaveBeenCalledWith('club-fiction-001', 'evt-100', 'interested');
    });
  });

  it('allows user to claim a volunteer task', async () => {
    (apiService.volunteerEvent as jest.Mock).mockResolvedValue({
      ...dummyEvent,
      volunteers: {
        'u-volunteer-1': { name: 'Bob', task: 'Setup chairs', signedUpAt: new Date().toISOString() },
        'u-1': { name: 'Maddy Testing', task: 'Bring snacks', signedUpAt: new Date().toISOString() }
      }
    });

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    // Wait for event data
    expect(await screen.findByText('Fiction Lovers Activities')).toBeInTheDocument();

    // Click the event card to open details
    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    // Claim "Bring snacks" task
    const claimBtns = await screen.findAllByRole('button', { name: /claim/i });
    expect(claimBtns.length).toBe(1); // Only 'Bring snacks' is unclaimed
    fireEvent.click(claimBtns[0]);

    await waitFor(() => {
      expect(apiService.volunteerEvent).toHaveBeenCalledWith('club-fiction-001', 'evt-100', 'Bring snacks');
    });
  });

  it('allows user to send a comment', async () => {
    (apiService.commentEvent as jest.Mock).mockResolvedValue({
      ...dummyEvent,
      discussions: [
        ...dummyEvent.discussions,
        { commentId: 'c-2', userId: 'u-1', name: 'Maddy Testing', content: 'What time is setup?', createdAt: new Date().toISOString() }
      ]
    });

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    expect(await screen.findByText('Fiction Lovers Activities')).toBeInTheDocument();

    // Click the event card to open details
    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    // Type comment
    const input = await screen.findByPlaceholderText('Write a message to the group...');
    fireEvent.change(input, { target: { value: 'What time is setup?' } });
    
    // Submit comment form
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(apiService.commentEvent).toHaveBeenCalledWith('club-fiction-001', 'evt-100', 'What time is setup?');
    });
  });

  it('selects and opens event details when clicking a day with events in the calendar', async () => {
    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    // Verify header renders first
    expect(await screen.findByText('Fiction Lovers Activities')).toBeInTheDocument();

    // Verify calendar header is visible
    expect(screen.getByText('Event Calendar')).toBeInTheDocument();

    // Locate the calendar day button that has the event title
    const calDayBtn = await screen.findByTitle('Reading Dune: Part 1');
    expect(calDayBtn).toBeInTheDocument();

    // Click the calendar day button
    fireEvent.click(calDayBtn);

    // Verify details are now displayed (e.g. location, description, RSVP tally)
    expect(await screen.findByText('Central Library Room 3A')).toBeInTheDocument();
    expect(screen.getByText('We will discuss the first 150 pages of Dune.')).toBeInTheDocument();
  });

  it('opens a selection modal when clicking a day in the calendar that has multiple events', async () => {
    const dummyEvent2 = {
      ...dummyEvent,
      eventId: 'evt-200',
      title: 'Reading Dune: Part 2',
      description: 'Discussion of Part 2.',
      location: 'Central Library Room 3B',
    };

    // Both events are on the same day (dummyEvent.dateTime is tomorrow)
    (apiService.listEvents as jest.Mock).mockResolvedValue([dummyEvent, dummyEvent2]);

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    // Verify header renders first
    expect(await screen.findByText('Fiction Lovers Activities')).toBeInTheDocument();

    // The calendar day button title should list both events separated by comma
    const calDayBtn = await screen.findByTitle('Reading Dune: Part 1, Reading Dune: Part 2');
    expect(calDayBtn).toBeInTheDocument();

    // Click the calendar day button
    fireEvent.click(calDayBtn);

    // Verify the Event Picker Modal header is visible
    expect(await screen.findByText('Select Gathering')).toBeInTheDocument();

    // Locate the modal element
    const modalContainer = screen.getByText('Select Gathering').closest('.fixed') as HTMLElement;
    expect(modalContainer).toBeInTheDocument();

    // Verify both event choices are listed in the modal
    const firstOption = within(modalContainer).getByText('Reading Dune: Part 1');
    const secondOption = within(modalContainer).getByText('Reading Dune: Part 2');
    expect(firstOption).toBeInTheDocument();
    expect(secondOption).toBeInTheDocument();

    // Click the second event option inside the modal
    fireEvent.click(secondOption);

    // Verify the modal is closed and we have transitioned to that event's details page
    expect(screen.queryByText('Select Gathering')).not.toBeInTheDocument();
    expect(await screen.findByText('Central Library Room 3B')).toBeInTheDocument();
    expect(screen.getByText('Discussion of Part 2.')).toBeInTheDocument();
  });

  it('displays the Selected Date card when clicking a calendar day without events, and pre-populates datetime in schedule modal', async () => {
    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    expect(await screen.findByText('Fiction Lovers Activities')).toBeInTheDocument();
    expect(screen.getByText('Event Calendar')).toBeInTheDocument();

    const dayButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('aspect-square') && !btn.getAttribute('title')
    );
    expect(dayButtons.length).toBeGreaterThan(0);

    fireEvent.click(dayButtons[0]);

    expect(await screen.findByText('Selected Date')).toBeInTheDocument();

    const scheduleButtons = screen.getAllByRole('button', { name: /host an activity/i });
    expect(scheduleButtons.length).toBe(2);
    fireEvent.click(scheduleButtons[1]);

    expect(screen.getByRole('heading', { name: /schedule gathering/i })).toBeInTheDocument();

    const dateTimeInput = screen.getByLabelText(/date & time/i) as HTMLInputElement;
    expect(dateTimeInput.value).toContain('T19:00');
  });

  it('does not show Edit button, organizers list nominate section, or RSVP lists to a non-organizer', async () => {
    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    expect(screen.queryByRole('button', { name: /edit gathering/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete gathering/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /attendee details/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/nominate other organizer/i)).not.toBeInTheDocument();
  });

  it('shows Edit button, Nominate Organizer section, and RSVP details lists to an organizer', async () => {
    const organizersEvent = {
      ...dummyEvent,
      organizers: {
        'u-1': { name: 'Maddy Testing', nominatedAt: new Date().toISOString() }
      }
    };
    (apiService.listEvents as jest.Mock).mockResolvedValue([organizersEvent]);
    (apiService.listMembers as jest.Mock).mockResolvedValue({
      items: [
        { userId: 'u-1', name: 'Maddy Testing', email: 'maddy@test.com', status: 'active' },
        { userId: 'u-member-1', name: 'Bob Member', email: 'bob@member.com', status: 'active' }
      ]
    });

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    expect(screen.getByRole('button', { name: /edit gathering/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /attendee details/i })).toBeInTheDocument();
    expect(screen.getByText(/nominate other organizer/i)).toBeInTheDocument();
    // Await the asynchronous member list fetch to prevent act() warnings
    expect(await screen.findByText(/Bob Member/i)).toBeInTheDocument();
  });

  it('shows Edit/Delete buttons to the event creator', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 'u-admin', name: 'Admin Alice' },
      loading: false,
    });

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    expect(screen.getByRole('button', { name: /edit gathering/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete gathering/i })).toBeInTheDocument();
  });

  it('allows the creator to edit event details', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 'u-admin', name: 'Admin Alice' },
      loading: false,
    });

    const updatedEvent = {
      ...dummyEvent,
      title: 'Reading Dune: Updated Title',
      location: 'New Location Room 4',
    };
    (apiService.updateEvent as jest.Mock).mockResolvedValue({ ...updatedEvent, seriesUpdated: false });

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    const editBtn = screen.getByRole('button', { name: /edit gathering/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: /edit gathering/i })).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    const locationInput = screen.getByLabelText(/location/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Reading Dune: Part 1');
    
    fireEvent.change(titleInput, { target: { value: 'Reading Dune: Updated Title' } });
    fireEvent.change(locationInput, { target: { value: 'New Location Room 4' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiService.updateEvent).toHaveBeenCalledWith(
        'club-fiction-001',
        'evt-100',
        expect.objectContaining({
          title: 'Reading Dune: Updated Title',
          location: 'New Location Room 4',
        }),
        false
      );
    });
  });

  it('allows the creator to delete the event', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 'u-admin', name: 'Admin Alice' },
      loading: false,
    });

    (apiService.deleteEvent as jest.Mock).mockResolvedValue({ message: 'Event deleted successfully', seriesDeleted: false });
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TestWrapper>
        <ClubEvents />
      </TestWrapper>
    );

    const eventCard = await screen.findByText('Reading Dune: Part 1');
    fireEvent.click(eventCard);

    const deleteBtn = screen.getByRole('button', { name: /delete gathering/i });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this gathering?');

    await waitFor(() => {
      expect(apiService.deleteEvent).toHaveBeenCalledWith('club-fiction-001', 'evt-100', false);
    });

    expect(screen.queryByText('Back to All Activities')).not.toBeInTheDocument();
  });
});

