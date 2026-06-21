import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClubJoinRequests from '../components/ClubJoinRequests';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const ClubRequests: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();

  if (!clubId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-6 transition-colors group"
        >
          <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Join Requests</h1>
          <p className="text-gray-500 mt-1">Review and manage people who want to join your club.</p>
        </div>

        <ClubJoinRequests clubId={clubId} />
      </div>
    </div>
  );
};

export default ClubRequests;
