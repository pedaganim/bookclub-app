/* eslint-disable testing-library/no-node-access, jest/no-conditional-expect */
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BrowseClubs from '../../pages/BrowseClubs';

// Mock apiService
jest.mock('../../services/api', () => ({
  apiService: {
    browseClubs: jest.fn(),
    requestClubJoin: jest.fn(),
  },
}));

const { apiService } = require('../../services/api');

describe('BrowseClubs page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads and displays clubs; supports search debounce', async () => {
    (apiService.browseClubs as jest.Mock)
      .mockResolvedValueOnce({ items: [
        { clubId: 'c1', name: 'Alpha Club', description: 'A', isPrivate: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', location: 'City' },
      ] })
      .mockResolvedValueOnce({ items: [
        { clubId: 'c2', name: 'Beta Club', description: 'B', isPrivate: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', location: 'Town' },
      ] });

    render(<BrowseClubs />);

    // initial load
    await waitFor(() => {
      expect(apiService.browseClubs).toHaveBeenCalled();
      expect(screen.getByText('Alpha Club')).toBeInTheDocument();
    });

    // type into search bar
    const input = screen.getByPlaceholderText(/search clubs/i);
    fireEvent.change(input, { target: { value: 'beta' } });

    // advance debounce
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(apiService.browseClubs).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Beta Club')).toBeInTheDocument();
    });
  });

  it('supports next/previous pagination via nextToken', async () => {
    (apiService.browseClubs as jest.Mock)
      .mockResolvedValueOnce({ items: [
        { clubId: 'c1', name: 'Alpha Club', isPrivate: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', location: 'City' },
      ], nextToken: 'token-1' })
      .mockResolvedValueOnce({ items: [
        { clubId: 'c2', name: 'Beta Club', isPrivate: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', location: 'Town' },
      ], nextToken: undefined })
      .mockResolvedValueOnce({ items: [
        { clubId: 'c1', name: 'Alpha Club', isPrivate: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', location: 'City' },
      ], nextToken: 'token-1' });

    render(<BrowseClubs />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Club')).toBeInTheDocument();
    });

    // go next (responsive renders mobile + desktop buttons; click the first)
    const nextButtons = screen.getAllByText('Next');
    fireEvent.click(nextButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Beta Club')).toBeInTheDocument();
    });

    // go previous (click the first)
    const prevButtons = screen.getAllByText('Previous');
    fireEvent.click(prevButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Alpha Club')).toBeInTheDocument();
    });
  });

  it('requests to join a club', async () => {
    (apiService.browseClubs as jest.Mock).mockResolvedValue({ items: [
      { clubId: 'c1', name: 'Alpha Club', isPrivate: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', location: 'City' },
    ] });
    (apiService.requestClubJoin as jest.Mock).mockResolvedValue({ status: 'pending' });

    // mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BrowseClubs />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Club')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/request to join/i));

    await waitFor(() => {
      expect(apiService.requestClubJoin).toHaveBeenCalledWith('c1');
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });
});
