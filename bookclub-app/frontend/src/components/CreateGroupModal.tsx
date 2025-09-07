import React, { useState } from 'react';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { LocationService } from '../services/location';
import { LocationData } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onGroupCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    maxMembers: 50,
  });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? parseInt(value) || 0 : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setErrors(prev => ({ ...prev, location: '' }));
    
    try {
      const currentLocation = await LocationService.getCurrentLocation();
      const address = await LocationService.getAddressFromCoordinates(
        currentLocation.latitude, 
        currentLocation.longitude
      );
      setLocation({ ...currentLocation, address });
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        location: error instanceof Error ? error.message : 'Failed to get location' 
      }));
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Group name is required';
    if (formData.name.length < 2) newErrors.name = 'Group name must be at least 2 characters';
    if (!location) newErrors.location = 'Location is required';
    if (formData.maxMembers < 2) newErrors.maxMembers = 'Maximum members must be at least 2';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.createGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        location: location!,
        isPublic: formData.isPublic,
        maxMembers: formData.maxMembers,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        isPublic: true,
        maxMembers: 50,
      });
      setLocation(null);
      setErrors({});
      
      onGroupCreated();
      onClose();
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to create group' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create New Group</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Group Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter group name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Describe your group..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              {location ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-green-800">Location set</p>
                      <p className="text-xs text-green-600">{location.address}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    className="mt-2 text-sm text-green-600 hover:text-green-800"
                  >
                    Change location
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isLoadingLocation}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <MapPinIcon className="w-5 h-5" />
                  <span>
                    {isLoadingLocation ? 'Getting location...' : 'Get current location'}
                  </span>
                </button>
              )}
              {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-700">
                  Max Members
                </label>
                <input
                  type="number"
                  id="maxMembers"
                  name="maxMembers"
                  value={formData.maxMembers}
                  onChange={handleInputChange}
                  min="2"
                  max="1000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.maxMembers && <p className="mt-1 text-sm text-red-600">{errors.maxMembers}</p>}
              </div>

              <div>
                <label htmlFor="isPublic" className="block text-sm font-medium text-gray-700">
                  Visibility
                </label>
                <select
                  id="isPublic"
                  name="isPublic"
                  value={formData.isPublic.toString()}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.value === 'true' }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="true">Public</option>
                  <option value="false">Private</option>
                </select>
              </div>
            </div>

            {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;