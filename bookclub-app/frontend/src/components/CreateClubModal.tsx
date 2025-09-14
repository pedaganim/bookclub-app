import React, { useState } from 'react';
import { BookClub } from '../types';
import { apiService } from '../services/api';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface CreateClubModalProps {
  onClose: () => void;
  onClubCreated: (club: BookClub) => void;
}

const CreateClubModal: React.FC<CreateClubModalProps> = ({ onClose, onClubCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    isPrivate: false,
    memberLimit: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const fetchFn: typeof fetch | undefined = (globalThis as any).fetch;
      if (!fetchFn) throw new Error('Geocoding service unavailable');

      let response: any;
      try {
        response = await fetchFn(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        );
      } catch {
        response = undefined as any;
      }

      if (!response || !('ok' in response) || !response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      
      if (data.error) {
        throw new Error('Location not found');
      }

      // Extract city, state/country from the response
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality;
      const state = address.state || address.region;
      const country = address.country;

      if (city && state) {
        return `${city}, ${state}`;
      } else if (city && country) {
        return `${city}, ${country}`;
      } else if (state && country) {
        return `${state}, ${country}`;
      } else if (country) {
        return country;
      } else {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Reverse geocoding failed:', error);
      // Fallback to coordinates if geocoding fails
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    setLocationMessage('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const address = await reverseGeocode(latitude, longitude);
          
          setFormData(prev => ({
            ...prev,
            location: address,
          }));
          
          setLocationMessage('Location detected successfully!');
          setTimeout(() => setLocationMessage(''), 3000);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error getting location details:', error);
          setLocationMessage('Could not get location details. Please enter manually.');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationMessage('Location access denied. Please enter location manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationMessage('Location information unavailable. Please enter manually.');
            break;
          case error.TIMEOUT:
            setLocationMessage('Location request timed out. Please try again or enter manually.');
            break;
          default:
            setLocationMessage('An error occurred while getting location. Please enter manually.');
            break;
        }
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Club name is required');
      return;
    }

    if (!formData.location.trim()) {
      setError('Location is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const clubData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim(),
        isPrivate: formData.isPrivate,
        memberLimit: formData.memberLimit ? parseInt(formData.memberLimit, 10) : undefined,
      };

      const club = await apiService.createClub(clubData);
      onClubCreated(club);
    } catch (err: any) {
      setError(err.message || 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create Book Club</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Club Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter club name"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Describe your book club (optional)"
              maxLength={500}
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter city, state/country (e.g., New York, NY)"
                maxLength={100}
                required
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                title="Use my current location"
              >
                {locationLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                ) : (
                  <MapPinIcon className="h-4 w-4" />
                )}
                <span className="text-sm hidden sm:inline">
                  {locationLoading ? 'Getting...' : 'Use My Location'}
                </span>
              </button>
            </div>
            {locationMessage && (
              <div className={`text-sm mt-1 ${
                locationMessage.includes('successfully') || locationMessage.includes('detected') 
                  ? 'text-green-600' 
                  : 'text-orange-600'
              }`}>
                {locationMessage}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="memberLimit" className="block text-sm font-medium text-gray-700 mb-1">
              Member Limit
            </label>
            <input
              type="number"
              id="memberLimit"
              name="memberLimit"
              value={formData.memberLimit}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Leave empty for no limit"
              min="2"
              max="1000"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700">
              Make this club private
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClubModal;