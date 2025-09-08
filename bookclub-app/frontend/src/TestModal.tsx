import React, { useState } from 'react';
import AddBookModal from './components/AddBookModal';
import { Book } from './types';

const TestModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  const handleBookAdded = (book: Book) => {
    console.log('Book added:', book);
    setShowModal(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Enhanced Book Upload Test</h1>
      <p className="mb-4 text-gray-600">
        This demonstrates the new image scan/upload functionality with OCR and auto-population.
      </p>
      
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Test Add Book Modal
      </button>

      {showModal && (
        <AddBookModal
          onClose={() => setShowModal(false)}
          onBookAdded={handleBookAdded}
        />
      )}
    </div>
  );
};

export default TestModal;