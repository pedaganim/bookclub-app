import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationSettings from '../../pages/NotificationSettings';
import { apiService } from '../../services/api';

// Provide a manual mock so Jest does not import the real module (which pulls axios ESM)
jest.mock('../../services/api', () => ({
  apiService: {
    getNotificationPrefs: jest.fn(),
    updateNotificationPrefs: jest.fn(),
  },
}));

const mockedApi = apiService as unknown as {
  getNotificationPrefs: jest.Mock;
  updateNotificationPrefs: jest.Mock;
};

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

    // Wait for prefs to render, then toggle a specific pref (comment_on_your_book was false -> becomes true)
    // Use role-based queries: checkboxes are [master, dm, new_book, comment, reminder, new_member, announcement]
    const checkboxes = await screen.findAllByRole('checkbox');
    // comment_on_your_book is the 4th checkbox (index 3)
    const commentToggle = checkboxes[3] as HTMLInputElement;
    expect(commentToggle).toBeInTheDocument();
    expect(commentToggle.checked).toBe(false);
    fireEvent.click(commentToggle);

    // Save
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockedApi.updateNotificationPrefs).toHaveBeenCalled();
    });
  });
});
