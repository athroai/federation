/**
 * 🔥 REAL-TIME ACTIVITY TIMER SERVICE
 * 
 * Manages the 15-minute timer for free tier users with:
 * - Activity-based pause/resume (mouse, keyboard, scroll)
 * - Cross-app synchronization (5210 ↔ 5175)
 * - Persistent timer state across page refreshes
 * - Beautiful countdown display and lockout modals
 */

export interface ActivityState {
  isActive: boolean;
  timeRemaining: number; // seconds
  totalTime: number; // seconds (900 = 15 minutes)
  lastActivity: number; // timestamp
  isPaused: boolean;
  hasExpired: boolean;
  userTier: 'free' | 'lite' | 'full';
}

export interface ActivityListener {
  onTick: (state: ActivityState) => void;
  onExpired: () => void;
  onPaused: () => void;
  onResumed: () => void;
}

export class ActivityTimerService {
  private static instance: ActivityTimerService;
  private state: ActivityState;
  private listeners: ActivityListener[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;
  
  // Activity tracking
  private readonly INACTIVITY_THRESHOLD = 30000; // 30 seconds = pause timer
  private readonly STORAGE_KEY = 'athro_activity_timer';
  private readonly CHANNEL_NAME = 'athro_timer_sync';
  
  // Activity event listeners
  private activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  private constructor() {
    this.state = this.initializeState();
    this.setupBroadcastChannel();
    this.setupActivityTracking();
    this.loadPersistedState();
    this.startTimer();
  }
  
  static getInstance(): ActivityTimerService {
    if (!ActivityTimerService.instance) {
      ActivityTimerService.instance = new ActivityTimerService();
    }
    return ActivityTimerService.instance;
  }
  
  private initializeState(): ActivityState {
    return {
      isActive: true,
      timeRemaining: 15 * 60, // 15 minutes in seconds
      totalTime: 15 * 60,
      lastActivity: Date.now(),
      isPaused: false,
      hasExpired: false,
      userTier: 'free'
    };
  }
  
  /**
   * Set user tier and adjust timer behavior
   */
  setUserTier(tier: 'free' | 'lite' | 'full'): void {
    this.state.userTier = tier;
    
    // Only free tier users have time limits
    if (tier !== 'free') {
      this.stopTimer();
      this.state.hasExpired = false;
      this.state.timeRemaining = this.state.totalTime;
    } else {
      // Free tier: start/resume timer
      this.startTimer();
    }
    
    this.broadcastState();
    this.persistState();
  }
  
  /**
   * Setup cross-app communication
   */
  private setupBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel(this.CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        const receivedState = event.data as ActivityState;
        
        // Only sync if the received state is more recent
        if (receivedState.lastActivity > this.state.lastActivity) {
          this.state = { ...receivedState };
          this.notifyListeners();
        }
      };
    } catch (error) {
      console.warn('[ActivityTimer] BroadcastChannel not supported:', error);
    }
  }
  
  /**
   * Setup activity tracking (mouse, keyboard, scroll, touch)
   */
  private setupActivityTracking(): void {
    const handleActivity = () => {
      this.recordActivity();
    };
    
    // Add activity listeners
    this.activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Track window focus/blur
    window.addEventListener('focus', () => {
      this.recordActivity();
    });
    
    window.addEventListener('blur', () => {
      // Don't immediately pause, let inactivity timeout handle it
    });
    
    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.recordActivity();
      }
    });
  }
  
  /**
   * Record user activity and reset inactivity timer
   */
  private recordActivity(): void {
    const now = Date.now();
    this.state.lastActivity = now;
    
    // If timer was paused due to inactivity, resume it
    if (this.state.isPaused && !this.state.hasExpired && this.state.userTier === 'free') {
      this.resumeTimer();
    }
    
    // Reset inactivity timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
    
    // Set new inactivity timeout
    this.activityTimeout = setTimeout(() => {
      this.pauseTimer();
    }, this.INACTIVITY_THRESHOLD);
    
    this.broadcastState();
    this.persistState();
  }
  
  /**
   * Start the countdown timer
   */
  private startTimer(): void {
    if (this.state.userTier !== 'free' || this.state.hasExpired) {
      return;
    }
    
    this.stopTimer(); // Clear any existing timer
    
    this.intervalId = setInterval(() => {
      if (!this.state.isPaused && !this.state.hasExpired && this.state.userTier === 'free') {
        this.state.timeRemaining--;
        
        if (this.state.timeRemaining <= 0) {
          this.expireTimer();
        } else {
          this.notifyListeners();
          this.broadcastState();
          this.persistState();
        }
      }
    }, 1000);
  }
  
  /**
   * Stop the countdown timer
   */
  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Pause timer due to inactivity
   */
  private pauseTimer(): void {
    if (this.state.userTier !== 'free' || this.state.hasExpired) {
      return;
    }
    
    this.state.isPaused = true;
    this.notifyListeners();
    this.listeners.forEach(listener => listener.onPaused?.());
    this.broadcastState();
    this.persistState();
    
    console.log('⏸️ [ActivityTimer] Timer paused due to inactivity');
  }
  
  /**
   * Resume timer after activity detected
   */
  private resumeTimer(): void {
    if (this.state.userTier !== 'free' || this.state.hasExpired) {
      return;
    }
    
    this.state.isPaused = false;
    this.notifyListeners();
    this.listeners.forEach(listener => listener.onResumed?.());
    this.broadcastState();
    this.persistState();
    
    console.log('▶️ [ActivityTimer] Timer resumed after activity');
  }
  
  /**
   * Expire timer when time runs out
   */
  private expireTimer(): void {
    this.state.hasExpired = true;
    this.state.timeRemaining = 0;
    this.state.isPaused = false;
    this.stopTimer();
    
    // Clear all persisted data for free users
    this.clearAllUserData();
    
    this.notifyListeners();
    this.listeners.forEach(listener => listener.onExpired?.());
    this.broadcastState();
    this.persistState();
    
    console.log('⏰ [ActivityTimer] Timer expired - full app lockout');
  }
  
  /**
   * Clear all user data when timer expires
   */
  private clearAllUserData(): void {
    try {
      // Clear localStorage (except timer state)
      const keysToKeep = [this.STORAGE_KEY];
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB (for more complex apps)
      if ('indexedDB' in window) {
        // Note: This would need specific implementation based on your IndexedDB usage
      }
      
      console.log('🗑️ [ActivityTimer] Cleared all user data after timer expiry');
    } catch (error) {
      console.error('[ActivityTimer] Error clearing user data:', error);
    }
  }
  
  /**
   * Broadcast state to other tabs/apps
   */
  private broadcastState(): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(this.state);
      } catch (error) {
        console.warn('[ActivityTimer] Error broadcasting state:', error);
      }
    }
  }
  
  /**
   * Persist state to localStorage
   */
  private persistState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        ...this.state,
        persistedAt: Date.now()
      }));
    } catch (error) {
      console.warn('[ActivityTimer] Error persisting state:', error);
    }
  }
  
  /**
   * Load persisted state from localStorage
   */
  private loadPersistedState(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const timeSinceLastPersist = now - (parsed.persistedAt || now);
        
        // If more than 1 hour since last persist, reset timer
        if (timeSinceLastPersist > 60 * 60 * 1000) {
          this.resetTimer();
          return;
        }
        
        // If timer was running and not paused, account for offline time
        if (!parsed.isPaused && !parsed.hasExpired && parsed.userTier === 'free') {
          const offlineSeconds = Math.floor(timeSinceLastPersist / 1000);
          parsed.timeRemaining = Math.max(0, parsed.timeRemaining - offlineSeconds);
          
          if (parsed.timeRemaining <= 0) {
            this.expireTimer();
            return;
          }
        }
        
        this.state = {
          ...this.state,
          ...parsed,
          lastActivity: now
        };
        
        console.log('📱 [ActivityTimer] Loaded persisted state:', this.state);
      }
    } catch (error) {
      console.warn('[ActivityTimer] Error loading persisted state:', error);
      this.resetTimer();
    }
  }
  
  /**
   * Reset timer (for new day or errors)
   */
  resetTimer(): void {
    this.state = this.initializeState();
    this.state.lastActivity = Date.now();
    this.persistState();
    this.broadcastState();
    this.notifyListeners();
    
    if (this.state.userTier === 'free') {
      this.startTimer();
    }
    
    console.log('🔄 [ActivityTimer] Timer reset');
  }
  
  /**
   * Add listener for timer updates
   */
  addListener(listener: ActivityListener): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove listener
   */
  removeListener(listener: ActivityListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener.onTick(this.state);
      } catch (error) {
        console.error('[ActivityTimer] Error in listener:', error);
      }
    });
  }
  
  /**
   * Get current timer state
   */
  getState(): ActivityState {
    return { ...this.state };
  }
  
  /**
   * Format time remaining as MM:SS
   */
  formatTimeRemaining(): string {
    const minutes = Math.floor(this.state.timeRemaining / 60);
    const seconds = this.state.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Check if user should be locked out
   */
  isLockedOut(): boolean {
    return this.state.userTier === 'free' && this.state.hasExpired;
  }
  
  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.state.userTier === 'free' && !this.state.hasExpired && !this.state.isPaused;
  }
  
  /**
   * Get time remaining as percentage
   */
  getProgressPercentage(): number {
    return ((this.state.totalTime - this.state.timeRemaining) / this.state.totalTime) * 100;
  }
  
  /**
   * Cleanup when component unmounts
   */
  cleanup(): void {
    this.stopTimer();
    
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    
    // Remove activity listeners
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.recordActivity);
    });
  }
} 