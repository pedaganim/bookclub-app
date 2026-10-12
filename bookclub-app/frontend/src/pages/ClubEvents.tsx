import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { BookClub, ClubEvent, RecurrencePattern } from '../types';
import SEO from '../components/SEO';
import {
  CalendarIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const ClubEvents: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [clubId, setClubId] = useState<string | null>(null);
  const [club, setClub] = useState<BookClub | null>(null);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Organizer management states
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reminderStatus, setReminderStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  // Active clubs for selector
  const [userClubs, setUserClubs] = useState<BookClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  
  // Create Event Form Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Event Picker Modal State (for multiple events on the same day)
  const [pickerEvents, setPickerEvents] = useState<ClubEvent[]>([]);
  const [pickerDateLabel, setPickerDateLabel] = useState<string>('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDateTime, setNewDateTime] = useState('');
  const [newTasks, setNewTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Recurrence State
  const [recurrencePattern, setRecurrencePattern] = useState<'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [showDeleteSeriesConfirm, setShowDeleteSeriesConfirm] = useState(false);
  const [showUpdateSeriesConfirm, setShowUpdateSeriesConfirm] = useState(false);
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string | null>(null);

  // Calendar Selection State
  const [selectedCalDate, setSelectedCalDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  
  // Chat input
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Calendar Depiction state
  const [calDate, setCalDate] = useState(new Date());

  // Set calendar month to next event's month when club changes
  useEffect(() => {
    if (events.length > 0) {
      const dates = events.map(e => new Date(e.dateTime)).sort((a, b) => a.getTime() - b.getTime());
      const nextEvent = dates.find(d => d.getTime() >= Date.now()) || dates[0];
      setCalDate(new Date(nextEvent));
    } else {
      setCalDate(new Date());
    }
  }, [clubId, events]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Day of the week of first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay(); 
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();
    
    // Days array
    const days: (Date | null)[] = [];
    
    // Pad previous month's days as null
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Current month's days
    for (let d = 1; d <= numDays; d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(evt => {
      const d = new Date(evt.dateTime);
      return d.getFullYear() === date.getFullYear() &&
             d.getMonth() === date.getMonth() &&
             d.getDate() === date.getDate();
    });
  };

  // Resolve slug to clubId
  useEffect(() => {
    if (!slug) return;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (UUID_RE.test(slug)) {
      setClubId(slug);
      return;
    }
    setLoading(true);
    apiService.resolveClubSlug(slug)
      .then(resolved => {
        if (resolved?.clubId) {
          setClubId(resolved.clubId);
        } else {
          setError('Club not found');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Club not found');
        setLoading(false);
      });
  }, [slug]);

  // Load user's clubs to support switching between them in selector
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setClubsLoading(true);
    apiService.getUserClubs()
      .then((res: any) => {
        const active: BookClub[] = (res.items || []).filter((c: any) => c.userStatus === 'active');
        setUserClubs(active);
        // If there's no slug in the URL, redirect to the first active neighbourhood
        if (!slug) {
          if (active.length > 0) {
            navigate(`/neighbourhoods/${active[0].slug}/activities`, { replace: true });
          } else {
            setLoading(false);
          }
        }
      })
      .catch(() => {
        setUserClubs([]);
        if (!slug) {
          setLoading(false);
        }
      })
      .finally(() => setClubsLoading(false));
  }, [isAuthenticated, slug, navigate]);

  // Fetch Club and its Events
  const fetchClubAndEvents = useCallback(async () => {
    if (!clubId) return;
    try {
      setLoading(true);
      setError('');
      const [clubData, eventsData] = await Promise.all([
        apiService.getClub(clubId),
        apiService.listEvents(clubId)
      ]);
      setClub(clubData);
      setEvents(eventsData);
      // Keep selectedEventId null by default so user sees the grid of all upcoming gatherings
      setSelectedEventId(null);
      setSelectedCalDate(null);
      setEditingEvent(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load club events');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (clubId) {
      fetchClubAndEvents();
    }
  }, [clubId, fetchClubAndEvents]);

  // Selected event object
  const selectedEvent = events.find(e => e.eventId === selectedEventId) || null;

  // Auto-scroll chat to bottom when event changes or new comments arrive
  useEffect(() => {
    if (commentsEndRef.current && typeof commentsEndRef.current.scrollIntoView === 'function') {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedEvent?.discussions]);

  // Helper to check if a user is an organizer of the event
  const isOrganizer = useCallback((evt: ClubEvent | null, uid: string | undefined) => {
    if (!evt || !uid) return false;
    return evt.createdBy === uid || !!(evt.organizers && evt.organizers[uid]);
  }, []);

  // Fetch club members if selected event is loaded and user is organizer
  const fetchClubMembers = useCallback(async (targetClubId: string) => {
    try {
      setLoadingMembers(true);
      const result = await apiService.listMembers(targetClubId);
      setClubMembers(result.items || []);
    } catch (err) {
      console.error("Failed to load club members", err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEvent && clubId && isAuthenticated && user) {
      const isOrg = selectedEvent.createdBy === user.userId || !!(selectedEvent.organizers && selectedEvent.organizers[user.userId]);
      if (isOrg && clubMembers.length === 0 && !loadingMembers) {
        fetchClubMembers(clubId);
      }
    }
  }, [selectedEvent, clubId, isAuthenticated, user, clubMembers.length, loadingMembers, fetchClubMembers]);

  useEffect(() => {
    setClubMembers([]);
  }, [clubId]);

  const handleNominateOrganizer = async (nomineeUserId: string, nomineeName: string) => {
    if (!clubId || !selectedEvent || !isAuthenticated) return;
    try {
      setActionError('');
      const updatedOrganizers = {
        ...(selectedEvent.organizers || {}),
        [nomineeUserId]: {
          name: nomineeName,
          nominatedAt: new Date().toISOString()
        }
      };
      
      const result = await apiService.updateEvent(clubId, selectedEvent.eventId, { organizers: updatedOrganizers });
      
      if ('seriesUpdated' in result && result.seriesUpdated) {
        setEvents(prev => prev.map(e => {
          const matchingUpdated = result.events.find(u => u.eventId === e.eventId);
          return matchingUpdated ? matchingUpdated : e;
        }));
      } else {
        const updatedEvent = result as ClubEvent;
        setEvents(prev => prev.map(e => e.eventId === selectedEvent.eventId ? updatedEvent : e));
      }
    } catch (e: any) {
      setActionError(e.message || 'Failed to nominate organizer');
    }
  };

  const handleRemoveOrganizer = async (nomineeUserId: string) => {
    if (!clubId || !selectedEvent || !isAuthenticated) return;
    if (nomineeUserId === selectedEvent.createdBy) return; // Cannot remove creator
    
    try {
      setActionError('');
      const updatedOrganizers = { ...(selectedEvent.organizers || {}) };
      delete updatedOrganizers[nomineeUserId];
      
      const result = await apiService.updateEvent(clubId, selectedEvent.eventId, { organizers: updatedOrganizers });
      
      if ('seriesUpdated' in result && result.seriesUpdated) {
        setEvents(prev => prev.map(e => {
          const matchingUpdated = result.events.find(u => u.eventId === e.eventId);
          return matchingUpdated ? matchingUpdated : e;
        }));
      } else {
        const updatedEvent = result as ClubEvent;
        setEvents(prev => prev.map(e => e.eventId === selectedEvent.eventId ? updatedEvent : e));
      }
    } catch (e: any) {
      setActionError(e.message || 'Failed to remove organizer');
    }
  };

  // Handle RSVP
  const handleRsvp = async (status: 'going' | 'interested' | 'not_going') => {
    if (!clubId || !selectedEventId || !isAuthenticated) return;
    try {
      setActionError('');
      const updatedEvent = await apiService.rsvpEvent(clubId, selectedEventId, status);
      setEvents(prev => prev.map(e => e.eventId === selectedEventId ? updatedEvent : e));
    } catch (e: any) {
      setActionError(e.message || 'Failed to submit RSVP');
    }
  };

  // Handle Volunteering
  const handleVolunteer = async (taskName: string | null) => {
    if (!clubId || !selectedEventId || !isAuthenticated) return;
    try {
      setActionError('');
      const updatedEvent = await apiService.volunteerEvent(clubId, selectedEventId, taskName);
      setEvents(prev => prev.map(e => e.eventId === selectedEventId ? updatedEvent : e));
    } catch (e: any) {
      setActionError(e.message || 'Failed to update volunteer status');
    }
  };

  // Handle Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !selectedEventId || !commentInput.trim() || sendingComment || !isAuthenticated) return;
    try {
      setSendingComment(true);
      setActionError('');
      const updatedEvent = await apiService.commentEvent(clubId, selectedEventId, commentInput.trim());
      setEvents(prev => prev.map(e => e.eventId === selectedEventId ? updatedEvent : e));
      setCommentInput('');
    } catch (e: any) {
      setActionError(e.message || 'Failed to post comment');
    } finally {
      setSendingComment(false);
    }
  };

  // Format a Date as a UTC iCal-style timestamp YYYYMMDDTHHMMSSZ
  const toUtcIcal = (input: string | Date) => {
    const d = input instanceof Date ? input : new Date(input);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  };

  // Build a Google Calendar deep link for the given event (defaults to 1h duration)
  const buildGoogleCalendarUrl = (evt: ClubEvent) => {
    const start = new Date(evt.dateTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: evt.title || 'Event',
      dates: `${toUtcIcal(start)}/${toUtcIcal(end)}`,
    });
    const descLines = [evt.description, club?.name ? `Club: ${club.name}` : ''].filter(Boolean);
    if (descLines.length) params.set('details', descLines.join('\n'));
    if (evt.location) params.set('location', evt.location);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const handleDownloadIcs = async (evt: ClubEvent) => {
    if (!clubId) return;
    try {
      await apiService.downloadEventIcs(clubId, evt.eventId, evt.title || 'event');
    } catch (e: any) {
      setActionError(e.message || 'Failed to download calendar file');
    }
  };

  // Handle Send Broadcast Reminder
  const handleSendReminder = async () => {
    if (!clubId || !selectedEventId) return;
    try {
      setActionError('');
      setReminderStatus(null);
      const res = await apiService.remindEvent(clubId, selectedEventId);
      setReminderStatus({
        success: true,
        message: res.message || `Reminders sent to ${res.sentCount} participant(s)`
      });
      // Clear status after 5s
      setTimeout(() => setReminderStatus(null), 5000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to send reminders');
      setReminderStatus({
        success: false,
        message: e.message || 'Failed to send reminders'
      });
    }
  };

  // Task creation in modal
  const handleAddTask = () => {
    if (taskInput.trim() && !newTasks.includes(taskInput.trim())) {
      setNewTasks([...newTasks, taskInput.trim()]);
      setTaskInput('');
    }
  };

  const handleRemoveTask = (idxToRemove: number) => {
    setNewTasks(newTasks.filter((_, idx) => idx !== idxToRemove));
  };

  const formatToDateTimeLocal = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleOpenEditModal = (event: ClubEvent) => {
    setEditingEvent(event);
    setNewTitle(event.title);
    setNewDescription(event.description || '');
    setNewLocation(event.location || '');
    setNewDateTime(formatToDateTimeLocal(event.dateTime));
    setNewTasks(event.volunteerTasks || []);
    // Load recurrence info if editing a series event
    setRecurrencePattern(event.recurrencePattern || 'none');
    setRecurrenceEndDate(event.recurrenceEndDate || '');
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setNewTitle('');
    setNewDescription('');
    setNewLocation('');
    setNewDateTime('');
    setNewTasks([]);
    setRecurrencePattern('none');
    setRecurrenceEndDate('');
    setShowUpdateSeriesConfirm(false);
    setEditingEvent(null);
    setShowCreateModal(false);
  };

  const handleDeleteEvent = async (eventId: string, deleteSeries = false, skipConfirm = false) => {
    if (!clubId) return;
    
    const eventToDelete = events.find(e => e.eventId === eventId);
    const isSeriesEvent = eventToDelete && (eventToDelete.parentEventId || (eventToDelete.recurrencePattern && eventToDelete.recurrencePattern !== 'none'));
    
    // If deleting a series event and not already confirmed, show confirmation modal
    if (isSeriesEvent && !deleteSeries && !showDeleteSeriesConfirm && !skipConfirm) {
      setPendingDeleteEventId(eventId);
      setShowDeleteSeriesConfirm(true);
      return;
    }
    
    // For non-series events, show simple confirm
    if (!isSeriesEvent && !skipConfirm) {
      const confirmed = window.confirm('Are you sure you want to delete this gathering?');
      if (!confirmed) return;
    }
    
    try {
      setActionError('');
      const result = await apiService.deleteEvent(clubId, eventId, deleteSeries);
      
      if (result.seriesDeleted) {
        // Refresh all events after series deletion
        const eventsData = await apiService.listEvents(clubId);
        setEvents(eventsData);
      } else {
        // Single event deleted
        setEvents(prev => prev.filter(e => e.eventId !== eventId));
      }
      
      setSelectedEventId(null);
      setPendingDeleteEventId(null);
      setShowDeleteSeriesConfirm(false);
    } catch (e: any) {
      setActionError(e.message || 'Failed to delete event');
    }
  };

  // Handle Create or Edit Event Submission
  const handleSubmitEvent = async (e: React.FormEvent | React.MouseEvent, updateSeries = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (!clubId || !newTitle.trim() || !newDateTime || submittingEvent) return;

    try {
      setSubmittingEvent(true);
      setActionError('');
      const eventData = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        location: newLocation.trim(),
        dateTime: new Date(newDateTime).toISOString(),
        volunteerTasks: newTasks,
        recurrencePattern: recurrencePattern !== 'none' ? recurrencePattern : undefined,
        recurrenceEndDate: recurrencePattern !== 'none' && recurrenceEndDate ? recurrenceEndDate : undefined,
      };

      if (editingEvent) {
        // Check if this is part of a series
        const isSeriesEvent = editingEvent.parentEventId || (editingEvent.recurrencePattern && editingEvent.recurrencePattern !== 'none');
        
        if (isSeriesEvent && showUpdateSeriesConfirm && !updateSeries) {
          // Show series update confirmation dialog
          setShowUpdateSeriesConfirm(true);
          setSubmittingEvent(false);
          return;
        }
        
        const result = await apiService.updateEvent(clubId, editingEvent.eventId, eventData, updateSeries);
        
        if ('seriesUpdated' in result && result.seriesUpdated) {
          // Series was updated - refresh all events
          const eventsData = await apiService.listEvents(clubId);
          setEvents(eventsData);
        } else {
          // Single event updated
          setEvents(prev => prev.map(evt => evt.eventId === editingEvent.eventId ? (result as ClubEvent) : evt));
        }
        setEditingEvent(null);
        setShowUpdateSeriesConfirm(false);
      } else {
        const result = await apiService.createEvent(clubId, eventData);
        // Add all created events to the list
        setEvents(prev => [...result.events, ...prev]);
        setSelectedEventId(result.parentEventId);
      }
      
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewLocation('');
      setNewDateTime('');
      setNewTasks([]);
      setRecurrencePattern('none');
      setRecurrenceEndDate('');
      setShowCreateModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  // Dropdown Change Handler
  const handleClubChange = (newClubId: string) => {
    const selected = userClubs.find(c => c.clubId === newClubId);
    if (selected) {
      navigate(`/neighbourhoods/${selected.slug}/activities`);
    }
  };

  // Date Formatting Helpers
  const formatEventDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-500 font-semibold uppercase tracking-wider text-xs">Loading club events...</p>
        </div>
      </div>
    );
  }

  const isCreatorOrAdmin = club && (club.createdBy === user?.userId || club.userRole === 'admin');
  const noClubs = isAuthenticated && !clubsLoading && userClubs.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-500 selection:text-white">
      <SEO
        title={club ? `${club.name} Activities — Community` : "Neighbourhood Activities — Community"}
        description={club ? `View and participate in upcoming activities, volunteer tasks, and discussions for ${club.name}.` : "View and participate in neighbourhood activities, volunteer tasks, and discussions."}
      />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {slug && (
                <button
                  onClick={() => navigate(`/neighbourhoods/${slug}/explore`)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider mb-2 group"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5 transform group-hover:-translate-x-1 transition-transform" />
                  Back to Neighbourhood
                </button>
              )}
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">
                {club ? `${club.name} Activities` : 'Neighbourhood Activities'}
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                Plan activities, coordinate with neighbours, and bring local families together.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Neighbourhood Selector Dropdown */}
              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden sm:block">Neighbourhood</span>
                  {clubsLoading ? (
                    <div className="h-[38px] w-36 bg-gray-100 animate-pulse rounded-md" />
                  ) : userClubs.length > 1 ? (
                    <select
                      value={clubId || ''}
                      onChange={e => handleClubChange(e.target.value)}
                      className="h-[38px] border border-gray-300 rounded-md px-3 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {userClubs.map(c => (
                        <option key={c.clubId} value={c.clubId}>{c.name}</option>
                      ))}
                    </select>
                  ) : club ? (
                    <span className="inline-flex items-center h-[38px] px-3 rounded-md bg-indigo-50 border border-indigo-100 text-sm font-semibold text-indigo-700 whitespace-nowrap">
                      🏛️ {club.name}
                    </span>
                  ) : null}
                </div>
              )}

              {club && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Host an Activity
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {actionError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="text-sm font-semibold">{actionError}</p>
          </div>
        )}

        {reminderStatus && (
          <div className={`mb-6 rounded-lg border p-4 ${
            reminderStatus.success 
              ? 'border-emerald-250 bg-emerald-50 text-emerald-800' 
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            <p className="text-sm font-semibold">{reminderStatus.message}</p>
          </div>
        )}

        {noClubs ? (
          <div className="text-center py-24 bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-5xl mb-4">📅</p>
            <p className="font-bold text-gray-700 text-lg">You're not in any neighbourhoods yet</p>
            <p className="text-sm text-gray-400 mt-2">Join a neighbourhood to view or host activities</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">No activities scheduled yet</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto text-sm">
              Get things started! Click "Host an Activity" to create your neighbourhood's first gathering.
            </p>
          </div>
        ) : !selectedEventId ? (
          // Two-column layout: Activities List & Calendar Depiction
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Activities List */}
            <div className="lg:col-span-8 space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 flex items-center gap-1.5">
                Upcoming Activities ({events.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((evt) => {
                  const attendingCount = Object.values(evt.rsvps || {}).filter(r => r.status === 'going').length;
                  const volunteerCount = Object.values(evt.volunteers || {}).length;
                  return (
                    <div
                      key={evt.eventId}
                      onClick={() => {
                        setSelectedEventId(evt.eventId);
                        setActionError('');
                        setReminderStatus(null);
                      }}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-300 transition-all duration-205 cursor-pointer flex flex-col justify-between text-left group animate-fadeIn"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            <ClockIcon className="h-3 w-3" />
                            {formatEventTime(evt.dateTime)}
                          </span>
                          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            {attendingCount} going
                          </span>
                        </div>
                        
                        <h3 className="font-black text-gray-900 tracking-tight text-lg mt-3 uppercase italic line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {evt.title}
                        </h3>
                        
                        {evt.description ? (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                            {evt.description}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic mt-2">
                            No description provided.
                          </p>
                        )}
                      </div>
                      
                      <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                          <CalendarIcon className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                          <span>{formatEventDate(evt.dateTime)}</span>
                        </div>
                        
                        {evt.location && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <MapPinIcon className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                        
                        <div className="pt-2 flex items-center justify-between text-indigo-600 font-bold text-xs uppercase tracking-wider">
                          <span>{volunteerCount} task{volunteerCount !== 1 ? 's' : ''} claimed</span>
                          <span className="group-hover:translate-x-1 transition-transform inline-block">
                            View Details &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Calendar Depiction */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm text-left">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h3 className="font-black text-gray-900 tracking-tight text-sm uppercase italic flex items-center gap-2">
                    <CalendarIcon className="h-4.5 w-4.5 text-indigo-600" />
                    Event Calendar
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}
                      className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors text-xs font-bold"
                      title="Previous Month"
                    >
                      &larr;
                    </button>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-tight min-w-[75px] text-center">
                      {calDate.toLocaleString('default', { month: 'short' })} {calDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}
                      className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors text-xs font-bold"
                      title="Next Month"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>

                {/* Weekdays header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-[10px] font-black text-gray-450 uppercase tracking-wider py-1">
                      {d.slice(0, 1)}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {getDaysInMonth(calDate).map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="aspect-square" />;
                    }

                    const dayEvents = getEventsForDate(day);
                    const hasEvents = dayEvents.length > 0;
                    const today = new Date();
                    const isToday = day.getFullYear() === today.getFullYear() &&
                                    day.getMonth() === today.getMonth() &&
                                    day.getDate() === today.getDate();
                    const isSelected = selectedCalDate &&
                                       day.getFullYear() === selectedCalDate.getFullYear() &&
                                       day.getMonth() === selectedCalDate.getMonth() &&
                                       day.getDate() === selectedCalDate.getDate();

                    let cellStyle = "text-gray-700 hover:bg-gray-100 cursor-pointer";
                    if (hasEvents) {
                      cellStyle = "bg-indigo-50 border border-indigo-100 text-indigo-750 font-bold hover:bg-indigo-100 cursor-pointer";
                    }
                    if (isToday) {
                      cellStyle += " ring-2 ring-indigo-550 ring-offset-1";
                    }
                    if (isSelected) {
                      cellStyle += " ring-2 ring-indigo-500 bg-indigo-50/50";
                    }

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedCalDate(day);
                          if (hasEvents) {
                            if (dayEvents.length === 1) {
                              setSelectedEventId(dayEvents[0].eventId);
                              setActionError('');
                              setReminderStatus(null);
                            } else {
                              setPickerEvents(dayEvents);
                              setPickerDateLabel(day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }));
                            }
                          }
                        }}
                        className={`aspect-square flex flex-col items-center justify-center rounded-md text-xs font-semibold relative transition-all duration-150 ${cellStyle}`}
                        title={hasEvents ? dayEvents.map(e => e.title).join(', ') : undefined}
                      >
                        <span>{day.getDate()}</span>
                        {hasEvents && (
                          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Date Card */}
              {selectedCalDate && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm text-left animate-fadeIn">
                  <h3 className="font-black text-gray-900 tracking-tight text-sm uppercase italic flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                    <ClockIcon className="h-4.5 w-4.5 text-indigo-600" />
                    Selected Date
                  </h3>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedCalDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  
                  {getEventsForDate(selectedCalDate).length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Scheduled Gatherings:</p>
                      <div className="space-y-1.5">
                        {getEventsForDate(selectedCalDate).map(evt => (
                          <button
                            key={evt.eventId}
                            onClick={() => {
                              setSelectedEventId(evt.eventId);
                              setActionError('');
                              setReminderStatus(null);
                            }}
                            className="block w-full text-left text-xs font-bold text-indigo-650 hover:text-indigo-850 hover:underline truncate"
                          >
                            ⏰ {formatEventTime(evt.dateTime)} - {evt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {club && (
                    <button
                      type="button"
                      onClick={() => {
                        const year = selectedCalDate.getFullYear();
                        const month = String(selectedCalDate.getMonth() + 1).padStart(2, '0');
                        const day = String(selectedCalDate.getDate()).padStart(2, '0');
                        setNewDateTime(`${year}-${month}-${day}T19:00`);
                        setShowCreateModal(true);
                      }}
                      className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Host an Activity
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : selectedEvent ? (
          // Selected Gathering Details Page view
          <div className="space-y-4">
            {/* Back Button */}
            <div className="text-left">
              <button
                onClick={() => {
                  setSelectedEventId(null);
                  setActionError('');
                  setReminderStatus(null);
                }}
                className="inline-flex items-center gap-2 text-xs font-bold text-indigo-650 hover:text-indigo-800 uppercase tracking-wider mb-2 group"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5 transform group-hover:-translate-x-1 transition-transform" />
                Back to All Activities
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Event details card, RSVP card, Volunteer board */}
              <div className="lg:col-span-8 space-y-6">
                {/* Event Details Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden text-left">
                  {/* Header Details */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 pb-6 relative z-10">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">
                        {selectedEvent.title}
                      </h2>
                      {(selectedEvent.parentEventId || (selectedEvent.recurrencePattern && selectedEvent.recurrencePattern !== 'none')) && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                          <ArrowPathIcon className="h-3.5 w-3.5" />
                          {(() => {
                            const pattern = selectedEvent.parentEventId
                              ? events.find(e => e.eventId === selectedEvent.parentEventId)?.recurrencePattern
                              : selectedEvent.recurrencePattern;
                            const label: Record<string, string> = {
                              daily: 'Repeats Daily',
                              weekly: 'Repeats Weekly',
                              biweekly: 'Repeats Bi-Weekly',
                              monthly: 'Repeats Monthly',
                            };
                            return label[pattern || ''] || 'Part of a Series';
                          })()}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4 text-indigo-500" />
                          {formatEventDate(selectedEvent.dateTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4 text-indigo-500" />
                          {formatEventTime(selectedEvent.dateTime)}
                        </span>
                        {selectedEvent.location && (
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="h-4 w-4 text-indigo-500" />
                            {selectedEvent.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4 text-indigo-500" />
                          Organized by {selectedEvent.creatorName}
                        </span>
                      </div>
                    </div>
                    
                    {/* Admin actions: Edit & Delete & Reminder */}
                    <div className="self-start sm:self-auto flex flex-wrap items-center gap-2">
                      {isAuthenticated && (
                        <>
                          <a
                            href={buildGoogleCalendarUrl(selectedEvent)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-colors cursor-pointer"
                            title="Add to Google Calendar"
                          >
                            <CalendarIcon className="h-4 w-4 text-indigo-650" />
                            Google Calendar
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDownloadIcs(selectedEvent)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-colors cursor-pointer"
                            title="Download .ics file for Apple Calendar, Outlook, etc."
                          >
                            <CalendarIcon className="h-4 w-4 text-indigo-650" />
                            Download .ics
                          </button>
                        </>
                      )}
                      {isAuthenticated && (isOrganizer(selectedEvent, user?.userId) || isCreatorOrAdmin) && (
                        <button
                          onClick={handleSendReminder}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-colors cursor-pointer"
                        >
                          <BellIcon className="h-4 w-4 text-indigo-650" />
                          Broadcast Reminder
                        </button>
                      )}

                      {isAuthenticated && isOrganizer(selectedEvent, user?.userId) && (
                        <button
                          onClick={() => handleOpenEditModal(selectedEvent)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-750 text-xs font-bold uppercase tracking-wider border border-indigo-200 transition-colors cursor-pointer"
                        >
                          Edit Gathering
                        </button>
                      )}

                      {isAuthenticated && (selectedEvent.createdBy === user?.userId || isCreatorOrAdmin) && (
                        <button
                          onClick={() => handleDeleteEvent(selectedEvent.eventId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-50 hover:bg-red-105 text-red-750 text-xs font-bold uppercase tracking-wider border border-red-200 transition-colors cursor-pointer"
                        >
                          Delete Gathering
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedEvent.description && (
                    <div className="space-y-1.5 text-left">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        About the Gathering
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}

                  {/* RSVP Tally Card */}
                  <div className="p-5 rounded-lg bg-gray-50 border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-700">
                        Are you going to attend?
                      </h4>
                      <div className="flex gap-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <span>
                          Going: <strong className="text-indigo-600">{Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'going').length}</strong>
                        </span>
                        <span>
                          Interested: <strong className="text-purple-600">{Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'interested').length}</strong>
                        </span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    {isAuthenticated ? (
                      <div className="grid grid-cols-3 gap-3">
                        {(['going', 'interested', 'not_going'] as const).map((status) => {
                          const isUserStatus = selectedEvent.rsvps?.[user?.userId || '']?.status === status;
                          let btnStyle = "border-gray-200 bg-white hover:bg-gray-50 text-gray-600";
                          if (isUserStatus) {
                            if (status === 'going') btnStyle = "bg-indigo-600 border-transparent text-white shadow-sm";
                            if (status === 'interested') btnStyle = "bg-purple-600 border-transparent text-white shadow-sm";
                            if (status === 'not_going') btnStyle = "bg-gray-250 border-transparent text-gray-700";
                          }
                          const labels = {
                            going: 'Going',
                            interested: 'Interested',
                            not_going: 'Not Going'
                          };
                          return (
                            <button
                              key={status}
                              onClick={() => handleRsvp(status)}
                              className={`py-2 px-3 rounded text-xs font-bold uppercase tracking-wider border transition-all duration-150 active:scale-95 ${btnStyle}`}
                            >
                              {labels[status]}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        Please sign in to RSVP for this event.
                      </p>
                    )}
                  </div>

                  {/* Volunteer Board */}
                  {selectedEvent.volunteerTasks && selectedEvent.volunteerTasks.length > 0 && (
                    <div className="space-y-3 text-left">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Volunteers Needed
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedEvent.volunteerTasks.map((task) => {
                          const volunteerId = Object.keys(selectedEvent.volunteers || {}).find(
                            uid => selectedEvent.volunteers[uid].task === task
                          );
                          const volunteer = volunteerId ? selectedEvent.volunteers[volunteerId] : null;
                          const isMe = volunteerId === user?.userId;

                          return (
                            <div
                              key={task}
                              className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 transition-colors ${
                                volunteer
                                  ? isMe 
                                    ? 'bg-indigo-50 border-indigo-200' 
                                    : 'bg-gray-50 border-gray-150 opacity-75'
                                  : 'bg-white border-gray-200 shadow-sm'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm font-bold text-gray-900">{task}</p>
                                <p className="text-xs text-gray-500 font-medium">
                                  {volunteer 
                                    ? `Claimed by ${volunteer.name}` 
                                    : 'Help wanted'
                                  }
                                </p>
                              </div>
                              {isAuthenticated && (
                                volunteer ? (
                                  isMe ? (
                                    <button
                                      onClick={() => handleVolunteer(null)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold uppercase tracking-wider transition-colors border border-red-200"
                                    >
                                      Release
                                    </button>
                                  ) : (
                                    <CheckIcon className="h-4 w-4 text-emerald-600 font-bold" />
                                  )
                                ) : (
                                  <button
                                    onClick={() => handleVolunteer(task)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider transition-colors border border-indigo-200"
                                  >
                                    Claim
                                  </button>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Organizers Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 space-y-4 shadow-sm text-left">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-indigo-650" />
                    Gathering Organizers
                  </h3>
                  
                  {/* List of current organizers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Creator */}
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-650 flex items-center justify-center text-xs font-bold text-white uppercase">
                          {selectedEvent.creatorName.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-950">{selectedEvent.creatorName}</p>
                          <p className="text-[10px] font-bold text-indigo-650 uppercase tracking-wider">Creator & Primary</p>
                        </div>
                      </div>
                    </div>

                    {/* Nominated Organizers */}
                    {Object.entries(selectedEvent.organizers || {}).map(([uid, orgInfo]) => {
                      if (uid === selectedEvent.createdBy) return null; // Already rendered above
                      return (
                        <div key={uid} className="p-3 bg-gray-50 border border-gray-150 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gray-650 flex items-center justify-center text-xs font-bold text-white uppercase">
                              {orgInfo.name.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{orgInfo.name}</p>
                              <p className="text-[10px] font-medium text-gray-400">Nominated Organizer</p>
                            </div>
                          </div>
                          {isAuthenticated && isOrganizer(selectedEvent, user?.userId) && (
                            <button
                              onClick={() => handleRemoveOrganizer(uid)}
                              className="text-gray-400 hover:text-red-650 p-1 transition-colors rounded hover:bg-gray-100"
                              title="Remove Organizer"
                            >
                              <XMarkIcon className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Nominate form - only visible to organizers */}
                  {isAuthenticated && isOrganizer(selectedEvent, user?.userId) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Nominate Other Organizer
                      </h4>
                      {loadingMembers ? (
                        <p className="text-xs text-gray-500">Loading club members...</p>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            id="nominate-member-select"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                            defaultValue=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const parts = val.split('|');
                                handleNominateOrganizer(parts[0], parts[1]);
                                e.target.value = ""; // Reset
                              }
                            }}
                          >
                            <option value="" disabled>Select a club member to nominate...</option>
                            {clubMembers
                              .filter(member => {
                                // Filter out members who are already organizers
                                const isAlreadyOrg = member.userId === selectedEvent.createdBy || 
                                                     !!(selectedEvent.organizers && selectedEvent.organizers[member.userId]);
                                return !isAlreadyOrg && member.status === 'active';
                              })
                              .map(member => (
                                <option key={member.userId} value={`${member.userId}|${member.name || 'Anonymous'}`}>
                                  {member.name || 'Anonymous'} ({member.email})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RSVP Details Card - Only for Organizers */}
                {isAuthenticated && isOrganizer(selectedEvent, user?.userId) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 space-y-4 shadow-sm text-left">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                        <CheckIcon className="h-5 w-5 text-indigo-650" />
                        Attendee Details
                      </h3>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1">Visible only to Gathering Organizers</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {/* Going Column */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-650 border-b border-indigo-100 pb-1.5 flex items-center justify-between">
                          <span>Going</span>
                          <span className="bg-indigo-50 px-2 py-0.5 rounded-full text-indigo-700 font-black text-[10px]">
                            {Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'going').length}
                          </span>
                        </h4>
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'going').length === 0 ? (
                            <li className="text-xs text-gray-400 italic">No one yet</li>
                          ) : (
                            Object.entries(selectedEvent.rsvps || {})
                              .filter(([_, r]) => r.status === 'going')
                              .map(([uid, r]) => (
                                <li key={uid} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded">
                                  <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 uppercase">
                                    {r.name.slice(0, 2)}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-800 truncate">{r.name}</span>
                                </li>
                              ))
                          )}
                        </ul>
                      </div>

                      {/* Interested Column */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 border-b border-purple-100 pb-1.5 flex items-center justify-between">
                          <span>Interested</span>
                          <span className="bg-purple-50 px-2 py-0.5 rounded-full text-purple-700 font-black text-[10px]">
                            {Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'interested').length}
                          </span>
                        </h4>
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'interested').length === 0 ? (
                            <li className="text-xs text-gray-400 italic">No one yet</li>
                          ) : (
                            Object.entries(selectedEvent.rsvps || {})
                              .filter(([_, r]) => r.status === 'interested')
                              .map(([uid, r]) => (
                                <li key={uid} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded">
                                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700 uppercase">
                                    {r.name.slice(0, 2)}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-800 truncate">{r.name}</span>
                                </li>
                              ))
                          )}
                        </ul>
                      </div>

                      {/* Not Going Column */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1.5 flex items-center justify-between">
                          <span>Not Going</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-black text-[10px]">
                            {Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'not_going').length}
                          </span>
                        </h4>
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {Object.values(selectedEvent.rsvps || {}).filter(r => r.status === 'not_going').length === 0 ? (
                            <li className="text-xs text-gray-400 italic">No one yet</li>
                          ) : (
                            Object.entries(selectedEvent.rsvps || {})
                              .filter(([_, r]) => r.status === 'not_going')
                              .map(([uid, r]) => (
                                <li key={uid} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded">
                                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700 uppercase">
                                    {r.name.slice(0, 2)}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-750 truncate">{r.name}</span>
                                </li>
                              ))
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Chat Section */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 space-y-4 shadow-sm text-left">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-indigo-600" />
                    Event Chat Board
                  </h3>
                  
                  {/* Chat Log */}
                  <div className="h-80 overflow-y-auto pr-2 space-y-4 border-b border-gray-150 pb-4 custom-scrollbar">
                    {(!selectedEvent.discussions || selectedEvent.discussions.length === 0) ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        No messages yet. Say hello or post a question!
                      </div>
                    ) : (
                      selectedEvent.discussions.map((comment) => {
                        const isMyMsg = comment.userId === user?.userId;
                        return (
                          <div
                            key={comment.commentId}
                            className={`flex gap-3 max-w-[85%] ${
                              isMyMsg ? 'ml-auto flex-row-reverse' : ''
                            }`}
                          >
                            {/* Small Initials Avatar */}
                            <div className="h-8 w-8 rounded-full bg-indigo-650 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                              {comment.name.slice(0, 2)}
                            </div>
                            <div className="space-y-0.5">
                              <div className={`flex items-center gap-2 text-xs text-gray-400 ${isMyMsg ? 'justify-end' : ''}`}>
                                <span className="font-bold text-gray-655">{comment.name}</span>
                                <span>&bull;</span>
                                <span>{formatRelativeTime(comment.createdAt)}</span>
                              </div>
                              <div className={`p-3 rounded-lg text-sm ${
                                isMyMsg 
                                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm' 
                                  : 'bg-gray-105 text-gray-800 rounded-tl-none border border-gray-200'
                              }`}>
                                <p className="leading-normal">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* Chat Form */}
                  {isAuthenticated ? (
                    <form onSubmit={handlePostComment} className="flex gap-2">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Write a message to the group..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                      />
                      <button
                        type="submit"
                        disabled={sendingComment || !commentInput.trim()}
                        className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        {sendingComment ? (
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                        ) : (
                          <PaperAirplaneIcon className="h-4 w-4" />
                        )}
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider text-center">
                      Please sign in to write comments.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm font-semibold uppercase tracking-wider py-16">
            Event not found.
          </div>
        )}
      </div>

      {/* Schedule Event Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-lg w-full max-w-xl shadow-xl relative overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150">
              <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-600" />
                {editingEvent ? 'Edit Gathering' : 'Schedule Gathering'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-650 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={(e) => handleSubmitEvent(e, false)} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Event Title */}
              <div className="space-y-1.5">
                <label htmlFor="event-title" className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Title
                </label>
                <input
                  id="event-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. June Book Discussion: Dune"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label htmlFor="event-location" className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Location
                </label>
                <input
                  id="event-location"
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Fiction Lovers Hub, 123 Story Lane, or Zoom Link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                />
              </div>

              {/* Date & Time */}
              <div className="space-y-1.5">
                <label htmlFor="event-datetime" className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Date & Time
                </label>
                <input
                  id="event-datetime"
                  type="datetime-local"
                  required
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                />
              </div>

              {/* Recurrence (only for new events, not editing) */}
              {!editingEvent && (
                <div className="space-y-3 border border-indigo-100 rounded-lg p-4 bg-indigo-50/30">
                  <div className="space-y-1.5">
                    <label htmlFor="event-recurrence" className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Repeat (Optional)
                    </label>
                    <select
                      id="event-recurrence"
                      value={recurrencePattern}
                      onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                    >
                      <option value="none">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {recurrencePattern !== 'none' && (
                    <div className="space-y-1.5">
                      <label htmlFor="event-recurrence-end" className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Repeat Until (Max 26 weeks)
                      </label>
                      <input
                        id="event-recurrence-end"
                        type="date"
                        required
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={newDateTime ? newDateTime.split('T')[0] : undefined}
                        max={(() => {
                          if (!newDateTime) return undefined;
                          const maxDate = new Date(newDateTime);
                          maxDate.setDate(maxDate.getDate() + 26 * 7);
                          return maxDate.toISOString().split('T')[0];
                        })()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                      />
                      <p className="text-xs text-gray-500">
                        Events will be created up to this date (maximum 26 weeks from start).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Editing a series event - show indicator */}
              {editingEvent && (editingEvent.parentEventId || (editingEvent.recurrencePattern && editingEvent.recurrencePattern !== 'none')) && (
                <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    This is part of a recurring series
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {showUpdateSeriesConfirm 
                      ? "Choose whether to update this event only, or this and all future events in the series."
                      : "Click Save to see options for updating this series."}
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="event-description" className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Description
                </label>
                <textarea
                  id="event-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add details, link to video call, or directions to the meet spot..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white resize-none"
                />
              </div>

              {/* Volunteer Tasks */}
              <div className="space-y-3">
                <label htmlFor="event-task-input" className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Volunteer Tasks
                </label>
                <div className="flex gap-2">
                  <input
                    id="event-task-input"
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="e.g. Bring chocolate cookies, Setup chairs"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* List of Tasks tags */}
                {newTasks.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {newTasks.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          className="hover:text-red-500 transition-colors p-0.5"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider transition-colors text-center"
                >
                  Cancel
                </button>
                
                {/* Series Update Options */}
                {showUpdateSeriesConfirm && editingEvent ? (
                  <div className="flex gap-2 flex-1">
                    <button
                      type="button"
                      onClick={(e) => handleSubmitEvent(e, false)}
                      disabled={submittingEvent}
                      className="flex-1 py-2 rounded-md border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider transition-colors text-center"
                    >
                      This Event Only
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSubmitEvent(e, true)}
                      disabled={submittingEvent}
                      className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 text-center"
                    >
                      All Future Events
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={submittingEvent}
                    className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 text-center"
                  >
                    {submittingEvent ? 'Saving...' : (editingEvent ? 'Save Changes' : 'Schedule Gathering')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Series Confirmation Modal */}
      {showDeleteSeriesConfirm && pendingDeleteEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md shadow-xl relative overflow-hidden text-left p-6">
            <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase italic mb-2">
              Delete Recurring Event
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This event is part of a recurring series. Would you like to delete only this occurrence, or all future events in the series?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteSeriesConfirm(false)}
                className="flex-1 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEvent(pendingDeleteEventId, false)}
                className="flex-1 py-2 rounded-md border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                This Event Only
              </button>
              <button
                onClick={() => handleDeleteEvent(pendingDeleteEventId, true)}
                className="flex-1 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Picker Modal (when multiple events on the same day) */}
      {pickerEvents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md shadow-xl relative overflow-hidden text-left flex flex-col max-h-[80vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150">
              <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-600" />
                Select Gathering
              </h3>
              <button
                onClick={() => setPickerEvents([])}
                className="text-gray-400 hover:text-gray-650 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Multiple gatherings scheduled for {pickerDateLabel}:
              </p>
              
              <div className="space-y-3">
                {pickerEvents.map((evt) => {
                  const timeStr = new Date(evt.dateTime).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit'
                  });
                  return (
                    <button
                      key={evt.eventId}
                      onClick={() => {
                        setSelectedEventId(evt.eventId);
                        setPickerEvents([]);
                        setActionError('');
                        setReminderStatus(null);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-150 group flex flex-col gap-1"
                    >
                      <span className="font-bold text-gray-900 group-hover:text-indigo-950 transition-colors leading-tight">
                        {evt.title}
                      </span>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5 text-indigo-500" />
                          {timeStr}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPinIcon className="h-3.5 w-3.5 text-indigo-500" />
                            {evt.location}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                type="button"
                onClick={() => setPickerEvents([])}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 hover:text-gray-950 transition-all shadow-sm"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ClubEvents;
