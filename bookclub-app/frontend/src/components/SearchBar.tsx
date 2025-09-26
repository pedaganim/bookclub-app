import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { voiceSearchService } from '../services/voiceSearchService';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  value?: string; // optional externally-controlled value to show current search
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search books...", 
  className = "",
  value,
}) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSearchError, setVoiceSearchError] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when parent-provided value changes
  useEffect(() => {
    if (typeof value === 'string' && value !== searchQuery) {
      setSearchQuery(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounce search to avoid too many API calls
  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onSearch(query.trim());
    }, 1000); // 1000ms debounce as requested
  }, [onSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear any previous voice search errors
    setVoiceSearchError('');
    
    // Perform debounced search for better performance
    debouncedSearch(query);
  };

  const handleClear = () => {
    setSearchQuery('');
    // Cancel any pending debounce and immediately clear results
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onSearch('');
  };

  // Handle voice search button click
  const handleVoiceSearch = async () => {
    if (!voiceSearchService.isSupported()) {
      setVoiceSearchError('Voice search is not supported in your browser');
      return;
    }

    setIsRecording(true);
    setVoiceSearchError('');

    try {
      const transcript = await voiceSearchService.performVoiceSearch({
        useWebSpeech: true, // Prefer Web Speech API for immediate feedback
        maxDuration: 8000 // 8 seconds max recording
      });

      // Update search query with transcribed text
      setSearchQuery(transcript);
      
      // Immediately perform search with transcribed text
      onSearch(transcript.trim());
      
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Voice search failed:', error);
      setVoiceSearchError(error.message || 'Voice search failed. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Clear search"
                aria-label="Clear search"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleVoiceSearch}
              disabled={isRecording}
              className={`p-1 rounded-full transition-colors duration-200 ${
                isRecording 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : voiceSearchService.isSupported()
                    ? 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                    : 'text-gray-300 cursor-not-allowed'
              }`}
              title={
                isRecording 
                  ? 'Recording... Click to stop' 
                  : voiceSearchService.isSupported()
                    ? 'Voice search'
                    : 'Voice search not supported'
              }
            >
              <MicrophoneIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
      
      {/* Voice search error message */}
      {voiceSearchError && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {voiceSearchError}
        </div>
      )}
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="mt-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 flex items-center">
          <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          Listening... Speak now or tap the microphone to stop
        </div>
      )}
    </div>
  );
};

export default SearchBar;