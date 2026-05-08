import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import InviteByEmailModal from '../../components/InviteByEmailModal';
import { NotificationProvider } from '../../contexts/NotificationContext';

jest.mock('../../services/api', () => ({
  apiService: {
    listClubInvites: jest.fn(),
    inviteClubMembers: jest.fn(),
    revokeClubInvite: jest.fn(),
  },
}));

jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => <div data-testid="icon-x" />,
  EnvelopeIcon: () => <div data-testid="icon-envelope" />,
  ArrowUpTrayIcon: () => <div data-testid="icon-upload" />,
  TrashIcon: () => <div data-testid="icon-trash" />,
}));

const { apiService } = require('../../services/api');

const renderModal = (props = {}) =>
  render(
    <NotificationProvider>
      <InviteByEmailModal
        clubId="club-1"
        clubName="Test Club"
        onClose={jest.fn()}
        {...props}
      />
    </NotificationProvider>
  );

describe('InviteByEmailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.listClubInvites as jest.Mock).mockResolvedValue({ items: [] });
  });

  it('renders modal with club name and textarea', async () => {
    renderModal();
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalledWith('club-1'));
    expect(screen.getByText('Invite Members by Email')).toBeInTheDocument();
    expect(screen.getByText('Test Club')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/alice@example\.com/)).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', async () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    // The backdrop is the outermost div
    const backdrop = screen.getByText('Invite Members by Email').closest('.fixed');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('flushes email text to chips on blur', async () => {
    renderModal();
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    const textarea = screen.getByPlaceholderText(/alice@example\.com/);
    fireEvent.change(textarea, { target: { value: 'test@example.com' } });
    fireEvent.blur(textarea);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('flushes email text to chips on Enter', async () => {
    renderModal();
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    const textarea = screen.getByPlaceholderText(/alice@example\.com/);
    fireEvent.change(textarea, { target: { value: 'bob@example.com' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('marks invalid email chip in red', async () => {
    renderModal();
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    const textarea = screen.getByPlaceholderText(/alice@example\.com/);
    fireEvent.change(textarea, { target: { value: 'not-an-email' } });
    fireEvent.blur(textarea);
    const chip = screen.getByText('not-an-email');
    expect(chip.closest('span')).toHaveClass('bg-red-50');
  });

  it('removes a chip when X is clicked', async () => {
    renderModal();
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    const textarea = screen.getByPlaceholderText(/alice@example\.com/);
    fireEvent.change(textarea, { target: { value: 'remove@example.com' } });
    fireEvent.blur(textarea);
    expect(screen.getByText('remove@example.com')).toBeInTheDocument();
    // The X button is inside the chip span
    const chipSpan = screen.getByText('remove@example.com').closest('span')!;
    fireEvent.click(chipSpan.querySelector('button')!);
    expect(screen.queryByText('remove@example.com')).not.toBeInTheDocument();
  });

  it('sends invites and refreshes pending list on success', async () => {
    (apiService.inviteClubMembers as jest.Mock).mockResolvedValue({ invited: 2, invalid: [] });
    (apiService.listClubInvites as jest.Mock)
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        items: [
          { email: 'a@example.com', status: 'pending', createdAt: '2026-01-01T00:00:00Z', invitedBy: 'u1' },
          { email: 'b@example.com', status: 'pending', createdAt: '2026-01-01T00:00:00Z', invitedBy: 'u1' },
        ],
      });

    renderModal();
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText(/alice@example\.com/);
    fireEvent.change(textarea, { target: { value: 'a@example.com, b@example.com' } });
    fireEvent.blur(textarea);

    await act(async () => {
      fireEvent.click(screen.getByText(/Send/));
    });

    expect(apiService.inviteClubMembers).toHaveBeenCalledWith('club-1', ['a@example.com', 'b@example.com']);
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('a@example.com')).toBeInTheDocument());
  });

  it('shows pending invites and allows revoking', async () => {
    (apiService.listClubInvites as jest.Mock).mockResolvedValue({
      items: [
        { email: 'pending@example.com', status: 'pending', createdAt: '2026-05-01T00:00:00Z', invitedBy: 'u1' },
      ],
    });
    (apiService.revokeClubInvite as jest.Mock).mockResolvedValue({});

    renderModal();
    await waitFor(() => expect(screen.getByText('pending@example.com')).toBeInTheDocument());
    expect(screen.getByText('Pending Invites (1)')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Revoke'));
    });

    expect(apiService.revokeClubInvite).toHaveBeenCalledWith('club-1', 'pending@example.com');
    await waitFor(() => expect(screen.queryByText('pending@example.com')).not.toBeInTheDocument());
  });

  it('send button is disabled when no emails', async () => {
    renderModal();
    await waitFor(() => expect(apiService.listClubInvites).toHaveBeenCalled());
    const sendBtn = screen.getByText(/Send.*Invite/);
    expect(sendBtn.closest('button')).toBeDisabled();
  });
});
