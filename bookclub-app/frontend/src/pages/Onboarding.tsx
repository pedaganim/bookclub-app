import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

interface OnboardingStep {
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  { title: 'Welcome to BookClub', description: 'Let\'s get you started!' },
  { title: 'Set Up Your Profile', description: 'Tell us a bit about yourself' },
  { title: 'Join or Create a Club', description: 'Connect with fellow readers' },
];

const Onboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({ name: '', bio: '', timezone: 'UTC' });
  const [clubChoice, setClubChoice] = useState<'join' | 'create' | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNext = async () => {
    if (currentStep === 1) {
      // Save profile
      if (!profile.name.trim()) {
        setError('Name is required');
        return;
      }
      try {
        setLoading(true);
        setError('');
        await apiService.updateProfile(profile);
        setCurrentStep(currentStep + 1);
      } catch (err: any) {
        setError(err.message || 'Failed to update profile');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 2) {
      // Handle club selection
      if (clubChoice === 'join' && inviteCode.trim()) {
        try {
          setLoading(true);
          setError('');
          await apiService.joinClub(inviteCode);
          await completeOnboarding();
        } catch (err: any) {
          setError(err.message || 'Failed to join club');
          setLoading(false);
        }
      } else if (clubChoice === 'create' && clubName.trim()) {
        try {
          setLoading(true);
          setError('');
          await apiService.createClub({
            name: clubName,
            description: clubDescription,
            isPrivate: false,
          });
          await completeOnboarding();
        } catch (err: any) {
          setError(err.message || 'Failed to create club');
          setLoading(false);
        }
      } else {
        // Skip club creation for now
        await completeOnboarding();
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      await apiService.completeOnboarding();
      navigate('/library');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (currentStep === 2) {
      await completeOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      idx <= currentStep
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-1 w-full mt-2 ${
                        idx < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600">{steps[currentStep].description}</p>
          </div>

          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-indigo-900 mb-4">What you can do with BookClub:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-indigo-800">Upload book covers and auto-detect titles and authors</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-indigo-800">Swap books with friends and neighbors</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-indigo-800">Search for books within your groups</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-indigo-800">Create and join book clubs with like-minded readers</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 1: Profile Setup */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio (optional)
                </label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell us about yourself and your reading interests"
                />
              </div>
            </div>
          )}

          {/* Step 2: Club Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setClubChoice('join')}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    clubChoice === 'join'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-300'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Join a Club</h3>
                  <p className="text-sm text-gray-600">Enter an invite code to join an existing book club</p>
                </button>
                <button
                  onClick={() => setClubChoice('create')}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    clubChoice === 'create'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-300'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create a Club</h3>
                  <p className="text-sm text-gray-600">Start your own book club and invite others</p>
                </button>
              </div>

              {clubChoice === 'join' && (
                <div>
                  <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter 8-character code"
                    maxLength={8}
                  />
                </div>
              )}

              {clubChoice === 'create' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 mb-1">
                      Club Name
                    </label>
                    <input
                      type="text"
                      id="clubName"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="My Book Club"
                    />
                  </div>
                  <div>
                    <label htmlFor="clubDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      id="clubDescription"
                      value={clubDescription}
                      onChange={(e) => setClubDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="What's your club about?"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 text-red-600 text-sm">{error}</div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate('/library')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              {currentStep === 0 ? 'Skip' : 'Back'}
            </button>
            <div className="space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  disabled={loading}
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
