import React, { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  loading?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  onClear, 
  placeholder = "Search books by title, author, description...", 
  loading = false 
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Clear search if input is empty
    if (value.trim() === '') {
      onClear();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              disabled={loading}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      {loading && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </form>
  );
};

export default SearchBar;