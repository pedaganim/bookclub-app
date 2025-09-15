import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationSettings from '../../pages/NotificationSettings';
import { apiService } from '../../services/api';

jest.mock('../../services/api');

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('NotificationSettings Page', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('loads and displays preferences, allows toggling and saving', async () => {
    mockedApi.getNotificationPrefs.mockResolvedValue({
      emailOptIn: true,
      prefs: {
        dm_message_received: true,
        new_book_from_followed_user: true,
        comment_on_your_book: false,
        reminder_due_date: true,
        new_member_in_your_club: true,
        club_announcement: true,
      },
    } as any);
    mockedApi.updateNotificationPrefs.mockResolvedValue({
      emailOptIn: true,
      prefs: {
        dm_message_received: false,
      },
    } as any);

    render(<NotificationSettings />);

    // Initial loading
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    // Wait for loaded UI
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });

    // Toggle a specific pref (comment_on_your_book was false -> becomes true)
    const commentLabel = screen.getByText('Comments on my book');
    const row = commentLabel.closest('div')?.parentElement as HTMLElement; // row container
    const toggle = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(toggle).toBeInTheDocument();
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);

    // Save
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockedApi.updateNotificationPrefs).toHaveBeenCalled();
    });
  });
});
