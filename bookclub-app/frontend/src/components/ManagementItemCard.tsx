import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, LibraryItem } from '../types';
import { 
  TrashIcon, 
  PencilSquareIcon, 
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import EditBookModal from './EditBookModal';
import { getItemLabel } from '../utils/labels';

interface ManagementItemCardProps {
  item: LibraryItem;
  onDelete: (id: string) => void;
  onUpdate: (item: LibraryItem) => void;
  listView?: boolean;
}

const ManagementItemCard: React.FC<ManagementItemCardProps> = ({ item, onDelete, onUpdate, listView }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();
  const itemId = (item as any).bookId || (item as any).listingId;
  const label = getItemLabel(item.category);

  const handleCardClick = () => {
    navigate(`/books/${itemId}`);
  };

  const statusBadge = () => {
    const status = (item as any).status;
    if (status === 'lent') return <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Lent</span>;
    if (status === 'borrowed') return <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Borrowed</span>;
    if (status === 'available') return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Available</span>;
    return null;
  };

  if (listView) {
    return (
      <div 
        className="group bg-white rounded-2xl border border-gray-100 p-4 transition-all hover:shadow-md cursor-pointer flex gap-4 items-center"
        onClick={handleCardClick}
      >
        <div className="h-20 w-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
          {(item as any).coverImage ? (
            <img src={(item as any).coverImage} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">
              {item.category === 'toy' ? '🧸' : item.category === 'tool' ? '🔧' : '📚'}
            </div>
          )}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
            {statusBadge()}
          </div>
          <p className="text-sm text-gray-500 truncate">{(item as any).author || item.description}</p>
          
          <div className="mt-2 flex items-center gap-4 text-xs">
             {(item as any).lentToUserName && (
               <div className="flex items-center gap-1 text-orange-600 font-medium">
                 <UserIcon className="h-3 w-3" /> Lent to {(item as any).lentToUserName}
               </div>
             )}
             {(item as any).lentTo && (
               <div className="flex items-center gap-1 text-orange-600 font-medium">
                 <UserIcon className="h-3 w-3" /> Lent to {(item as any).lentTo}
               </div>
             )}
             {(item as any).borrowedFrom && (
               <div className="flex items-center gap-1 text-indigo-600 font-medium">
                 <UserIcon className="h-3 w-3" /> Borrowed from {(item as any).borrowedFrom}
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => setShowEditModal(true)}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-gray-50 rounded-lg"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button 
            onClick={() => { if(window.confirm(`Are you sure you want to delete this ${label}?`)) onDelete(itemId); }}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-gray-50 rounded-lg"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {showEditModal && (
          <EditBookModal
            book={item as Book}
            onClose={() => setShowEditModal(false)}
            onBookUpdated={(updated) => {
              onUpdate(updated);
              setShowEditModal(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="group bg-white rounded-3xl border border-gray-100 overflow-hidden transition-all hover:shadow-xl cursor-pointer flex flex-col h-full"
      onClick={handleCardClick}
    >
      <div className="relative aspect-[4/5] bg-gray-100 flex items-center justify-center overflow-hidden">
        {(item as any).coverImage ? (
          <img 
            src={(item as any).coverImage} 
            alt={item.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="text-6xl opacity-40 transform transition-transform group-hover:scale-125 duration-300">
            {item.category === 'toy' ? '🧸' : item.category === 'tool' ? '🔧' : item.category === 'game' ? '🎮' : '📚'}
          </div>
        )}
        
        <div className="absolute top-4 right-4">
          {statusBadge()}
        </div>

        {/* Floating actions on hover */}
        <div 
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform flex justify-center gap-2"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={() => setShowEditModal(true)}
            className="bg-white/90 backdrop-blur-sm text-gray-900 p-2.5 rounded-2xl hover:bg-white transition-colors shadow-lg flex items-center gap-2 text-xs font-bold"
          >
            <PencilIcon className="h-4 w-4" /> Edit
          </button>
          <button 
            onClick={() => { if(window.confirm(`Are you sure you want to delete this ${label}?`)) onDelete(itemId); }}
            className="bg-red-500 text-white p-2.5 rounded-2xl hover:bg-red-600 transition-colors shadow-lg"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 truncate group-hover:text-indigo-600">
          {item.title || `Untitled ${label}`}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem] mb-4">
          {(item as any).author || item.description || `No description provided for this ${label}.`}
        </p>
        
        <div className="mt-auto space-y-2">
          {((item as any).lentToUserName || (item as any).lentTo) && (
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl">
              <UserIcon className="h-3.5 w-3.5" /> <span>Lent to {(item as any).lentToUserName || (item as any).lentTo}</span>
            </div>
          )}
          {(item as any).borrowedFrom && (
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">
              <UserIcon className="h-3.5 w-3.5" /> <span>Borrowed from {(item as any).borrowedFrom}</span>
            </div>
          )}
          
          {((item as any).wantInReturn || (item as any).condition) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {(item as any).condition && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <TagIcon className="h-3 w-3" /> {(item as any).condition.replace('_', ' ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditBookModal
          book={item as Book}
          onClose={() => setShowEditModal(false)}
          onBookUpdated={(updated) => {
            onUpdate(updated);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ManagementItemCard;
