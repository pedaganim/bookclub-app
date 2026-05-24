import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronUpIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { BookClub, ClubComment, ClubPost } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import SEO from '../components/SEO';

const MAX_POST_LENGTH = 1000;
const MAX_COMMENT_LENGTH = 500;

const formatRelativeTime = (isoDate?: string) => {
  if (!isoDate) return '';

  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate));
};

const getCommentTotal = (post: ClubPost) => post.commentCount ?? post.comments?.length ?? 0;

const Discussions: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postText, setPostText] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);
  const [error, setError] = useState('');
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(() => new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentingPostIds, setCommentingPostIds] = useState<Set<string>>(() => new Set());

  const activeClubs = useMemo(
    () => clubs.filter(club => club.userStatus === 'active' || club.isMember === true),
    [clubs]
  );
  const postingClub = activeClubs[0] || null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [clubResult, postResult] = await Promise.all([
        apiService.getUserClubs(),
        apiService.listPostsFeed(),
      ]);
      setClubs(clubResult.items || []);
      setPosts(postResult.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = postText.trim();
    if (!text || posting) return;
    if (!postingClub) {
      addNotification('error', 'Join a club before sharing a post.');
      return;
    }

    try {
      setPosting(true);
      const created = await apiService.createPost({
        clubId: postingClub.clubId,
        text,
        images: [],
      });
      setPostText('');
      setComposerFocused(false);
      setPosts(prev => [{
        ...created,
        authorName: created.authorName || user?.name || null,
        isOwner: true,
        comments: created.comments || [],
        commentCount: created.commentCount || 0,
      }, ...prev]);
      addNotification('success', 'Post shared');
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to share post');
    } finally {
      setPosting(false);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const openComments = (postId: string) => {
    setExpandedPostIds(prev => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
  };

  const updateCommentDraft = (postId: string, value: string) => {
    setCommentDrafts(prev => ({
      ...prev,
      [postId]: value.slice(0, MAX_COMMENT_LENGTH),
    }));
  };

  const submitComment = async (event: React.FormEvent, post: ClubPost) => {
    event.preventDefault();
    const text = (commentDrafts[post.postId] || '').trim();
    if (!text || commentingPostIds.has(post.postId)) return;

    try {
      setCommentingPostIds(prev => {
        const next = new Set(prev);
        next.add(post.postId);
        return next;
      });

      const created = await apiService.createComment(post.postId, {
        text,
        images: [],
      });
      const enrichedComment: ClubComment = {
        ...created,
        userName: created.userName || user?.name || null,
        isOwner: true,
      };

      setPosts(prev => prev.map(existingPost => {
        if (existingPost.postId !== post.postId) return existingPost;
        const existingComments = existingPost.comments || [];
        return {
          ...existingPost,
          comments: [...existingComments, enrichedComment],
          commentCount: (existingPost.commentCount ?? existingComments.length) + 1,
        };
      }));
      setCommentDrafts(prev => {
        const next = { ...prev };
        delete next[post.postId];
        return next;
      });
      setExpandedPostIds(prev => {
        const next = new Set(prev);
        next.add(post.postId);
        return next;
      });
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to add comment');
    } finally {
      setCommentingPostIds(prev => {
        const next = new Set(prev);
        next.delete(post.postId);
        return next;
      });
    }
  };

  const composerExpanded = composerFocused || Boolean(postText);
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const composerPlaceholder = firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?";

  return (
    <div className="min-h-screen bg-gray-100">
      <SEO
        title="Discussions - Club Posts"
        description="Read and share updates with your club."
      />

      <div className="mx-auto max-w-2xl px-3 py-3 sm:px-4 md:py-5">
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
          </div>
        ) : (
          <div className="space-y-3">
            {postingClub ? (
              <form onSubmit={submitPost} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50" title="Speak" aria-label="Speak">
                      <span>🔊</span>
                       <span>Speak</span>
                    </button>

                  </div>
                  <textarea
                    value={postText}
                    onFocus={() => setComposerFocused(true)}
                    onChange={event => setPostText(event.target.value.slice(0, MAX_POST_LENGTH))}
                    rows={composerExpanded ? 10: 1}
                    placeholder={composerPlaceholder}
                    className="block min-h-[42px] w-full resize-none rounded-lg border-0 bg-gray-100 px-3.5 py-2.5 text-sm leading-5 text-gray-900 placeholder:text-gray-500 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />

                  {composerExpanded && (
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="text-xs font-medium text-gray-400">
                        {postText ? `${postText.trim().length}/${MAX_POST_LENGTH}` : ''}
                      </span>
                      <button
                        type="submit"
                        aria-label={posting ? 'Posting' : 'Post'}
                        disabled={!postText.trim() || posting}
                        className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        {posting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
                <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-700">Join a club to start a discussion.</p>
              </div>
            )}

            {posts.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-lg p-8 text-center">
                <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-700">No posts yet.</p>
                <p className="mt-1 text-sm text-gray-400">Share the first update with your club.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => {
                  const authorName = post.authorName || (post.isOwner ? user?.name : null) || 'Club member';
                  const comments = post.comments || [];
                  const commentTotal = getCommentTotal(post);
                  const commentsExpanded = expandedPostIds.has(post.postId);
                  const commentDraft = commentDrafts[post.postId] || '';
                  const isCommenting = commentingPostIds.has(post.postId);
                  return (
                    <article key={post.postId} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div className="p-3.5 pb-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h2 className="text-sm font-bold text-gray-900">{authorName}</h2>
                            <span className="text-xs text-gray-400">-</span>
                            <time className="text-xs font-medium text-gray-400">{formatRelativeTime(post.createdAt)}</time>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-6 text-gray-900">{post.text}</p>
                          {post.images && post.images.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {post.images.map((image, index) => (
                                <img
                                  key={`${post.postId}-image-${index}`}
                                  src={image}
                                  alt=""
                                  className="aspect-video w-full rounded-lg object-cover border border-gray-100"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {commentTotal > 0 && (
                        <div className="flex items-center justify-end px-3.5 pb-1">
                          <button
                            type="button"
                            onClick={() => toggleComments(post.postId)}
                            aria-expanded={commentsExpanded}
                            aria-controls={`comments-${post.postId}`}
                            className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-100"
                          >
                            <span>{commentTotal} {commentTotal === 1 ? 'comment' : 'comments'}</span>
                            {commentsExpanded ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      <div className="mx-3.5 border-t border-gray-100" />
                      <div className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => commentsExpanded ? toggleComments(post.postId) : openComments(post.postId)}
                          aria-expanded={commentsExpanded}
                          aria-controls={`comments-${post.postId}`}
                          className="inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        >
                          <ChatBubbleLeftRightIcon className="h-5 w-5" />
                          <span>{commentsExpanded ? 'Hide comments' : 'Comment'}</span>
                        </button>
                      </div>

                      {commentsExpanded && (
                        <div id={`comments-${post.postId}`} className="border-t border-gray-100 px-3.5 pb-3 pt-3">
                          {comments.length > 0 && (
                            <div className="space-y-2.5">
                              {comments.map(comment => {
                                const commentAuthor = comment.userName || (comment.isOwner ? user?.name : null) || 'Club member';
                                return (
                                  <div key={comment.commentId} className="min-w-0">
                                    <div className="inline-block max-w-full rounded-lg bg-gray-100 px-3 py-2">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="text-xs font-bold text-gray-900">{commentAuthor}</span>
                                        <time className="text-[11px] font-medium text-gray-500">{formatRelativeTime(comment.createdAt)}</time>
                                      </div>
                                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-gray-800">{comment.text}</p>
                                      {comment.images && comment.images.length > 0 && (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                          {comment.images.map((image, index) => (
                                            <img
                                              key={`${comment.commentId}-image-${index}`}
                                              src={image}
                                              alt=""
                                              className="aspect-video w-full rounded-md object-cover border border-gray-100"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <form onSubmit={event => submitComment(event, post)} className={comments.length > 0 ? 'mt-3' : ''}>
                            <div className="relative min-w-0">
                              <textarea
                                value={commentDraft}
                                onChange={event => updateCommentDraft(post.postId, event.target.value)}
                                rows={commentDraft ? 2 : 1}
                                placeholder="Write a comment..."
                                className="block min-h-[38px] w-full resize-none rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-11 text-sm leading-5 text-gray-900 placeholder:text-gray-500 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-100"
                              />
                              <button
                                type="submit"
                                aria-label={isCommenting ? 'Posting comment' : 'Comment'}
                                disabled={!commentDraft.trim() || isCommenting}
                                className="absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-teal-700 text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-400"
                              >
                                <PaperAirplaneIcon className="h-4 w-4" />
                              </button>
                              {commentDraft && (
                                <div className="mt-1 text-right text-[11px] font-medium text-gray-400">
                                  {commentDraft.trim().length}/{MAX_COMMENT_LENGTH}
                                </div>
                              )}
                            </div>
                          </form>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discussions;
