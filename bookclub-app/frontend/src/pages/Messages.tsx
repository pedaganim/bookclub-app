import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { DMConversation, DMMessage, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import UserPickerModal from '../components/UserPickerModal';

const POLL_MS = 10000; // 10s

const Messages: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams();

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [convError, setConvError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, Pick<User, 'userId'|'name'|'email'|'profilePicture'>>>({});

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [msgError, setMsgError] = useState('');
  const [composerText, setComposerText] = useState('');
  const pollRef = useRef<number | undefined>(undefined);

  // Load conversation list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingConvs(true);
        setConvError('');
        const res = await apiService.dmListConversations(50);
        if (!mounted) return;
        setConversations(res.items || []);
      } catch (e: any) {
        if (!mounted) return;
        setConvError(e.message || 'Failed to load conversations');
      } finally {
        if (mounted) setLoadingConvs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const activeConversation = useMemo(() => {
    if (!routeConversationId) return undefined;
    return conversations.find((c) => c.conversationId === routeConversationId);
  }, [routeConversationId, conversations]);

  // Load messages for active conversation
  const loadMessages = async (convId: string) => {
    try {
      setLoadingMsgs(true);
      setMsgError('');
      const res = await apiService.dmListMessages(convId, 30);
      setMessages(res.items || []);
      setNextToken(res.nextToken);
    } catch (e: any) {
      setMsgError(e.message || 'Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    if (!routeConversationId) return;
    (async () => {
      await loadMessages(routeConversationId);
      // Mark as read when opening thread
      try { await apiService.dmMarkRead(routeConversationId); } catch {}
    })();

    // Polling
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      loadMessages(routeConversationId);
    }, POLL_MS) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [routeConversationId]);

  const handleSelect = (conv: DMConversation) => {
    navigate(`/messages/${conv.conversationId}`);
  };

  const otherUserId = useMemo(() => {
    if (!user || !activeConversation) return undefined;
    return activeConversation.userAId === user.userId
      ? activeConversation.userBId
      : activeConversation.userAId;
  }, [activeConversation, user]);

  const otherUser = useMemo(() => {
    if (!otherUserId) return undefined;
    return userCache[otherUserId];
  }, [otherUserId, userCache]);

  // Fetch other participant public info when active conversation changes
  useEffect(() => {
    if (!otherUserId || userCache[otherUserId]) return;
    (async () => {
      try {
        const u = await apiService.getUserPublic(otherUserId);
        setUserCache(prev => ({ ...prev, [otherUserId]: u }));
      } catch {}
    })();
  }, [otherUserId]);

  const handleSend = async () => {
    if (!routeConversationId || !otherUserId) return;
    const text = composerText.trim();
    if (!text) return;
    try {
      setComposerText('');
      const msg = await apiService.dmSendMessage(routeConversationId, otherUserId, text);
      setMessages((prev) => [msg, ...prev]); // since list is descending by createdAt
    } catch (e: any) {
      setMsgError(e.message || 'Failed to send message');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Please sign in to view your messages.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversations list */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              <button
                onClick={() => setShowPicker(true)}
                className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                New Conversation
              </button>
            </div>
            {loadingConvs ? (
              <div className="text-gray-600 text-sm">Loading…</div>
            ) : convError ? (
              <div className="text-sm text-red-600">{convError}</div>
            ) : conversations.length === 0 ? (
              <div className="text-gray-600 text-sm">No conversations yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {conversations.map((c) => {
                  const isActive = c.conversationId === routeConversationId;
                  const unread = user && (c.userAId === user.userId ? c.unreadCountForUserA : c.unreadCountForUserB);
                  const otherId = user && (c.userAId === user.userId ? c.userBId : c.userAId);
                  const other = otherId ? userCache[otherId] : undefined;
                  // Lazy fetch other user for list item
                  if (otherId && !other) {
                    (async () => {
                      try {
                        const u = await apiService.getUserPublic(otherId);
                        setUserCache(prev => (prev[otherId] ? prev : { ...prev, [otherId]: u }));
                      } catch {}
                    })();
                  }
                  return (
                    <li key={c.conversationId}>
                      <button
                        onClick={() => handleSelect(c)}
                        className={`w-full text-left px-2 py-3 hover:bg-gray-50 ${isActive ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {other?.profilePicture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={other.profilePicture} alt={other.name} className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600">
                              {(other?.name || 'U').slice(0,1)}
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900 truncate">{other?.name || c.conversationId.slice(0, 8) + '…'}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 truncate">{c.lastMessageSnippet || 'No messages yet'}</div>
                          {!!unread && unread > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                              {unread}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Thread view */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:col-span-2 flex flex-col">
            {!routeConversationId ? (
              <div className="text-gray-600">Select a conversation to start messaging.</div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="text-sm text-gray-700">Chat with</div>
                  <div className="flex items-center gap-2">
                    {otherUser?.profilePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={otherUser.profilePicture} alt={otherUser.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
                        {(otherUser?.name || 'U').slice(0,1)}
                      </div>
                    )}
                    <div className="text-base font-medium text-gray-900">{otherUser?.name || otherUserId}</div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingMsgs ? (
                    <div className="text-gray-600 text-sm">Loading messages…</div>
                  ) : msgError ? (
                    <div className="text-sm text-red-600">{msgError}</div>
                  ) : messages.length === 0 ? (
                    <div className="text-gray-600 text-sm">No messages yet.</div>
                  ) : (
                    <ul className="space-y-3">
                      {messages.map((m) => (
                        <li key={m.messageId} className={`max-w-xl ${m.fromUserId === user?.userId ? 'ml-auto text-right' : ''}`}>
                          <div className={`inline-block px-3 py-2 rounded-lg ${m.fromUserId === user?.userId ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                            <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                            <div className={`mt-1 text-[10px] ${m.fromUserId === user?.userId ? 'text-indigo-100' : 'text-gray-500'}`}>{new Date(m.createdAt).toLocaleString()}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Composer */}
                <div className="mt-4 flex items-center gap-2">
                  <textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    rows={2}
                    placeholder="Type a message…"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!composerText.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showPicker && (
        <UserPickerModal
          onClose={() => setShowPicker(false)}
          onPick={async (userBrief) => {
            try {
              const conv = await apiService.dmCreateConversation(userBrief.userId);
              setUserCache(prev => ({ ...prev, [userBrief.userId]: userBrief }));
              setConversations((prev) => {
                if (prev.find((c) => c.conversationId === conv.conversationId)) return prev;
                return [conv, ...prev];
              });
              setShowPicker(false);
              navigate(`/messages/${conv.conversationId}`);
            } catch (e: any) {
              setConvError(e.message || 'Failed to create conversation');
            }
          }}
        />
      )}
    </div>
  );
};

export default Messages;
