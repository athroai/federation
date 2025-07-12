import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatInterface from '../components/ChatInterface';
import AthroCarousel from '../components/AthroCarousel';
import federatedEventBus, { EVENTS } from '../utils/federatedEventBus';
import { Athro, ConfidenceLevel } from '../types/athro';
import AthroSelectionService from '../services/AthroSelectionService';
import SupabaseStudyService from '../services/SupabaseStudyService';
import StudyHistoryModal from '../components/StudyHistory/StudyHistoryModal';
import SaveSessionModal from '../components/SaveSessionModal';
import SessionRenameModal from '../components/SessionRenameModal';
import { ChatMessage } from '../services/openai';
import ChatSessionService, { ChatSession } from '../services/ChatSessionService';
import './WorkPage.css';
import '../styles/chat.css';
import { useTimer } from '../contexts/TimerContext';
import { ATHRO_PERSONALITIES } from '../data/athroPersonalities';
import NavBar from '../components/NavBar/NavBar';
import { Box, Alert, Snackbar, Fade } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
// Temporary: Using a simple modal instead of the shared WorkspaceLockoutModal
// import WorkspaceLockoutModal from '@athro/shared-ui/src/components/WorkspaceLockoutModal';

// No need for special image path handling, just use direct paths to the images

// Complete list of all possible Athros - copied from CalendarPage.tsx
const ATHROS: Athro[] = [
  { id: 'athro-maths', name: 'AthroMaths', subject: 'Mathematics', description: 'Your guide to mastering mathematical concepts and problem-solving.', image: '/athros/athro-maths.jpg', isPriority: false },
  { id: 'athro-science', name: 'AthroScience', subject: 'Science', description: 'Helps you explore and understand scientific principles and discoveries.', image: '/athros/athro-science.jpg', isPriority: false },
  { id: 'athro-english', name: 'AthroEnglish', subject: 'English', description: 'Assists with language skills, literature analysis, and writing techniques.', image: '/athros/athro-english.jpg', isPriority: false },
  { id: 'athro-history', name: 'AthroHistory', subject: 'History', description: 'Your guide through historical events, figures, and their significance.', image: '/athros/athro-history.jpg', isPriority: false },
  { id: 'athro-geography', name: 'AthroGeography', subject: 'Geography', description: 'Expert in physical and human geography topics around the world.', image: '/athros/athro-geography.jpg', isPriority: false },
  { id: 'athro-drama', name: 'AthroDrama', subject: 'Drama', description: 'Helps with performance techniques, play analysis, and theatrical concepts.', image: '/athros/athro-drama.jpg', isPriority: false },
  { id: 'athro-music', name: 'AthroMusic', subject: 'Music', description: 'Your companion for music theory, history, and appreciation.', image: '/athros/athro-music.jpg', isPriority: false },
  { id: 'athro-rs', name: 'AthroRS', subject: 'Religious Studies', description: 'Guides you through world religions, philosophies, and ethical concepts.', image: '/athros/athro-rs.jpg', isPriority: false },
  { id: 'athro-dt', name: 'AthroDT', subject: 'Design & Technology', description: 'Assists with design principles, technological processes, and innovation.', image: '/athros/athro-designtech.jpg', isPriority: false },
  { id: 'athro-media', name: 'AthroMedia', subject: 'Media Studies', description: 'Expert in media analysis, production techniques, and communication.', image: '/athros/athro-media.jpg', isPriority: false },
  { id: 'athro-business', name: 'AthroBusiness', subject: 'Business Studies', description: 'Helps with business concepts, economics, and organizational principles.', image: '/athros/athro-business.jpg', isPriority: false },
  { id: 'athro-languages', name: 'AthroLanguages', subject: 'Modern Languages', description: 'Your guide to learning foreign languages and understanding cultures.', image: '/athros/athro-languages.jpg', isPriority: false },
  { id: 'athro-welsh', name: 'AthroCymraeg', subject: 'Welsh', description: 'Expert in Welsh language and culture.', image: '/athros/athro-welsh.jpg', isPriority: false },
  { id: 'athro-social', name: 'AthroSocial', subject: 'Social Sciences', description: 'Helps with sociology, psychology, and other social sciences.', image: '/athros/athro-social.jpg', isPriority: false },
  { id: 'athro-nature', name: 'AthroNature', subject: 'Nature & Agriculture', description: 'Your guide to understanding nature, agriculture, and environmental studies.', image: '/athros/athro-nature.jpg', isPriority: false }
];

// Helper function to normalize Athro IDs
const normalizeAthroId = (id: string): string => {
  // Remove any existing athro- prefix and convert to lowercase
  const baseId = id.toLowerCase().replace(/^athro-?/, '');
  // Convert camelCase to kebab-case
  const kebabId = baseId.replace(/([a-z])([A-Z])/g, '$1-$2');
  // Add athro- prefix
  return `athro-${kebabId}`;
};

interface WorkPageProps {
  selectedAthros?: Athro[];
  confidenceLevels?: Record<string, ConfidenceLevel | number>;
  prioritySubjects?: Set<string>;
}

const WorkPage: React.FC<WorkPageProps> = ({ selectedAthros, confidenceLevels, prioritySubjects }) => {
  // Check if we're running in embedded mode (inside dashboard)
  const isEmbedded = window.location.port === '5210' || window.parent !== window;
  
  const [athros, setAthros] = useState<Athro[]>([]);
  const [selectedAthro, setSelectedAthro] = useState<Athro | undefined>();
  const { timeLeft, handleTimeChange, handleStart, handleComplete } = useTimer();
  const [chatKey, setChatKey] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessionAction, setSessionAction] = useState<'save' | 'delete' | 'history' | null>(null);
  const [saveSessionModalOpen, setSaveSessionModalOpen] = useState(false);
  const [sessionDataForSaving, setSessionDataForSaving] = useState<{
    messages: any[];
    resources: string[];
    flashcards: string[];
    notes: string[];
    mindMaps: string[];
  } | null>(null);
  
  // State for the new rename modal (dashboard only)
  const [sessionRenameModalOpen, setSessionRenameModalOpen] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  
  // Maintain separate session IDs for each Athro
  const [athroSessions, setAthroSessions] = useState<Record<string, string | null>>({});
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // 🚀 TIMING FIX: Store pending session override events until athros are loaded
  const [pendingSessionOverride, setPendingSessionOverride] = useState<{athroId: string, duration: number, startTimer: boolean} | null>(null);
  
  // Token limit modal state
  const [tokenLimitModalOpen, setTokenLimitModalOpen] = useState(false);
  const [tokenLimitReason, setTokenLimitReason] = useState<string>('');
  const [tokenLimitTier, setTokenLimitTier] = useState<string>('free');
  const [remainingTokens, setRemainingTokens] = useState<number>(0);
  
  // Removed slide-out sidebar functionality
  
  // Update Athros when props change
  useEffect(() => {
    if (selectedAthros && confidenceLevels && prioritySubjects) {
      console.log('[WorkPage] Props updated:', { selectedAthros, confidenceLevels, prioritySubjects });
      const athrosWithProps = selectedAthros.map(a => {
        let conf: ConfidenceLevel | undefined = undefined;
        if (typeof confidenceLevels[a.id] === 'number') {
          const num = confidenceLevels[a.id] as number;
          if (num > 0) {
            conf = num >= 8 ? 'HIGH' : num >= 5 ? 'MEDIUM' : 'LOW';
          }
        } else if (typeof confidenceLevels[a.id] === 'string' && ['HIGH', 'MEDIUM', 'LOW'].includes(confidenceLevels[a.id] as string)) {
          conf = confidenceLevels[a.id] as ConfidenceLevel;
        }
        return {
          ...a,
          confidenceLevel: conf,
          isPriority: prioritySubjects.has(a.id),
        };
      });
      setAthros(athrosWithProps);
      if (!selectedAthro || !athrosWithProps.find(a => a.id === selectedAthro.id)) {
        setSelectedAthro(athrosWithProps[0] || undefined);
      }
    }
  }, [selectedAthros, confidenceLevels, prioritySubjects]);

  // Load Athros from localStorage if no props provided
  useEffect(() => {
    if (!selectedAthros || !confidenceLevels || !prioritySubjects) {
      loadAthros();
    }
  }, []);

  // Add function to completely clear confidence levels (for testing)
  const clearAllConfidenceLevels = () => {
    // Clear all localStorage items related to confidence
    localStorage.removeItem('subjectConfidence');
    localStorage.removeItem('finalAthros');
    localStorage.removeItem('athro_workspace_confidence_levels');
    localStorage.removeItem('athro_workspace_selected_athros');
    console.log('[CLEANUP] Cleared all confidence levels and selections');
    
    // Force reload Athros
    loadAthros();
  };

  // Clear localStorage athro data to prevent serving stale "AthroWelsh" data
  const clearStaleAthroData = () => {
    console.log('[Federation] 🧹 Clearing ALL localStorage athro data to force fresh Supabase loads...');
    
    const athroKeys = [
      'subjectConfidence',
      'finalAthros', 
      'athroConfidence',
      'athro_workspace_confidence_levels',
      'athro_workspace_selected_athros',
      'selectedAthros',
      'athroPriorities'
    ];
    
    athroKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`🗑️ [Federation] FORCED REMOVAL of ${key}`);
        localStorage.removeItem(key);
      }
    });
  };

  // Load Athros from Supabase + federation system ONLY (no localStorage fallbacks)
  const loadAthros = () => {
    console.log('[Federation] Loading Athros from federation system + Supabase (NO localStorage fallbacks)');
    
    // CRITICAL: Clear any stale localStorage data first
    clearStaleAthroData();
    
    // Use ONLY the ATHROS data from the shared package + props from dashboard
    // This ensures we get fresh "AthroCymraeg" data instead of stale "AthroWelsh"
    
    // If props are provided from dashboard, use them (data from Supabase)
    if (selectedAthros && confidenceLevels && prioritySubjects) {
      console.log('[Federation] Using fresh data from dashboard props (Supabase)');
      const athrosWithProps = selectedAthros.map(a => {
        let conf: ConfidenceLevel | undefined = undefined;
        if (typeof confidenceLevels[a.id] === 'number') {
          const num = confidenceLevels[a.id] as number;
          if (num > 0) {
            conf = num >= 8 ? 'HIGH' : num >= 5 ? 'MEDIUM' : 'LOW';
          }
        } else if (typeof confidenceLevels[a.id] === 'string' && ['HIGH', 'MEDIUM', 'LOW'].includes(confidenceLevels[a.id] as string)) {
          conf = confidenceLevels[a.id] as ConfidenceLevel;
        }
        return {
          ...a,
          confidenceLevel: conf,
          isPriority: prioritySubjects.has(a.id),
        };
      });
      setAthros(athrosWithProps);
      
      // CRITICAL FIX: Preserve current athro selection AND object reference
      setSelectedAthro(currentSelected => {
        if (currentSelected && athrosWithProps.length > 0) {
          const foundCurrent = athrosWithProps.find(a => a.id === currentSelected.id);
          if (foundCurrent) {
            console.log('[Federation] Preserving current athro selection from props:', foundCurrent.name);
            // CRITICAL: Return the existing object to prevent ChatInterface remount
            return currentSelected;
          }
        }
        console.log('[Federation] Setting initial athro selection from props:', athrosWithProps[0]?.name || 'none');
        return athrosWithProps[0] || undefined;
      });
      return;
    }
    
    // Fallback: Use fresh ATHROS from shared package (contains "AthroCymraeg")
    console.log('[Federation] Using fresh ATHROS from shared package');
    const freshAthros = [...ATHROS];
    setAthros(freshAthros);
    
    // CRITICAL FIX: Only set the first athro as selected if there's no current selection
    // This prevents the workspace card from closing when athros are reloaded
    if (freshAthros.length > 0) {
      setSelectedAthro(currentSelected => {
        // If we have a current selection, try to preserve it
        if (currentSelected) {
          const foundCurrent = freshAthros.find(a => a.id === currentSelected.id);
          if (foundCurrent) {
            console.log('[Federation] Preserving current athro selection:', foundCurrent.name);
            // CRITICAL: Return the existing object to prevent ChatInterface remount
            return currentSelected;
          }
        }
        // Only fallback to first athro if no current selection exists
        console.log('[Federation] Setting initial athro selection:', freshAthros[0].name);
        return freshAthros[0];
      });
    }
    
    return freshAthros;
  };

  useEffect(() => {
    // Clean up any old non-user-specific chat sessions to prevent cross-user data leaks
    const cleanupOldSessions = () => {
      console.log('[WorkPage] Cleaning up old non-user-specific chat sessions...');
      const keysToRemove: string[] = [];
      
      // Find all old session keys that don't include a user ID (old format: athro_chat_session_<athroId>)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('athro_chat_session_') && !key.includes('_archived_')) {
          // Check if it's the old format (no user ID)
          const parts = key.split('_');
          // Old format has 4 parts: athro_chat_session_<athroId>
          // New format has 5+ parts: athro_chat_session_<userId>_<athroId>
          if (parts.length === 4) {
            keysToRemove.push(key);
          }
        }
      }
      
      // Remove all old format keys
      keysToRemove.forEach(key => {
        console.log(`[WorkPage] Removing old session key: ${key}`);
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`[WorkPage] Cleaned up ${keysToRemove.length} old non-user-specific session(s)`);
      }
    };
    
    cleanupOldSessions();
    
    // Initial load when component mounts
    loadAthros();
    
    // Only set up federation events when not embedded to prevent duplicate listeners
    let finalAthrosUnsubscribe: (() => void) | undefined;
    let federationUpdateUnsubscribe: (() => void) | undefined;
    
    if (!isEmbedded) {
    // Set up event listeners for federation events
      finalAthrosUnsubscribe = federatedEventBus.on(EVENTS.FINAL_ATHROS_UPDATED, () => {
      console.log('[Federation] Received FINAL_ATHROS_UPDATED event');
      loadAthros(); // Reload Athros with updated confidence levels
    });
    
    // Listen for direct federation updates from the calendar app
      federationUpdateUnsubscribe = federatedEventBus.on(EVENTS.FEDERATION_ATHRO_UPDATE, (data) => {
      console.log('[Federation] Received direct federation update:', data);
      if (data && data.finalAthros && data.source === 'calendar') {
        loadAthros(); // Reload Athros with updated confidence levels
      }
    });
      
      // Send a sync request to notify other apps we're ready
      federatedEventBus.emit(EVENTS.FEDERATION_SYNC_REQUEST, { source: 'workspace' });
    }
    
    // Listen for confidence updates via the AthroSelectionService polling mechanism
    // The service is exported as a singleton instance
    const athroService = AthroSelectionService;
    
    // Create a listener for confidence level changes from polling
    const confidenceChangedListener = (confidenceLevels: Record<string, ConfidenceLevel>) => {
      console.log('[WorkPage] Confidence levels updated via polling:', confidenceLevels);
      loadAthros();
    };
    
    // Register for the confidenceLevelsChanged event from our polling service
    const confidenceUnsubscribe = athroService.addEventListener('confidenceLevelsChanged', confidenceChangedListener);
    
    // Listen for localStorage changes to update in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'athroConfidence') {
        console.log('[WorkPage] athroConfidence changed in localStorage, reloading athros');
        loadAthros();
      } else if (e.key === 'sessionData') {
        console.log('[WorkPage] sessionData changed in localStorage, processing session');
        // Process session data when it changes
        const sessionData = e.newValue;
        if (sessionData && athros.length > 0) {
          try {
            const { athroId, duration } = JSON.parse(sessionData);
            const found = athros.find(a => a.id === athroId);
            if (found) {
              setSelectedAthro(found);
            }
            if (duration && !isNaN(duration)) {
              console.log('[WorkPage] Overriding current timer with new duration:', duration);
              // Set duration and start timer with improved TimerContext
              handleTimeChange(duration);
              handleStart();
            }
            localStorage.removeItem('sessionData');
          } catch (error) {
            console.error('[WorkPage] Error processing session data from storage event:', error);
          }
        }
      }
    };

    // Listen for custom launch session event
    const handleLaunchSession = async (e: CustomEvent) => {
      console.log('🎯 [WORKSPACE] Received launch session event:', e.detail);
      const { athroId, duration } = e.detail;
      
      if (athroId && duration && athros.length > 0) {
        const found = athros.find(a => a.id === athroId);
        if (found) {
          console.log('🎯 [WORKSPACE] Setting athro from launch session:', found.name);
          setSelectedAthro(found);
        }
        
        if (duration && !isNaN(duration)) {
          console.log('🎯 [WORKSPACE] Setting countdown timer from launch session:', duration, 'minutes');
          
          // Set duration and start timer (improved TimerContext handles this properly)
          handleTimeChange(duration);
          handleStart();
          console.log('🎯 [WORKSPACE] ✅ Countdown timer started');
        }
      }
    };

    // ENHANCED FORCE SESSION OVERRIDE HANDLER - DECISIVE TAKEOVER
    const handleForceSessionOverride = async (e: CustomEvent) => {
      console.log('🚀 [WORKSPACE] ===== FORCE SESSION OVERRIDE RECEIVED =====');
      console.log('🚀 [WORKSPACE] Event detail:', e.detail);
      
      const { athroId, duration, startTimer } = e.detail;
      
      if (!athroId || !duration) {
        console.error('🚀 [WORKSPACE] ❌ Missing athroId or duration in force override event');
        return;
      }
      
      // 🚀 TIMING FIX: Check if athros are loaded yet
      if (athros.length === 0) {
        console.log('🚀 [WORKSPACE] ⏳ Athros not loaded yet, storing as pending override...');
        setPendingSessionOverride({ athroId, duration, startTimer });
        return;
      }
      
      // STEP 1: Find and set the target athro
      console.log('🚀 [WORKSPACE] Looking for athro with ID:', athroId);
      const targetAthro = athros.find(a => a.id === athroId);
      if (targetAthro) {
        console.log('🚀 [WORKSPACE] ✅ Found target athro:', targetAthro.name);
        setSelectedAthro(targetAthro);
      } else {
        console.error('🚀 [WORKSPACE] ❌ Could not find athro with ID:', athroId);
        console.log('🚀 [WORKSPACE] Available athros:', athros.map(a => ({ id: a.id, name: a.name })));
        return;
      }
      
      // STEP 2: Set timer duration and start if requested
      console.log('🚀 [WORKSPACE] Setting timer duration to:', duration, 'minutes');
      try {
        // Set the new duration (this will stop any running timer and reset state)
        handleTimeChange(duration);
        console.log('🚀 [WORKSPACE] ✅ Timer duration set to:', duration, 'minutes');
        
        // Start timer if requested
        if (startTimer) {
          console.log('🚀 [WORKSPACE] Starting countdown timer...');
          handleStart(); // The improved handleStart will ensure correct duration
          console.log('🚀 [WORKSPACE] ✅ Countdown timer started');
        }
      } catch (error) {
        console.error('🚀 [WORKSPACE] ❌ Error setting timer:', error);
      }
      
      // STEP 3: Send confirmation back to calendar
      console.log('🚀 [WORKSPACE] Sending override completion confirmation...');
      try {
        window.dispatchEvent(new CustomEvent('sessionOverrideComplete', {
          detail: {
            success: true,
            athroId,
            duration,
            selectedAthro: targetAthro?.name || 'Unknown',
            timestamp: Date.now()
          }
        }));
        console.log('🚀 [WORKSPACE] ✅ Override completion confirmation sent');
      } catch (error) {
        console.error('🚀 [WORKSPACE] ❌ Error sending confirmation:', error);
      }
      
      console.log('🚀 [WORKSPACE] ===== FORCE SESSION OVERRIDE COMPLETE =====');
    };
    
         // Add event listener for localStorage changes
     window.addEventListener('storage', handleStorageChange);
     
     // Add event listener for custom launch session event
     window.addEventListener('launchSession', (e) => handleLaunchSession(e as CustomEvent));
     
     // 🚀 Add event listener for FORCE SESSION OVERRIDE
     window.addEventListener('forceSessionOverride', (e) => handleForceSessionOverride(e as CustomEvent));
     
     // Listen for token limit events
     const handleShowUpgradeModal = (event: CustomEvent) => {
       const { reason, remainingTokens: remaining, tier } = event.detail || {};
       console.log('🚨 Workspace: Token limit reached:', { reason, remaining, tier });
       setTokenLimitReason(reason || 'Token limit reached');
       setTokenLimitTier(tier || 'free');
       setRemainingTokens(remaining || 0);
       setTokenLimitModalOpen(true);
     };

     window.addEventListener('showUpgradeModal', handleShowUpgradeModal as EventListener);
     
           // Cleanup function
      return () => {
        // Unsubscribe from all event listeners
        finalAthrosUnsubscribe?.();
        federationUpdateUnsubscribe?.();
        confidenceUnsubscribe(); // Use the unsubscribe function returned by addEventListener
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('launchSession', (e) => handleLaunchSession(e as CustomEvent));
        window.removeEventListener('forceSessionOverride', (e) => handleForceSessionOverride(e as CustomEvent));
      };
   }, [isEmbedded]);

  useEffect(() => {
    // Check for session data in localStorage
    const sessionData = localStorage.getItem('sessionData');
    if (sessionData && athros.length > 0) {
      try {
        console.log('[WorkPage] Processing session data:', sessionData);
        const { athroId, duration } = JSON.parse(sessionData);
        console.log('[WorkPage] Parsed session data:', { athroId, duration });
        
        const found = athros.find(a => a.id === athroId);
        if (found) {
          console.log('[WorkPage] Found Athro, setting as selected:', found.name);
          setSelectedAthro(found);
        } else {
          console.log('[WorkPage] Athro not found in current list:', athroId);
        }
        
        if (duration && !isNaN(duration)) {
          console.log('[WorkPage] Overriding current timer with new duration:', duration);
          // Set duration and start timer with improved TimerContext
          handleTimeChange(duration);
          handleStart();
        }
        
        // Clear the session data after using it
        localStorage.removeItem('sessionData');
        console.log('[WorkPage] Session data processed and cleared');
      } catch (error) {
        console.error('[WorkPage] Error parsing session data:', error);
      }
    }
  }, [athros, handleTimeChange, handleStart, handleComplete]);

  // 🚀 TIMING FIX: Process pending session override once athros are loaded
  useEffect(() => {
    if (pendingSessionOverride && athros.length > 0) {
      console.log('🚀 [WORKSPACE] Processing pending session override now that athros are loaded:', pendingSessionOverride);
      
      const { athroId, duration, startTimer } = pendingSessionOverride;
      
      // Find and set the target athro
      const targetAthro = athros.find(a => a.id === athroId);
      if (targetAthro) {
        console.log('🚀 [WORKSPACE] ✅ Found target athro for pending override:', targetAthro.name);
        setSelectedAthro(targetAthro);
        
        // Set timer duration and start if requested
        try {
          handleTimeChange(duration);
          if (startTimer) {
            handleStart();
          }
          console.log('🚀 [WORKSPACE] ✅ Pending session override completed successfully');
          
          // Send confirmation back to calendar
          window.dispatchEvent(new CustomEvent('sessionOverrideComplete', {
            detail: {
              success: true,
              athroId,
              duration,
              selectedAthro: targetAthro.name,
              timestamp: Date.now()
            }
          }));
        } catch (error) {
          console.error('🚀 [WORKSPACE] ❌ Error processing pending session override:', error);
        }
      } else {
        console.error('🚀 [WORKSPACE] ❌ Still could not find athro with ID:', athroId);
      }
      
      // Clear the pending override
      setPendingSessionOverride(null);
    }
  }, [athros, pendingSessionOverride, handleTimeChange, handleStart]);

  // Create session for selected Athro if none exists
  useEffect(() => {
    const createSessionIfNeeded = async () => {
      if (selectedAthro && !athroSessions[selectedAthro.id] && !isCreatingSession) {
        console.log('[WorkPage] No session for selected Athro, marking as pending:', selectedAthro.id);
        setIsCreatingSession(true);
        
        try {
          // Don't create a session in the database yet - just mark that we need one
          // The session will be created when the user saves with actual messages
          console.log('[WorkPage] Marking session as pending for Athro:', selectedAthro.id);
          
          // Use a temporary placeholder to indicate a session is pending
          setAthroSessions(prev => ({
            ...prev,
            [selectedAthro.id]: 'pending-session'
          }));
          
          // Notify components that a session is ready to be used (but not saved yet)
          window.dispatchEvent(new CustomEvent('sessionReady', { 
            detail: { athroId: selectedAthro.id } 
          }));
        } catch (error) {
          console.error('[WorkPage] Error setting up session for Athro:', error);
        } finally {
          setIsCreatingSession(false);
        }
      }
    };
    
    createSessionIfNeeded();
  }, [selectedAthro?.id]); // Only depend on the ID, not the whole object

  // Session management functions
  const resetChat = () => {
    // Only increment chatKey for the current selected Athro
    // This will force a remount of just that Athro's chat
    setChatKey(prev => prev + 1);
  };

  // Debug: Monitor currentSessionId changes
  useEffect(() => {
    console.log('[WorkPage] currentSessionId changed to:', selectedAthro ? athroSessions[selectedAthro.id] : null);
  }, [athroSessions, selectedAthro]);

  const handleSaveSession = async () => {
    console.log('[WorkPage] handleSaveSession called');
    
    if (!selectedAthro) {
      alert('Please select an Athro first.');
      return;
    }
    
    // Check if we're running embedded in dashboard (port 5210)
    const isEmbedded = window.location.port === '5210' || window.parent !== window;
    
    if (isEmbedded) {
      // Dashboard mode: Immediately save to history and open rename modal
      console.log('[WorkPage] Dashboard mode: Immediately saving to history');
      await handleSaveAndRename();
    } else {
      // Standalone mode: Open save modal like before
      console.log('[WorkPage] Standalone mode: Opening save modal');
      await handleStandaloneSave();
    }
  };

  const handleSaveAndRename = async () => {
    console.log('[WorkPage] handleSaveAndRename called - saving immediately');
    
    if (!selectedAthro) {
      return;
    }
    
    const currentSessionId = athroSessions[selectedAthro.id];
    
    try {
      // 1. Get the current chat messages from ChatInterface
      const getMessagesPromise = new Promise<ChatMessage[]>((resolve) => {
        const handler = (e: CustomEvent) => {
          console.log('[WorkPage] Received chat messages:', e.detail.messages?.length || 0);
          window.removeEventListener('returnChatMessages', handler as EventListener);
          resolve(e.detail.messages || []);
        };
        window.addEventListener('returnChatMessages', handler as EventListener);
      });
      
      console.log('[WorkPage] Requesting messages for athro:', selectedAthro.id);
      window.dispatchEvent(new CustomEvent('requestChatMessages'));
      const messages = await getMessagesPromise;
      
      console.log('[WorkPage] Retrieved messages:', messages.length, 'messages');
      
      // Check if there's an actual conversation
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
        alert('No conversation to save. Start chatting first!');
        return;
      }
      
      // 2. Collect ALL session-related data
      // 2a. Get Resources
      let sessionResources: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const resources = await SupabaseStudyService.getResources(effectiveSessionId, selectedAthro.id);
        sessionResources = resources.map(r => r.id);
        console.log('[WorkPage] Found resources:', sessionResources.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading resources:', error);
      }
      
      // 2b. Get Flashcards
      let sessionFlashcards: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const flashcards = await SupabaseStudyService.getFlashcards(effectiveSessionId, selectedAthro.id);
        sessionFlashcards = flashcards.map(f => f.id);
        console.log('[WorkPage] Found flashcards:', sessionFlashcards.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading flashcards:', error);
      }
      
      // 2c. Get Notes
      let sessionNotes: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const notes = await SupabaseStudyService.getNotes(effectiveSessionId, selectedAthro.id);
        sessionNotes = notes.map(n => n.id);
        console.log('[WorkPage] Found notes:', sessionNotes.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading notes:', error);
      }
      
      // 2d. Get Mind Maps
      let sessionMindMaps: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const mindMaps = await SupabaseStudyService.getMindMaps(effectiveSessionId, selectedAthro.id);
        sessionMindMaps = mindMaps.map(m => m.id);
        console.log('[WorkPage] Found mind maps:', sessionMindMaps.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading mind maps:', error);
      }
      
      // 3. Immediately save to database with default name
      const defaultSessionName = `${selectedAthro.name} Session - ${new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      
      const comprehensiveSessionData = {
        athroId: selectedAthro.id,
        title: defaultSessionName,
        messages,
        resources: sessionResources,
        mindMaps: sessionMindMaps,
        notes: sessionNotes,
        flashcards: sessionFlashcards
      };
      
      console.log('[WorkPage] 🎯 Immediately saving session with default name');
      const savedSession = await SupabaseStudyService.createStudySession(comprehensiveSessionData);
      
      console.log('[WorkPage] ✅ Session saved to history:', savedSession.id);
      
      // 4. Archive the local chat session
      try {
        await ChatSessionService.archiveAndCreateNewSession(selectedAthro.id, messages);
        console.log('[WorkPage] ✅ Chat session archived to localStorage');
      } catch (error) {
        console.warn('[WorkPage] Error archiving chat session:', error);
      }
      
      // 5. Clear the current session and start fresh
      window.dispatchEvent(new CustomEvent('clearSpecificAthroSession', { 
        detail: { athroId: selectedAthro.id } 
      }));
      
      // Set up a new pending session
      setAthroSessions({ ...athroSessions, [selectedAthro.id]: 'pending-session' });
      
      // Notify components
      window.dispatchEvent(new CustomEvent('sessionSaved'));
      
      // 6. Store session data and open rename modal
      setSessionDataForSaving({
        messages,
        resources: sessionResources,
        flashcards: sessionFlashcards,
        notes: sessionNotes,
        mindMaps: sessionMindMaps
      });
      
      setSavedSessionId(savedSession.id);
      setSessionRenameModalOpen(true);
      
    } catch (error) {
      console.error('[WorkPage] Error saving session immediately:', error);
      alert('Failed to save session. Please try again.');
    }
  };

  const handleStandaloneSave = async () => {
    // This is the original save logic for standalone mode
    console.log('[WorkPage] handleStandaloneSave called - Opening save modal');
    
    if (!selectedAthro) {
      return;
    }
    
    const currentSessionId = athroSessions[selectedAthro.id];
    
    try {
      // 1. Get the current chat messages from ChatInterface
      const getMessagesPromise = new Promise<ChatMessage[]>((resolve) => {
        const handler = (e: CustomEvent) => {
          console.log('[WorkPage] Received chat messages:', e.detail.messages?.length || 0);
          window.removeEventListener('returnChatMessages', handler as EventListener);
          resolve(e.detail.messages || []);
        };
        window.addEventListener('returnChatMessages', handler as EventListener);
      });
      
      console.log('[WorkPage] Requesting messages for athro:', selectedAthro.id);
      window.dispatchEvent(new CustomEvent('requestChatMessages'));
      const messages = await getMessagesPromise;
      
      console.log('[WorkPage] Retrieved messages:', messages.length, 'messages');
      
      // Check if there's an actual conversation
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
        alert('No conversation to save. Start chatting first!');
        return;
      }
      
      // 2. Collect ALL session-related data from various sources
      
      // 2a. Get Resources from current session
      let sessionResources: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const resources = await SupabaseStudyService.getResources(effectiveSessionId, selectedAthro.id);
        sessionResources = resources.map(r => r.id);
        console.log('[WorkPage] Found resources:', sessionResources.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading resources:', error);
      }
      
      // 2b. Get Flashcards created in this session
      let sessionFlashcards: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const flashcards = await SupabaseStudyService.getFlashcards(effectiveSessionId, selectedAthro.id);
        sessionFlashcards = flashcards.map(f => f.id);
        console.log('[WorkPage] Found flashcards:', sessionFlashcards.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading flashcards:', error);
      }
      
      // 2c. Get Notes created in this session  
      let sessionNotes: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const notes = await SupabaseStudyService.getNotes(effectiveSessionId, selectedAthro.id);
        sessionNotes = notes.map(n => n.id);
        console.log('[WorkPage] Found notes:', sessionNotes.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading notes:', error);
      }
      
      // 2d. Get Mind Maps created in this session
      let sessionMindMaps: string[] = [];
      try {
        const effectiveSessionId = (currentSessionId === 'pending-session' || !currentSessionId) ? 'temp-session' : currentSessionId;
        const mindMaps = await SupabaseStudyService.getMindMaps(effectiveSessionId, selectedAthro.id);
        sessionMindMaps = mindMaps.map(m => m.id);
        console.log('[WorkPage] Found mind maps:', sessionMindMaps.length);
      } catch (error) {
        console.warn('[WorkPage] Error loading mind maps:', error);
      }
      
      // 3. Store session data for the modal
      setSessionDataForSaving({
        messages,
        resources: sessionResources,
        flashcards: sessionFlashcards,
        notes: sessionNotes,
        mindMaps: sessionMindMaps
      });
      
      // 4. Open the save session modal
      setSaveSessionModalOpen(true);
      
    } catch (error) {
      console.error('[WorkPage] Error collecting session data:', error);
      alert('Failed to collect session data. Please try again.');
    }
  };

  const handleSaveSessionWithName = async (sessionName: string) => {
    console.log('[WorkPage] Saving session with custom name:', sessionName);
    
    if (!selectedAthro || !sessionDataForSaving) {
      throw new Error('Missing session data');
    }
    
    const currentSessionId = athroSessions[selectedAthro.id];
    
    try {
      // Create comprehensive session data with custom name
      const comprehensiveSessionData = {
        athroId: selectedAthro.id,
        title: sessionName,
        messages: sessionDataForSaving.messages,
        resources: sessionDataForSaving.resources,
        mindMaps: sessionDataForSaving.mindMaps,
        notes: sessionDataForSaving.notes,
        flashcards: sessionDataForSaving.flashcards
      };
      
      console.log('[WorkPage] 🎯 COMPREHENSIVE SESSION DATA:', {
        title: sessionName,
        messages: sessionDataForSaving.messages.length,
        resources: sessionDataForSaving.resources.length,
        flashcards: sessionDataForSaving.flashcards.length,
        notes: sessionDataForSaving.notes.length,
        mindMaps: sessionDataForSaving.mindMaps.length
      });
      
      // Save to database with ALL collected data
      console.log('[WorkPage] Creating new comprehensive session with all tools');
      const savedSession = await SupabaseStudyService.createStudySession(comprehensiveSessionData);
      
      console.log('[WorkPage] ✅ Session saved with FULL DATA:', savedSession.id);
      
      // Archive the local chat session using ChatSessionService
      try {
        await ChatSessionService.archiveAndCreateNewSession(selectedAthro.id, sessionDataForSaving.messages);
        console.log('[WorkPage] ✅ Chat session archived to localStorage');
      } catch (error) {
        console.warn('[WorkPage] Error archiving chat session:', error);
      }
      
      // Clear the current session and start fresh
      window.dispatchEvent(new CustomEvent('clearSpecificAthroSession', { 
        detail: { athroId: selectedAthro.id } 
      }));
      
      // Set up a new pending session
      setAthroSessions({ ...athroSessions, [selectedAthro.id]: 'pending-session' });
      
      // Notify components
      window.dispatchEvent(new CustomEvent('sessionSaved'));
      
      // Clear session data for saving
      setSessionDataForSaving(null);
      
      alert(`"${sessionName}" saved successfully with ${sessionDataForSaving.messages.length} messages, ${sessionDataForSaving.resources.length} resources, ${sessionDataForSaving.flashcards.length} flashcards, ${sessionDataForSaving.notes.length} notes, and ${sessionDataForSaving.mindMaps.length} mind maps! Starting a new session.`);
      
    } catch (error) {
      console.error('[WorkPage] Error saving comprehensive session:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleRenameModalSave = async (sessionName: string) => {
    if (!savedSessionId || !sessionDataForSaving || !selectedAthro) {
      throw new Error('Missing session data for rename');
    }
    
    try {
      // Update the session name in the database using existing updateStudySession method
      await SupabaseStudyService.updateStudySession(savedSessionId, {
        title: sessionName
      });
      console.log('[WorkPage] ✅ Session renamed successfully:', sessionName);
      
      // Clear states
      setSavedSessionId(null);
      setSessionDataForSaving(null);
      
    } catch (error) {
      console.error('[WorkPage] Error renaming session:', error);
      throw error;
    }
  };

  const handleDeleteFromHistory = async () => {
    if (!savedSessionId) {
      console.error('[WorkPage] No saved session ID to delete');
      return;
    }
    
    try {
      // Delete the session from database
      await SupabaseStudyService.deleteStudySession(savedSessionId);
      console.log('[WorkPage] ✅ Session deleted from history:', savedSessionId);
      
      // Clear states
      setSavedSessionId(null);
      setSessionDataForSaving(null);
      
    } catch (error) {
      console.error('[WorkPage] Error deleting session from history:', error);
      alert('Failed to delete session from history. Please try again.');
    }
  };
  
  const handleDeleteSession = async () => {
    // Check if we're running embedded in dashboard (port 5210)
    const isEmbedded = window.location.port === '5210' || window.parent !== window;
    
    if (isEmbedded) {
      // Dashboard mode: Delete button does the SAME thing as save - save to history and open rename modal
      console.log('[WorkPage] Dashboard mode: Delete button working same as save');
      await handleSaveAndRename();
    } else {
      // Standalone mode: Actually delete the session
      console.log('[WorkPage] Standalone mode: Actually deleting session');
      await handleActualDelete();
    }
  };

  const handleActualDelete = async () => {
    if (!selectedAthro || !athroSessions[selectedAthro.id]) {
      alert('No active session to delete.');
      return;
    }
    
    const currentSessionId = athroSessions[selectedAthro.id];
    
    if (confirm('Are you sure you want to delete this session? This will also delete all associated study tools and resources.')) {
      try {
        await SupabaseStudyService.deleteStudySession(currentSessionId!);
        
        console.log('Session deleted:', currentSessionId);
        
        // Clear only the current Athro's session
        if (selectedAthro) {
          window.dispatchEvent(new CustomEvent('clearSpecificAthroSession', { 
            detail: { athroId: selectedAthro.id } 
          }));
        }
        
        // Clear the session ID
        setAthroSessions({ ...athroSessions, [selectedAthro.id]: null });
        
        // Notify components to clear study tools
        window.dispatchEvent(new CustomEvent('sessionDeleted'));
        
        alert('Session deleted successfully.');
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session. Please try again.');
      }
    }
  };

  const handleViewHistory = () => {
    console.log('[WorkPage] handleViewHistory called, setting isHistoryOpen to true');
    setIsHistoryOpen(true);
  };
  
  const handleLoadSession = async (sessionId: string) => {
    try {
      console.log('[WorkPage] handleLoadSession called with:', sessionId);
      console.log('[WorkPage] Current sessionId before update:', selectedAthro ? athroSessions[selectedAthro.id] : null);
      
      if (!selectedAthro) {
        console.error('[WorkPage] No selected Athro to load session for');
        return;
      }
      
      const currentSessionId = athroSessions[selectedAthro.id];
      
      // Load the session data from the database
      const sessionData = await SupabaseStudyService.getStudyHistoryById(sessionId);
      if (!sessionData) {
        console.error('[WorkPage] Session not found:', sessionId);
        alert('Session not found. It may have been deleted.');
        return;
      }
      
      console.log('[WorkPage] Loaded session data:', sessionData);
      console.log('[WorkPage] Session has', sessionData.messages?.length || 0, 'messages');
      
      // Set the current session ID
      setAthroSessions({ ...athroSessions, [selectedAthro.id]: sessionId });
      
      // Notify ChatInterface to load the session content
      window.dispatchEvent(new CustomEvent('loadSessionContent', { 
        detail: { 
          sessionId,
          sessionData,
          athroId: selectedAthro.id
        } 
      }));
      
      // Reset chat if we're loading a different session from history
      if (currentSessionId && currentSessionId !== sessionId) {
        console.log('[WorkPage] Different session detected, resetting chat');
        resetChat();
      }
      
      console.log('[WorkPage] Session loaded:', sessionId);
    } catch (error) {
      console.error('[WorkPage] Error loading session:', error);
      alert('Failed to load session. Please try again.');
    }
  };

  // File upload handling for sliding sidebar
  const handleFileUpload = async (files: FileList) => {
    if (!selectedAthro) {
      alert('Please select an Athro first');
      return;
    }

    try {
      const athroId = selectedAthro.id;
      const folderPath = 'quickaccess';
      
      // Ensure we have a valid session ID - create one if needed
      let sessionId = athroSessions[athroId];
      if (!sessionId || sessionId === 'pending-session') {
        // Create a temporary session ID for quick uploads
        sessionId = `quickaccess-${Date.now()}`;
        console.log('[WorkPage] Created temporary session for file upload:', sessionId);
        
        // Update the session tracking
        setAthroSessions(prev => ({
          ...prev,
          [athroId]: sessionId
        }));
      }
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[WorkPage] Uploading file: ${file.name} to ${athroId}/${folderPath}`);
        
        // Upload to Supabase using createResource method
        await SupabaseStudyService.createResource(file, {
          sessionId,
          athroId,
          subject: selectedAthro.subject,
          topic: 'Quick Access',
          folderPath
        });
      }
      
      // Use a more user-friendly notification
      const successMessage = `Successfully uploaded ${files.length} file(s) to ${selectedAthro.name}'s Quick Access folder!`;
      console.log('[WorkPage]', successMessage);
      
      // Show a temporary success message instead of alert
      const successDiv = document.createElement('div');
      successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4fc38a 0%, #3a9b6b 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Raleway', sans-serif;
        font-weight: 600;
        font-size: 0.9rem;
        max-width: 300px;
        transition: all 0.3s ease;
      `;
      successDiv.textContent = successMessage;
      document.body.appendChild(successDiv);
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        successDiv.style.opacity = '0';
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
          }
        }, 300);
      }, 3000);
      
      // Notify resources component to refresh
      window.dispatchEvent(new CustomEvent('refreshResources', { 
        detail: { athroId } 
      }));
      

      
    } catch (error) {
      console.error('[WorkPage] Error uploading files:', error);
      
      // Show a more user-friendly error message
      const errorMessage = 'Upload failed. Please make sure you are signed in and try again.';
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Raleway', sans-serif;
        font-weight: 600;
        font-size: 0.9rem;
        max-width: 300px;
        transition: all 0.3s ease;
      `;
      errorDiv.textContent = errorMessage;
      document.body.appendChild(errorDiv);
      
      // Remove the message after 4 seconds
      setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 300);
      }, 4000);
    }
  };

  // Removed slide-out sidebar drag and drop functions

  return (
    <div className="work-page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="work-page-content">
        <div className="work-page-carousel">
          {athros.length > 0 && selectedAthro && (
            <AthroCarousel
              athros={athros}
              selectedAthro={selectedAthro}
              onSelectAthro={setSelectedAthro}
            />
          )}
        </div>
        
        {/* Session creation indicator */}
        {isCreatingSession && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(79, 195, 138, 0.9)',
            color: '#17221c',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            zIndex: 1000,
            fontSize: '0.875rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            🚀 Starting your study session...
          </div>
        )}
        
        {/* Empty state when no athros are selected */}
        {athros.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            maxHeight: '400px',
            width: '100%',
            textAlign: 'center',
            padding: '2rem',
            color: '#b5cbb2'
          }}>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '1rem',
              lineHeight: '1.5',
              maxWidth: '600px'
            }}>
              Hi! It looks like you haven't chosen any Athros yet! Go to Settings and choose all the subjects you are studying. Come back here to set your confidence levels and your priority subjects for the week!
            </div>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('athro-open-subject-selection'));
                }
              }}
              style={{
                backgroundColor: '#e4c97e',
                color: '#1c2a1e',
                fontWeight: 700,
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(228, 201, 126, 0.8)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#e4c97e';
              }}
            >
              Go to Settings
            </button>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'row', height: '770px', maxHeight: '770px', width: '100%' }}>
          {/* Chat Interface - Only render the selected Athro's chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '770px' }}>
            {selectedAthro && (
              <ChatInterface
                key={selectedAthro.id} // Keep the key to maintain session when switching
                athro={selectedAthro}
                sessionAction={sessionAction}
                onSessionActionComplete={() => setSessionAction(null)}
                onSaveSession={handleSaveSession}
                onDeleteSession={handleDeleteSession}
                onViewHistory={handleViewHistory}
                currentSessionId={athroSessions[selectedAthro.id] || null}
                onLoadSession={handleLoadSession}
                isCreatingSession={isCreatingSession}
              />
            )}
          </div>
        </div>
        )}
      </div>
      
      {/* Study History Modal */}
      {selectedAthro && (
        <StudyHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          athroId={selectedAthro.id}
          onLoadStudy={handleLoadSession}
        />
      )}

      {/* Save Session Modal */}
      <SaveSessionModal
        isOpen={saveSessionModalOpen}
        onClose={() => {
          setSaveSessionModalOpen(false);
          setSessionDataForSaving(null);
        }}
        onSave={handleSaveSessionWithName}
        athroName={selectedAthro?.name || 'Athro'}
        messageCount={sessionDataForSaving?.messages.length || 0}
        resourceCount={sessionDataForSaving?.resources.length || 0}
        flashcardCount={sessionDataForSaving?.flashcards.length || 0}
        noteCount={sessionDataForSaving?.notes.length || 0}
        mindMapCount={sessionDataForSaving?.mindMaps.length || 0}
      />

      {/* Session Rename Modal - For dashboard embedded mode */}
      <SessionRenameModal
        isOpen={sessionRenameModalOpen}
        onClose={() => {
          setSessionRenameModalOpen(false);
          setSavedSessionId(null);
          setSessionDataForSaving(null);
        }}
        onSaveWithName={handleRenameModalSave}
        onDeleteFromHistory={handleDeleteFromHistory}
        athroName={selectedAthro?.name || 'Athro'}
        messageCount={sessionDataForSaving?.messages.length || 0}
        resourceCount={sessionDataForSaving?.resources.length || 0}
        flashcardCount={sessionDataForSaving?.flashcards.length || 0}
        noteCount={sessionDataForSaving?.notes.length || 0}
        mindMapCount={sessionDataForSaving?.mindMaps.length || 0}
      />

      {/* Token Limit Modal - Temporarily using simple modal */}
      {tokenLimitModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3>Token Limit Reached</h3>
            <p>{tokenLimitReason}</p>
            <p>Current Tier: {tokenLimitTier}</p>
            <p>Remaining Tokens: {remainingTokens}</p>
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => {
                  setTokenLimitModalOpen(false);
                  if (window.parent !== window) {
                    window.parent.postMessage({ type: 'openUpgrade' }, '*');
                  } else {
                    window.open('/upgrade', '_blank');
                  }
                }}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  marginRight: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Upgrade
              </button>
              <button
                onClick={() => setTokenLimitModalOpen(false)}
                style={{
                  backgroundColor: '#ccc',
                  color: 'black',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-out sidebar functionality completely removed */}


    </div>
  );
};

export default WorkPage;
