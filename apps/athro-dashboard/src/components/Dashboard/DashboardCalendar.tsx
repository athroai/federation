import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addWeeks, subWeeks } from 'date-fns';
import { Box, Typography, Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Athro } from '@athro/shared-types';
import CalendarEvent from './CalendarEvent';
import SessionModal from './SessionModal';
import { enUS } from 'date-fns/locale';
import { athroSelectionService } from '@athro/shared-services';
import { userPreferencesService } from '../../services/userPreferencesService';
import { useAuth } from '../../contexts/AuthContext';
import { demoDataService } from '../../services/DemoDataService';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '../../styles/calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS }
});

const DragAndDropCalendar = withDragAndDrop<CalendarEventData>(Calendar);

const SESSION_LENGTHS = [20, 40, 60, 80, 100, 120];

interface DashboardCalendarProps {
  athros: Athro[];
  confidence: Record<string, number>;
  priorities: Set<string>;
  studentAvailability?: Record<string, string[]>;
  expandedCard: string | null;
  setExpandedCard: (cardId: string, reason?: string) => void;
  workspaceCardRef: React.RefObject<HTMLDivElement | null>;
  handleCardClick: (cardId: string, reason?: string) => void;
}

interface SessionForm {
  id?: string;
  length: number;
  athroId: string;
  subject: string;
  start: Date;
  end: Date;
  title: string;
  weekType?: 'this' | 'next';
}

interface CalendarEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  athroId: string;
  subject: string;
  length: number;
  athro?: string;
  confidenceLevel?: number;
  isPriority?: boolean;
  day?: string;
  time?: string;
  weekType?: 'this' | 'next';
}

interface EventDropArgs {
  event: CalendarEventData;
  start: Date;
  end: Date;
  isAllDay: boolean;
}

interface EventResizeArgs {
  event: CalendarEventData;
  start: Date;
  end: Date;
  isAllDay: boolean;
}

const DashboardCalendar: React.FC<DashboardCalendarProps> = ({
  athros,
  confidence,
  priorities: initialPriorities,
  studentAvailability,
  expandedCard,
  setExpandedCard,
  workspaceCardRef,
  handleCardClick
}) => {
  const { user } = useAuth();
  
  // Browser detection for debugging
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    return 'Unknown';
  };
  
  const browserName = getBrowserInfo();
  
  // Log browser info on mount
  useEffect(() => {
    console.log('📊 Calendar component loaded in:', browserName);
    console.log('🔧 Enhanced dual persistence enabled for cross-browser compatibility');
  }, []);
  
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fullDayMode, setFullDayMode] = useState(false);
  const [weekType, setWeekType] = useState<'this' | 'next'>('this');
  const [priorities, setPriorities] = useState<Set<string>>(initialPriorities);
  const [pendingLaunchSession, setPendingLaunchSession] = useState<SessionForm | null>(null);
  const [hasLoadedInitialEvents, setHasLoadedInitialEvents] = useState(false);

  // Enhanced cross-browser calendar events loading with dual persistence
  const loadCalendarEvents = async () => {
    console.log('🔄 Loading calendar events...');
    
    // Check if demo mode is enabled
    if (demoDataService.isDemoModeEnabled()) {
      console.log('🎭 Loading demo calendar events for Alex Thompson...');
      
      const demoEvents = demoDataService.getDemoCalendarEvents();
      const formattedEvents: CalendarEventData[] = demoEvents.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        athroId: `athro-${event.subject.toLowerCase().replace(/\s+/g, '-')}`,
        subject: event.subject,
        length: Math.floor((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60)),
        athro: event.subject,
        confidenceLevel: Math.floor(Math.random() * 4) + 6, // 6-9 range for demo
        isPriority: Math.random() > 0.7,
        weekType: new Date(event.start_time) > new Date() ? 'next' : 'this'
      }));
      
      console.log('🎭 Demo calendar events loaded:', formattedEvents.length);
      setEvents(formattedEvents);
      setHasLoadedInitialEvents(true);
      return;
    }
    
    // Real user calendar loading
    if (!user) return;
    
    console.log('🔄 Loading calendar events for user:', user.id);
    userPreferencesService.setUser(user);
    
    // Helper function to get localStorage key for this user
    const getLocalStorageKey = () => `calendar_events_${user.id}`;
    const getBackupKey = () => `calendar_events_backup_${user.id}`;
    
    let rawEvents: any[] = [];
    let dataSource = 'none';
    
    // Try Supabase first (works in Firefox, may fail in Chrome)
    try {
      console.log('📡 Attempting to load from Supabase...');
      const supabaseEvents = await userPreferencesService.getCalendarEvents();
      
      if (supabaseEvents && Array.isArray(supabaseEvents) && supabaseEvents.length > 0) {
        console.log('✅ Loaded from Supabase:', supabaseEvents.length, 'events');
        rawEvents = supabaseEvents;
        dataSource = 'supabase';
        
        // Sync to localStorage for Chrome compatibility
        try {
          localStorage.setItem(getLocalStorageKey(), JSON.stringify({
            events: supabaseEvents,
            timestamp: Date.now(),
            userId: user.id,
            source: 'supabase'
          }));
          console.log('🔄 Synced Supabase data to localStorage backup');
        } catch (e) {
          console.warn('Could not sync to localStorage:', e);
        }
      }
    } catch (supabaseError: any) {
      console.warn('⚠️ Supabase failed (common in Chrome):', supabaseError?.message || supabaseError);
    }
    
    // If Supabase failed or returned no data, try localStorage
    if (rawEvents.length === 0) {
      try {
        console.log('💾 Attempting to load from localStorage...');
        const localData = localStorage.getItem(getLocalStorageKey());
        
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed.events && Array.isArray(parsed.events) && parsed.userId === user.id) {
            console.log('✅ Loaded from localStorage:', parsed.events.length, 'events');
            rawEvents = parsed.events;
            dataSource = 'localStorage';
          }
        }
      } catch (localError) {
        console.warn('⚠️ Primary localStorage failed:', localError);
        
        // Try backup localStorage
        try {
          console.log('💾 Attempting to load from backup localStorage...');
          const backupData = localStorage.getItem(getBackupKey());
          
          if (backupData) {
            const parsed = JSON.parse(backupData);
            if (parsed.events && Array.isArray(parsed.events) && parsed.userId === user.id) {
              console.log('✅ Loaded from backup localStorage:', parsed.events.length, 'events');
              rawEvents = parsed.events;
              dataSource = 'localStorage-backup';
            }
          }
        } catch (backupError) {
          console.warn('⚠️ Backup localStorage also failed:', backupError);
        }
      }
    }
    
    // Process and validate the loaded events
    if (!rawEvents || !Array.isArray(rawEvents) || rawEvents.length === 0) {
      console.log('📭 No calendar events found, starting with empty array');
      setEvents([]);
      setHasLoadedInitialEvents(true);
      return;
    }
    
    // Convert string dates back to Date objects and validate the data
    const convertedEvents = rawEvents
      .filter((event: any) => {
        // Filter out invalid events
        if (!event || !event.start || !event.end) {
          console.warn('Skipping invalid event:', event);
          return false;
        }
        return true;
      })
      .map((event: any) => {
        try {
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);
          
          // Validate that the dates are valid
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn('Skipping event with invalid dates:', event);
            return null;
          }
          
          // Ensure weekType is set for legacy events
          const weekType = event.weekType || 'this';
          
          return {
            ...event,
            start: startDate,
            end: endDate,
            weekType: weekType
          };
        } catch (error) {
          console.error('Error converting event dates:', error, event);
          return null;
        }
      })
      .filter(Boolean); // Remove null entries
    
    console.log(`📅 Successfully loaded ${convertedEvents.length} events from ${dataSource}`);
    console.log('📅 Setting events in state, will filter by weekType:', weekType);
    setEvents(convertedEvents);
    setHasLoadedInitialEvents(true);
  };

  // Load user preferences
  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      console.log('Loading user preferences for user:', user.id);
      const [savedWeekType, savedFullDayMode] = await Promise.all([
        userPreferencesService.getWeekType(),
        userPreferencesService.getIsFullDay()
      ]);
      
      console.log('📅 Loading user preferences:', { savedWeekType, savedFullDayMode });
      setWeekType(savedWeekType as 'this' | 'next');
      setFullDayMode(savedFullDayMode);
      console.log('📅 User preferences loaded successfully');
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      console.log('User authenticated, loading calendar data for:', user.id);
      // Load preferences first to ensure weekType is set correctly
      loadUserPreferences().then(() => {
        // Then load calendar events with the correct weekType
        loadCalendarEvents();
      });
    } else {
      console.log('User logged out, clearing calendar data');
      // Clear events when user logs out
      setEvents([]);
      setWeekType('this');
      setFullDayMode(false);
      setHasLoadedInitialEvents(false);
    }
  }, [user]);

  // Enhanced save events with dual persistence (Supabase + localStorage)
  useEffect(() => {
    if (!user) return;
    
    const saveEvents = async () => {
      console.log('🔄 Saving calendar events for user:', user.id, 'Events count:', events.length);
      
      // Convert events to a format that can be safely serialized
      const eventsToSave = events.map(event => ({
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        // Ensure weekType is preserved
        weekType: event.weekType || 'this'
      }));
      
      // Helper functions for localStorage keys
      const getLocalStorageKey = () => `calendar_events_${user.id}`;
      const getBackupKey = () => `calendar_events_backup_${user.id}`;
      
      let supabaseSuccess = false;
      let localStorageSuccess = false;
      
      // ALWAYS save to localStorage first (immediate, reliable across all browsers)
      try {
        const localStorageData = {
          events: eventsToSave,
          timestamp: Date.now(),
          userId: user.id,
          source: 'user-action'
        };
        
        // Save to primary localStorage
        localStorage.setItem(getLocalStorageKey(), JSON.stringify(localStorageData));
        
        // Save to backup localStorage with different key
        localStorage.setItem(getBackupKey(), JSON.stringify(localStorageData));
        
        localStorageSuccess = true;
        console.log('✅ Saved to localStorage (primary + backup)');
      } catch (localError) {
        console.error('❌ Failed to save to localStorage:', localError);
      }
      
      // THEN try to save to Supabase (may fail in Chrome, but works in Firefox)
      try {
        await userPreferencesService.setCalendarEvents(eventsToSave);
        supabaseSuccess = true;
        console.log('✅ Saved to Supabase');
      } catch (supabaseError: any) {
        console.warn('⚠️ Supabase save failed (using localStorage fallback):', supabaseError?.message || supabaseError);
      }
      
      // Report save status
      if (supabaseSuccess && localStorageSuccess) {
        console.log('🎉 Calendar events saved to both Supabase and localStorage');
      } else if (localStorageSuccess) {
        console.log('💾 Calendar events saved to localStorage only (Chrome-compatible mode)');
      } else {
        console.error('❌ Failed to save calendar events to any storage method');
      }
    };
    
    // CRITICAL FIX: Always save events (including empty arrays) to ensure deletions persist
    // Skip only on the very first load to prevent overwriting loaded data
    if (hasLoadedInitialEvents) {
      console.log('📅 Saving calendar events after user interaction');
      saveEvents();
    } else {
      console.log('📅 Skipping save on initial load');
    }
  }, [events, user, hasLoadedInitialEvents]);

  // Save week type and full day mode preferences
  useEffect(() => {
    if (!user) return;
    
    const savePreferences = async () => {
      try {
        await Promise.all([
          userPreferencesService.setWeekType(weekType),
          userPreferencesService.setIsFullDay(fullDayMode)
        ]);
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    };
    
    savePreferences();
  }, [weekType, fullDayMode, user]);

  // Calculate the current date based on weekType
  const currentDate = useMemo(() => {
    const now = new Date();
    if (weekType === 'next') {
      return addWeeks(now, 1);
    }
    return now;
  }, [weekType]);

  // Update priorities when initialPriorities changes
  useEffect(() => {
    setPriorities(initialPriorities);
  }, [initialPriorities]);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const day = format(start, 'EEEE');
    const time = format(start, 'HH:mm');
    
    // The calendar is already showing the correct week based on currentDate
    // so we don't need to adjust the dates anymore
    setSelectedEvent({
      id: '',
      title: '',
      start: new Date(start),
      end: new Date(end),
      athroId: '',
      subject: '',
      length: 20,
      day,
      time,
      weekType
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  }, [weekType]);

  const handleSelectEvent = useCallback((event: CalendarEventData) => {
    setSelectedEvent(event);
    setIsEditMode(true);
    setIsModalOpen(true);
  }, []);

  const handleSaveSession = useCallback((session: SessionForm) => {
    const selectedAthro = athros.find(a => a.id === session.athroId);
    if (!selectedAthro) return;

    // Ensure we have valid start and end dates
    const start = new Date(session.start);
    const end = new Date(session.end);

    // The calendar is already showing the correct week, so use the dates as-is
    const calendarEvent: CalendarEventData = {
      ...session,
      id: session.id || Date.now().toString(),
      start: start,
      end: end,
      title: `${selectedAthro.subject} with ${selectedAthro.name}`,
      athro: selectedAthro.name,
      confidenceLevel: confidence[session.athroId],
      isPriority: priorities.has(session.athroId),
      day: format(start, 'EEEE'),
      time: format(start, 'HH:mm'),
      weekType: session.weekType
    };

    if (isEditMode && selectedEvent) {
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? calendarEvent : e));
    } else {
      setEvents(prev => [...prev, calendarEvent]);
    }
    setIsModalOpen(false);
  }, [isEditMode, selectedEvent, athros, confidence, priorities]);

  const handleDeleteSession = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setIsModalOpen(false);
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEventData) => {
    const athro = athros.find(a => a.id === event.athroId);
    const isPriority = athro ? priorities.has(athro.id) : false;
    const confidenceLevel = athro ? confidence[athro.id] : undefined;

    let backgroundColor = 'rgba(228, 201, 126, 0.15)';
    let borderColor = 'rgba(228, 201, 126, 0.3)';

    if (isPriority) {
      backgroundColor = 'rgba(79, 195, 138, 0.15)';
      borderColor = 'rgba(79, 195, 138, 0.3)';
    }

    if (confidenceLevel !== undefined) {
      if (confidenceLevel >= 8) {
        backgroundColor = 'rgba(79, 195, 138, 0.15)';
        borderColor = 'rgba(79, 195, 138, 0.3)';
      } else if (confidenceLevel >= 4) {
        backgroundColor = 'rgba(228, 201, 126, 0.15)';
        borderColor = 'rgba(228, 201, 126, 0.3)';
      } else {
        backgroundColor = 'rgba(232, 90, 106, 0.15)';
        borderColor = 'rgba(232, 90, 106, 0.3)';
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '0.375rem',
        opacity: 1,
        color: '#e4c97e',
        border: '1px solid',
        display: 'block'
      }
    };
  }, [athros, confidence, priorities]);

  const convertToSessionForm = (event: CalendarEventData): SessionForm => ({
    id: event.id,
    length: event.length,
    athroId: event.athroId,
    subject: event.subject,
    start: event.start,
    end: event.end,
    title: event.title,
    weekType: event.weekType
  });

  const filteredEvents = useMemo(() => {
    console.log(`🔍 [${browserName}] Filtering events:`, { 
      totalEvents: events.length, 
      currentWeekType: weekType,
      hasLoadedInitialEvents,
      browser: browserName 
    });
    
    // Show all events during initial load or if weekType is undefined
    if (!hasLoadedInitialEvents || !weekType) {
      console.log(`📅 [${browserName}] Showing all events (initial load or no weekType)`);
      return events;
    }
    
    const filtered = events.filter(event => {
      // Show events that match current weekType, or events without weekType (legacy events)
      const shouldShow = event.weekType === weekType || !event.weekType;
      console.log(`📅 [${browserName}] Event "${event.title}" (weekType: ${event.weekType}) - ${shouldShow ? 'SHOWING' : 'HIDING'}`);
      return shouldShow;
    });
    
    console.log(`📅 [${browserName}] Filtered events result:`, { 
      showing: filtered.length, 
      total: events.length,
      browser: browserName,
      weekType 
    });
    return filtered;
  }, [events, weekType, hasLoadedInitialEvents, browserName]);

  const handleEventDrop = useCallback(({ event, start, end }: { event: CalendarEventData; start: Date | string; end: Date | string }) => {
    const day = format(new Date(start), 'EEEE');
    const time = format(new Date(start), 'HH:mm');
    
    // Convert to Date objects if they're strings
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Keep the same week type as the current view
    const updatedEvent: CalendarEventData = {
      ...event,
      start: startDate,
      end: endDate,
      day,
      time,
      weekType: weekType // Use the current week type from the view
    };

    setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e));
  }, [weekType]);

  const handleEventResize = useCallback(({ event, start, end }: { event: CalendarEventData; start: Date | string; end: Date | string }) => {
    const updatedEvent: CalendarEventData = {
      ...event,
      start: new Date(start),
      end: new Date(end),
      length: Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60)) // Convert to minutes
    };

    setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e));
  }, []);

  const handleTogglePriority = useCallback((athroId: string) => {
    setPriorities(prev => {
      const newPriorities = new Set(prev);
      if (newPriorities.has(athroId)) {
        newPriorities.delete(athroId);
      } else {
        newPriorities.add(athroId);
      }
      return newPriorities;
    });
  }, []);

  // ENHANCED LAUNCH HANDLER - FORCES WORKSPACE TO TOP WITH SESSION DATA
  const handleLaunchNow = (session: SessionForm) => {
    console.log('🚀 [CALENDAR LAUNCH] handleLaunchNow called with session:', session);
    setIsModalOpen(false);
    
    // Calculate session duration in minutes
    const duration = Math.round((session.end.getTime() - session.start.getTime()) / (1000 * 60));
    
    const sessionData = {
      athroId: session.athroId,
      duration: duration,
      // FORCE OVERRIDE FLAGS
      forceOverride: true,
      startTimer: true,
      clearExistingSession: true,
      timestamp: Date.now()
    };
    
    console.log('📅 [CALENDAR LAUNCH] FORCE OVERRIDING workspace with session:', sessionData);
    console.log('📅 [CALENDAR LAUNCH] Current expandedCard:', expandedCard);
    console.log('📅 [CALENDAR LAUNCH] setExpandedCard function type:', typeof setExpandedCard);
    
    // STEP 1: Clear any existing session data
    localStorage.removeItem('sessionData');
    localStorage.removeItem('currentStudySession');
    console.log('📅 [CALENDAR LAUNCH] ✅ Cleared existing session data');
    
    // STEP 2: Store NEW session data for workspace
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
    console.log('📅 [CALENDAR LAUNCH] ✅ Stored new session data:', localStorage.getItem('sessionData'));
    
    // STEP 3: Check if workspace is embedded
    const isEmbeddedWorkspace = (window as any).__ATHRO_EMBEDDED_MODE__;
    console.log('📅 [CALENDAR LAUNCH] Embedded workspace mode:', isEmbeddedWorkspace);
    
    // STEP 4: Dispatch FORCE OVERRIDE event to workspace
    console.log('📅 [CALENDAR LAUNCH] Dispatching forceSessionOverride event...');
    window.dispatchEvent(new CustomEvent('forceSessionOverride', {
      detail: sessionData
    }));
    console.log('📅 [CALENDAR LAUNCH] ✅ forceSessionOverride event dispatched');
    
    // STEP 5: Also dispatch standard launch event for compatibility
    console.log('📅 [CALENDAR LAUNCH] Dispatching launchSession event...');
    window.dispatchEvent(new CustomEvent('launchSession', {
      detail: sessionData
    }));
    console.log('📅 [CALENDAR LAUNCH] ✅ launchSession event dispatched');
    
    // STEP 6: DECISIVE NAVIGATION - Force workspace to top with UNIVERSAL NAVIGATION
    console.log('📅 [CALENDAR LAUNCH] FORCING workspace card to top of viewport using universal navigation');
    console.log('📅 [CALENDAR LAUNCH] About to call handleCardClick with workspace...');
    
    try {
      // Use the universal navigation system which expands AND scrolls to top
      handleCardClick('workspace', 'FORCE calendar session launch');
      console.log('📅 [CALENDAR LAUNCH] ✅ Universal navigation called successfully');
    } catch (error) {
      console.error('📅 [CALENDAR LAUNCH] ❌ Error calling universal navigation:', error);
    }
    
    // STEP 7: Give feedback to user and wait for confirmation
    console.log(`🚀 [CALENDAR LAUNCH] Session launched - ${session.athroId} for ${duration} minutes`);
    
    // STEP 8: Listen for confirmation that workspace received the override
    let confirmationTimeout: NodeJS.Timeout;
    const handleOverrideComplete = (e: CustomEvent) => {
      console.log('📅 [CALENDAR LAUNCH] ✅ Received override completion confirmation:', e.detail);
      clearTimeout(confirmationTimeout);
      window.removeEventListener('sessionOverrideComplete', handleOverrideComplete as EventListener);
    };
    
    window.addEventListener('sessionOverrideComplete', handleOverrideComplete as EventListener);
    
    // Set timeout to detect if workspace doesn't respond
    confirmationTimeout = setTimeout(() => {
      console.error('📅 [CALENDAR LAUNCH] ❌ TIMEOUT: Workspace did not confirm override within 3 seconds');
      console.error('📅 [CALENDAR LAUNCH] ❌ This indicates the workspace is not receiving events properly');
      window.removeEventListener('sessionOverrideComplete', handleOverrideComplete as EventListener);
    }, 3000);
    
    // STEP 9: Manual debug check
    setTimeout(() => {
      const storedData = localStorage.getItem('sessionData');
      console.log('📅 [CALENDAR LAUNCH] Debug check - session data still in localStorage:', storedData);
      
      // Check if workspace card is expanded
      console.log('📅 [CALENDAR LAUNCH] Debug check - expandedCard after navigation:', expandedCard);
    }, 1000);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2 
      }}>
        <Typography variant="h5" color="primary.main">
          Study Schedule
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={weekType}
            exclusive
            onChange={(_, value) => value && setWeekType(value)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#e4c97e',
                borderColor: '#e4c97e',
                '&.Mui-selected': {
                  backgroundColor: '#e4c97e',
                  color: '#1c2a1e',
                  '&:hover': {
                    backgroundColor: '#e4c97e',
                  }
                },
                '&:hover': {
                  backgroundColor: 'rgba(228, 201, 126, 0.1)',
                }
              }
            }}
          >
            <ToggleButton value="this">This Week</ToggleButton>
            <ToggleButton value="next">Next Week</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={fullDayMode ? 'full' : 'after'}
            exclusive
            onChange={(_, value) => {
              if (value) {
                setFullDayMode(value === 'full');
              }
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#e4c97e',
                borderColor: '#e4c97e',
                '&.Mui-selected': {
                  backgroundColor: '#e4c97e',
                  color: '#1c2a1e',
                  '&:hover': {
                    backgroundColor: '#e4c97e',
                  }
                },
                '&:hover': {
                  backgroundColor: 'rgba(228, 201, 126, 0.1)',
                }
              }
            }}
          >
            <ToggleButton value="after">After School</ToggleButton>
            <ToggleButton value="full">Full Day</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      <div className="calendar-container">
        <DragAndDropCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor={(event: CalendarEventData) => event.start}
          endAccessor={(event: CalendarEventData) => event.end}
          style={{ height: 800 }}
          date={currentDate}
          onNavigate={(newDate: Date) => {
            // Update the current date when user navigates
            const now = new Date();
            if (newDate.getTime() >= addWeeks(now, 1).getTime()) {
              setWeekType('next');
            } else {
              setWeekType('this');
            }
          }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          selectable
          resizable
          draggableAccessor={() => true}
          eventPropGetter={eventStyleGetter}
          components={{
            event: (props: any) => <CalendarEvent {...props} />,
            toolbar: () => null // Remove the default toolbar with TODAY/BACK/NEXT buttons
          }}
          min={fullDayMode ? new Date(0, 0, 0, 8, 0, 0) : new Date(0, 0, 0, 16, 0, 0)}
          max={fullDayMode ? new Date(0, 0, 0, 22, 0, 0) : new Date(0, 0, 0, 22, 0, 0)}
          step={fullDayMode ? 60 : 20}
          timeslots={fullDayMode ? 1 : 3}
          views={['week']}
          defaultView="week"
        />
      </div>
      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
        session={selectedEvent ? convertToSessionForm(selectedEvent) : undefined}
        edit={isEditMode}
        athros={athros}
        subjectConf={confidence}
        priorities={priorities}
        onTogglePriority={handleTogglePriority}
        onLaunchNow={handleLaunchNow}
      />
    </Box>
  );
};

export default DashboardCalendar; 