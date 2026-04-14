import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { ClubMessage, BookClub, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ChatBubbleLeftRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const POLL_MS = 5000; // 5s for club chat

const ClubChat: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [club, setClub] = useState<BookClub | null>(null);
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [error, setError] = useState('');
  const [composerText, setComposerText] = useState('');
  const [userCache, setUserCache] = useState<Record<string, Pick<User, 'userId'|'name'|'profilePicture'>>>({});
  
  const pollRef = useRef<number | undefined>(undefined);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const fetchClub = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await apiService.getClub(clubId);
      setClub(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load club info');
    }
  }, [clubId]);

  const loadMessages = useCallback(async (quiet = false) => {
    if (!clubId) return;
    try {
      if (!quiet) setLoadingMsgs(true);
      const res = await apiService.clubListMessages(clubId, 50);
      // Backend returns newest first, we want oldest first for display
      const items = (res.items || []).slice().reverse();
      setMessages(items);
      
      // Cache user info for new messages
      const missingUserIds = items
        .map(m => m.fromUserId)
        .filter(id => !userCache[id]);
      
      if (missingUserIds.length > 0) {
        const uniqueIds = Array.from(new Set(missingUserIds));
        await Promise.all(uniqueIds.map(async (id) => {
          try {
            const u = await apiService.getUserPublic(id);
            setUserCache(prev => ({ ...prev, [id]: u }));
          } catch {}
        }));
      }
    } catch (e: any) {
      if (!quiet) setError(e.message || 'Failed to load messages');
    } finally {
      if (!quiet) setLoadingMsgs(false);
    }
  }, [clubId, userCache]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClub(), loadMessages()]);
      setLoading(false);
    };
    init();

    // Polling
    pollRef.current = window.setInterval(() => {
      loadMessages(true);
    }, POLL_MS) as unknown as number;

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [clubId, fetchClub, loadMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clubId || !composerText.trim()) return;
    
    const text = composerText.trim();
    try {
      setComposerText('');
      const msg = await apiService.clubSendMessage(clubId, text);
      setMessages(prev => [...prev, msg]);
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-sm">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h2>
          <p className="text-gray-600 mb-6">Please sign in to participate in the club chat.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading && !club) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {club?.name || 'Club Chat'}
          </h1>
          <p className="text-xs text-gray-500 truncate">
            {club?.memberCount || 0} Members
          </p>
        </div>
        <Link
          to={`/clubs/${clubId}/explore`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          View Books
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loadingMsgs && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto w-full">
            {messages.map((m, idx) => {
              const isMe = m.fromUserId === user?.userId;
              const sender = userCache[m.fromUserId];
              const showAvatar = idx === 0 || messages[idx - 1].fromUserId !== m.fromUserId;
              
              return (
                <div key={m.messageId} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-8 flex-shrink-0 mr-2 self-end">
                      {showAvatar && (
                        sender?.profilePicture ? (
                          <img src={sender.profilePicture} alt={sender.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {(sender?.name || 'U').charAt(0)}
                          </div>
                        )
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMe && showAvatar && (
                      <span className="text-[10px] font-semibold text-gray-500 ml-1 mb-1">
                        {sender?.name || 'User'}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1 px-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={listEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 md:pb-6">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder="Send a message to the club..."
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!composerText.trim()}
            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.519 0 003.478 2.405z" />
            </svg>
          </button>
        </form>
        {error && (
          <p className="text-[10px] text-red-600 mt-2 text-center">{error}</p>
        )}
      </div>
    </div>
  );
};

export default ClubChat;
