/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManageRequestsModal from '../../components/ManageRequestsModal';

jest.mock('../../services/api', () => ({
  apiService: {
    listJoinRequests: jest.fn(),
    approveJoinRequest: jest.fn(),
    rejectJoinRequest: jest.fn(),
  },
}));

const { apiService } = require('../../services/api');

describe('ManageRequestsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and shows pending requests', async () => {
    (apiService.listJoinRequests as jest.Mock).mockResolvedValue({
      items: [
        { clubId: 'c1', userId: 'u1', status: 'pending', requestedAt: '2024-01-01T00:00:00Z' },
      ],
    });

    render(<ManageRequestsModal clubId="c1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Manage Join Requests/i)).toBeInTheDocument();
      expect(screen.getByText(/User u1/i)).toBeInTheDocument();
    });
  });

  it('approves a request and removes from list', async () => {
    (apiService.listJoinRequests as jest.Mock).mockResolvedValue({
      items: [ { clubId: 'c1', userId: 'u1', status: 'pending' } ],
    });
    (apiService.approveJoinRequest as jest.Mock).mockResolvedValue({ approved: true });

    render(<ManageRequestsModal clubId="c1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/User u1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Approve/i));

    await waitFor(() => {
      expect(apiService.approveJoinRequest).toHaveBeenCalledWith('c1', 'u1');
      expect(screen.queryByText(/User u1/i)).not.toBeInTheDocument();
    });
  });

  it('rejects a request and removes from list', async () => {
    (apiService.listJoinRequests as jest.Mock).mockResolvedValue({
      items: [ { clubId: 'c1', userId: 'u2', status: 'pending' } ],
    });
    (apiService.rejectJoinRequest as jest.Mock).mockResolvedValue({ rejected: true });

    render(<ManageRequestsModal clubId="c1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/User u2/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Reject/i));

    await waitFor(() => {
      expect(apiService.rejectJoinRequest).toHaveBeenCalledWith('c1', 'u2');
      expect(screen.queryByText(/User u2/i)).not.toBeInTheDocument();
    });
  });
});
