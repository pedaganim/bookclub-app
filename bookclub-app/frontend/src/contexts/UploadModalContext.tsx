import React, { createContext, useContext, useState } from 'react';
import { LibraryConfig } from '../config/libraryConfig';

export const GENERIC_UPLOAD_CONFIG: LibraryConfig = {
  libraryType: 'all',
  slug: 'all',
  label: 'Library',
  shortLabel: 'All',
  emoji: '📦',
  tagline: '',
  description: '',
  postLabel: 'Add to Library',
  itemLabel: 'Item',
  itemLabelPlural: 'Items',
  emptyBrowseText: '',
  emptyMineText: '',
  searchPlaceholder: '',
  pageTitle: '',
  metaDescription: '',
  accentBg: 'bg-indigo-100',
  accentText: 'text-indigo-700',
  conditions: [],
  categories: [],
};

interface UploadModalContextValue {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const UploadModalContext = createContext<UploadModalContextValue>({
  isOpen: false,
  openModal: () => {},
  closeModal: () => {},
});

export const UploadModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <UploadModalContext.Provider value={{ isOpen, openModal: () => setIsOpen(true), closeModal: () => setIsOpen(false) }}>
      {children}
    </UploadModalContext.Provider>
  );
};

export const useUploadModal = () => useContext(UploadModalContext);
