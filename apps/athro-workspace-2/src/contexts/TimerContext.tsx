import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface TimerContextType {
  timeLeft: number;
  isRunning: boolean;
  isCompleted: boolean;
  selectedTime: number;
  hasBeenUsed: boolean;
  handleStart: () => void;
  handlePause: () => void;
  handleComplete: () => void;
  handleTimeChange: (newTime: number) => void;
  formatTime: (seconds: number) => string;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

interface TimerProviderProps {
  children: ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedTime, setSelectedTime] = useState(20);
  const [hasBeenUsed, setHasBeenUsed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect - persists across component switches
  // Only runs when needed and timer is visible/active
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000); // This is necessary for timer functionality - not for data syncing
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]); // Removed timeLeft from dependencies to prevent interval recreation

  // Timer handlers
  const handleStart = () => {
    console.log('[TimerContext] handleStart called, timeLeft:', timeLeft, 'selectedTime:', selectedTime);
    
    // ✅ FIX: Always ensure timer starts with correct duration
    // If timeLeft is 0 OR we want to start fresh, use selectedTime
    let startTimeLeft = timeLeft;
    if (timeLeft === 0 || timeLeft !== selectedTime * 60) {
      startTimeLeft = selectedTime * 60;
      setTimeLeft(startTimeLeft);
      console.log('[TimerContext] Setting timer to selected duration:', startTimeLeft);
    }
    
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsRunning(true);
    setIsCompleted(false);
    setHasBeenUsed(true);
    console.log('[TimerContext] ✅ Timer started, isRunning set to true, timeLeft:', startTimeLeft);
  };

  const handlePause = () => {
    console.log('[TimerContext] handlePause called');
    setIsRunning(false);
  };

  const handleComplete = () => {
    console.log('[TimerContext] handleComplete called - immediately stopping timer');
    setIsRunning(false);
    setTimeLeft(0);
    setIsCompleted(false);

    // 🚀 NEW: Track study session completion
    if (hasBeenUsed && selectedTime > 0) {
      trackStudySessionCompletion();
    }

    // Clear any existing interval immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 🚀 NEW: Track study session function
  const trackStudySessionCompletion = async () => {
    try {
      // Get current athro from localStorage or URL params
      const urlParams = new URLSearchParams(window.location.search);
      const sessionData = localStorage.getItem('currentStudySession') || localStorage.getItem('sessionData');
      
      let athroId, athroName, subject;
      
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        athroId = parsed.athroId;
        athroName = parsed.athroName;
        subject = parsed.subject;
      } else {
        // Fallback: try to get from current workspace state
        athroId = urlParams.get('athroId') || 'unknown-athro';
        athroName = urlParams.get('athroName') || 'Study Session';
        subject = urlParams.get('subject') || 'General Study';
      }
      
      // Import insights service (note the path difference from workspace-2)
      const insightsModule = await import('../../../athro-dashboard/src/services/insightsService');
      const insightsService = insightsModule.insightsService;
      
      // Get user from auth context or localStorage
      const userData = JSON.parse(localStorage.getItem('sb-supabase-auth-token') || '{}');
      if (userData.user) {
        insightsService.setUser(userData.user);
        
        await insightsService.trackStudySession({
          athro_id: athroId,
          athro_name: athroName,
          subject: subject,
          duration_minutes: selectedTime,
          session_type: 'study'
        });
        
        console.log('✅ Study session tracked in insights:', { athroId, duration: selectedTime });
      }
    } catch (error) {
      console.error('❌ Failed to track study session:', error);
    }
  };

  const handleTimeChange = (newTime: number) => {
    console.log('[TimerContext] handleTimeChange called with:', newTime);
    
    // ✅ FIX: Stop any running timer when duration changes
    if (isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
      console.log('[TimerContext] Stopped running timer due to duration change');
    }
    
    setSelectedTime(newTime);
    setTimeLeft(newTime * 60);
    setIsCompleted(false); // Reset completion state
    console.log('[TimerContext] ✅ Set selectedTime to:', newTime, 'and timeLeft to:', newTime * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const value: TimerContextType = {
    timeLeft,
    isRunning,
    isCompleted,
    selectedTime,
    hasBeenUsed,
    handleStart,
    handlePause,
    handleComplete,
    handleTimeChange,
    formatTime
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}; 