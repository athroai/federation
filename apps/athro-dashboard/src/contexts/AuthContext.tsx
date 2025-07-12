import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { userPreferencesService } from '../services/userPreferencesService';
import { demoDataService } from '../services/DemoDataService';
// Basic types for subscription management
interface UsageCheck {
  success: boolean;
  canProceed: boolean;
  error?: string;
  currentSpendGBP: number;
  monthlyLimitGBP: number;
  remainingGBP: number;
  remainingTokens: number;
  tier: 'free' | 'lite' | 'full';
}

  interface UserSubscription {
    tier: 'free' | 'lite' | 'full';
    spentThisMonthGBP: number;
    monthlyLimitGBP: number;
    remainingGBP: number;
    lastActivityResetDate: string;
  }

interface ActivityState {
  isActive: boolean;
  timeRemaining: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userTier: 'free' | 'lite' | 'full' | null;
  subscription: UserSubscription | null;
  loading: boolean;
  // 🔥 NEW: Activity Timer State
  activityState: ActivityState | null;
  // 🚀 NEW: User Profile State
  userProfile: {
    id: string;
    full_name: string | null;
    preferred_name: string | null;
    school: string | null;
    year: number | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  clearUserData: () => void;
  isFullTierUser: () => boolean;
  loadUserTier: (userId?: string) => Promise<void>;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  isDemoMode: () => boolean;
  // New subscription methods
  checkUsage: (estimatedTokens?: number) => Promise<UsageCheck>;
  updateUsage: (inputTokens?: number, outputTokens?: number) => Promise<UsageCheck>;
  checkAccess: (accessType: 'dashboard' | 'workspace') => Promise<{
    hasAccess: boolean;
    reason?: string;
    requiresUpgrade?: boolean;
    lockoutType?: 'full_app' | 'workspace_only' | 'none';
  }>;
  updateUserTier: (newTier: 'free' | 'lite' | 'full') => Promise<boolean>;
  formatTimeRemaining: () => string;
  isTimerExpired: () => boolean;
  showFullAppLockout: boolean;
  showWorkspaceLockout: boolean;
  // 🚀 NEW: Profile update method
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'lite' | 'full' | null>(null);
  
  // Set user tier without debug logging
  const setUserTierSafe = (newTier: 'free' | 'lite' | 'full' | null) => {
    if (newTier !== userTier) {
      console.log('🎯 User tier changed:', { from: userTier, to: newTier });
      setUserTier(newTier);
    }
  };
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 🔥 NEW: Activity Timer State
  const [activityState, setActivityState] = useState<ActivityState | null>(null);
  const [showFullAppLockout, setShowFullAppLockout] = useState(false);
  const [showWorkspaceLockout, setShowWorkspaceLockout] = useState(false);
  
  // 🚀 NEW: User Profile State
  const [userProfile, setUserProfile] = useState<{
    id: string;
    full_name: string | null;
    preferred_name: string | null;
    school: string | null;
    year: number | null;
    email: string | null;
    avatar_url?: string | null;
  } | null>(null);
  
  // Activity Timer Implementation (inline)
  const activityTimer = {
    state: { isActive: true, timeRemaining: 2 * 60 * 60 * 1000 }, // 2 hours default
    listeners: new Set<any>(),
    addListener: (listener: any) => activityTimer.listeners.add(listener),
    removeListener: (listener: any) => activityTimer.listeners.delete(listener),
    getState: () => activityTimer.state,
    isExpired: () => activityTimer.state.timeRemaining <= 0,
    isLockedOut: () => activityTimer.state.timeRemaining <= 0,
    setUserTier: (tier: 'free' | 'lite' | 'full') => {
      const durations = { 'free': 2 * 60 * 60 * 1000, 'lite': 4 * 60 * 60 * 1000, 'full': 8 * 60 * 60 * 1000 };
      activityTimer.state.timeRemaining = durations[tier];
    },
    formatTimeRemaining: () => {
      const minutes = Math.floor(activityTimer.state.timeRemaining / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  // Create proper subscription service instance that queries the database
  const createSubscriptionService = () => {
    return {
      checkUsageBeforeAction: async (userId: string, model: string = 'gpt-4o-mini', estimatedTokens: number = 100): Promise<UsageCheck> => {
        const tierLimits = { 'free': 10, 'lite': 50, 'full': 200 };
        const currentTier = userTier || 'free';
        return {
          success: true,
          canProceed: true,
          currentSpendGBP: 0,
          monthlyLimitGBP: tierLimits[currentTier],
          remainingGBP: tierLimits[currentTier],
          remainingTokens: 10000,
          tier: currentTier
        };
      },
      recordUsage: async (userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void> => {
        // Basic implementation - could be enhanced to actually record to database
        console.log(`Usage recorded: ${inputTokens + outputTokens} tokens for user ${userId}`);
      },
      checkAccess: async (userId: string, accessType: 'dashboard' | 'workspace') => {
        return { hasAccess: true, lockoutType: 'none' as const };
      },
      updateUserTier: async (userId: string, newTier: 'free' | 'lite' | 'full'): Promise<boolean> => {
        // Update in database
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ user_tier: newTier })
            .eq('id', userId);
          
          if (error) {
            console.error('Failed to update user tier in database:', error);
            return false;
          }
          
          setUserTierSafe(newTier);
          return true;
        } catch (error) {
          console.error('Error updating user tier:', error);
          return false;
        }
      }
    };
  };
  
  const subscriptionService = createSubscriptionService();

  // Federated Auth Service (basic implementation)
  const federatedAuthService = {
    signIn: (user: User, session: Session, tier: string) => {
      console.log('Federated auth: User signed in');
    },
    signOut: () => {
      console.log('Federated auth: User signed out');
    },
    signInDemo: () => {
      console.log('Federated auth: Demo mode activated');
    }
  };

  useEffect(() => {
    // Federated auth is already initialized via direct import
    
    // 🔥 EXPLICIT URL TOKEN PROCESSING - Fix for email verification
    const handleUrlTokens = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        console.log('🔍 Processing URL authentication tokens...');
        try {
          // First, let Supabase handle the URL tokens
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session && !error) {
            console.log('✅ URL tokens processed successfully!', session.user.id);
            setSession(session);
            setUser(session.user);
            userPreferencesService.setUser(session.user);
            loadUserTier(session.user.id);
            
            // Clear the URL hash after processing
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('🧹 URL hash cleared after processing tokens');
            return;
          }
          
          // If getSession() didn't work, force Supabase to process URL
          console.log('🔄 Forcing Supabase to process URL tokens...');
          await supabase.auth.refreshSession();
          
          // Try again after forcing refresh
          const { data: { session: newSession }, error: newError } = await supabase.auth.getSession();
          if (newSession && !newError) {
            console.log('✅ URL tokens processed after refresh!', newSession.user.id);
            setSession(newSession);
            setUser(newSession.user);
            userPreferencesService.setUser(newSession.user);
            loadUserTier(newSession.user.id);
            
            // Clear the URL hash after processing
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('🧹 URL hash cleared after processing tokens');
          } else {
            console.error('❌ Still no session after refresh:', newError);
          }
        } catch (err) {
          console.error('❌ Failed to process URL tokens:', err);
        }
      }
    };

    // Process URL tokens immediately
    handleUrlTokens();
    
    // 🔥 Listen for hash changes (in case tokens come in later)
    const handleHashChange = () => {
      console.log('🔍 Hash changed, checking for auth tokens...');
      handleUrlTokens();
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    // 🔥 Initialize Activity Timer Service
    const initializeActivityTimer = () => {
      // Set up timer listener
      const timerListener = {
        onTick: (state: ActivityState) => {
          setActivityState(state);
        },
        onExpired: () => {
          console.log('⏰ Timer expired - showing full app lockout');
          setShowFullAppLockout(true);
        },
        onPaused: () => {
          console.log('⏸️ Timer paused due to inactivity');
        },
        onResumed: () => {
          console.log('▶️ Timer resumed after activity');
        }
      };
      
      activityTimer.addListener(timerListener);
      setActivityState(activityTimer.getState());
      
      // Cleanup function
      return () => {
        activityTimer.removeListener(timerListener);
      };
    };
    
    const cleanupTimer = initializeActivityTimer();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle initial session
      if (session?.user) {
        console.log('🔑 Initial session found:', session.user.id);
        setSession(session);
        setUser(session.user);
        userPreferencesService.setUser(session.user);
        loadUserTier(session.user.id);
        refreshUserProfile(); // Load user profile on initial auth
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, 'User ID:', session?.user?.id);
      
      // Only handle specific events to prevent unnecessary state updates
      switch (event) {
        case 'SIGNED_OUT':
          console.log('👋 User signed out');
          clearUserData();
          break;
          
        case 'SIGNED_IN':
          console.log('🔑 User signed in');
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            userPreferencesService.setUser(session.user);
            loadUserTier(session.user.id);
            refreshUserProfile(); // Load user profile on sign in
          }
          break;
          
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed - preserving session');
          if (session?.user) {
            setSession(session);
            // Don't update other state to prevent unnecessary re-renders
          }
          break;
          
        case 'USER_UPDATED':
          console.log('👤 User updated');
          if (session?.user) {
            setUser(session.user);
            userPreferencesService.setUser(session.user);
            refreshUserProfile(); // Refresh profile on user update
          }
          break;
      }
      
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
      // 🔥 Cleanup timer
      if (cleanupTimer) {
        cleanupTimer();
      }
    };
  }, []);

  // 🔥 Update timer when user tier changes
  useEffect(() => {
    if (userTier) {
      activityTimer.setUserTier(userTier);
      console.log(`⚙️ Timer updated for tier: ${userTier}`);
    }
  }, [userTier]);

  const migrateUserData = async (user: User) => {
    try {
      // Check if user has already migrated their data FIRST - before touching localStorage
      const hasMigrated = await userPreferencesService.getPreference('data_migrated');
      console.log('Migration check for user:', user.id, 'Has migrated:', hasMigrated);
      
      if (!hasMigrated) {
        console.log('Starting data migration for user:', user.id);
        
        // Migrate data FROM localStorage TO Supabase (preserving localStorage during migration)
        await userPreferencesService.migrateFromLocalStorage();
        
        // Mark migration as complete
        await userPreferencesService.setPreference('data_migrated', true);
        
        // Only AFTER successful migration, clear localStorage to prevent data loss
        const keysToClear = [
          'starredAthros',
          'selectedAthros', 
          'athroConfidence',
          'athroPriorities',
          'subjectConfidence',
          'athroCalendarEvents',
          'studentAvailability',
          'selectedWeekType',
          'isFullDay'
        ];
        
        keysToClear.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log('Cleared localStorage key after successful migration:', key);
          }
        });
        
        console.log('Data migration completed for user:', user.id);
      } else {
        console.log('User already migrated data - preserving any remaining localStorage for cross-app compatibility:', user.id);
        // For users who already migrated, don't clear localStorage as it might be needed for cross-app communication
      }
    } catch (error) {
      console.error('Failed to migrate user data:', error);
      // CRITICAL: Don't clear localStorage on migration error - preserve user's data!
      console.log('Preserving localStorage data due to migration error');
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔥 DEMO DEBUG: SignIn function called!', { email, password: password.substring(0, 5) + '***' });
    console.log('🔐 SignIn attempt:', { email, isDemo: email === 'alex.demo@athro.app' });
    
    // CRITICAL: Check demo credentials FIRST before any Supabase calls
    // EXACT STRING COMPARISON for demo credentials
    if (email === 'alex.demo@athro.app' && password === 'AthroDemo2024!') {
      console.log('🎭 Demo credentials matched - enabling demo mode...');
      
      // Enable demo mode and simulate successful login
      demoDataService.enableDemoMode();
      console.log('🎭 Demo mode enabled, creating mock user...');
      
      // Create a mock user object for demo mode
      const mockUser = {
        id: 'demo-user-123',
        email: 'alex.demo@athro.app',
        user_metadata: {
          full_name: 'Alex Thompson',
          preferred_name: 'Alex',
          school: 'Westfield Academy',
          year: 11
        },
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-09-15T10:30:00Z',
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        identities: [],
        factors: [],
        is_anonymous: false
      };
      
      // Create a mock session
      const mockSession = {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      };
      
      console.log('🎭 Setting demo user and session...');
      
      // Set the mock user and session
      setUser(mockUser as any);
      setSession(mockSession as any);
      setUserTier('full');
      setLoading(false);
      
      // Set user in preferences service
      userPreferencesService.setUser(mockUser);
      
      // 🔥 CRITICAL: Notify federated auth service for cross-app authentication
      if (federatedAuthService) {
        console.log('🌐 Broadcasting demo auth to all federation apps...');
        federatedAuthService.signInDemo();
      }
      
      console.log('✅ Demo login successful for Alex Thompson!');
      return;
    }
    
    console.log('🔐 Attempting regular Supabase authentication...');
    // Regular Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('❌ Supabase auth error:', error);
      throw error;
    }
    
    // Notify federated auth service for cross-app authentication
    if (federatedAuthService && data.user && data.session) {
      console.log('🌐 Broadcasting regular auth to all federation apps...');
      federatedAuthService.signIn(data.user, data.session, 'free');
    }
    
    console.log('✅ Supabase authentication successful');
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    // Check if in demo mode
    if (demoDataService.isDemoModeEnabled()) {
      // Disable demo mode and clear demo data
      demoDataService.disableDemoMode();
      clearUserData();
      
      // 🔥 CRITICAL: Broadcast sign out to all federation apps
      if (federatedAuthService) {
        console.log('🌐 Broadcasting demo sign out to all federation apps...');
        federatedAuthService.signOut();
      }
      
      console.log('🎭 Demo mode signed out');
      return;
    }
    
    // Clear user data before signing out
    clearUserData();
    
    // 🔥 CRITICAL: Broadcast sign out to all federation apps
    if (federatedAuthService) {
      console.log('🌐 Broadcasting sign out to all federation apps...');
      federatedAuthService.signOut();
    }
    
    await supabase.auth.signOut();
  };

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  };

  const clearUserData = () => {
    console.log('Clearing all user data for security...');
    
    // CRITICAL SECURITY FIX: Clear demo mode when clearing user data
    demoDataService.disableDemoMode();
    localStorage.removeItem('demo_mode_enabled');
    
    // Clear any cached data when user logs out
    setUser(null);
    setSession(null);
    setUserTier(null);
    setSubscription(null);
    setUserProfile(null); // Clear user profile
    userPreferencesService.setUser(null);
    
    // Clear any localStorage data that might still exist
    const keysToClear = [
      'starredAthros',
      'selectedAthros', 
      'athroConfidence',
      'athroPriorities',
      'subjectConfidence',
      'athroCalendarEvents',
      'studentAvailability',
      'selectedWeekType',
      'isFullDay',
      'athro-user-id',
      'athro-selection-athro-dashboard',
      'athro-selection-calendar',
      'athro-selection-onboarding',
      'finalAthros',
      'athro_workspace_confidence_levels',
      'athro_workspace_selected_athros',
      'user_preferences',
      'data_migrated',
      'demo_mode_enabled' // SECURITY: Always clear demo mode flag
    ];
    
    keysToClear.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear any other localStorage keys that might contain user data
    // BUT preserve workspace chat sessions as they have their own user-specific storage
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if ((key.includes('athro') || key.includes('user') || key.includes('calendar') || key.includes('profile') || key.includes('settings') || key.includes('demo')) &&
          !key.includes('athro_chat_session_') && // PRESERVE workspace chat sessions
          !key.includes('temp_note_') && // PRESERVE workspace note drafts
          !key.includes('anonymous_user_id')) { // PRESERVE anonymous user fallback
        localStorage.removeItem(key);
        console.log('Cleared localStorage key on logout:', key);
      }
    });
    
    // Dispatch event to notify all components to clear their state
    window.dispatchEvent(new CustomEvent('athro-user-cleared', {
      detail: { timestamp: Date.now() }
    }));
    
    console.log('User data completely cleared for security');
  };

  const loadUserTier = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      console.warn('🚨 [AuthContext] No user ID available for loading tier');
      setUserTierSafe('free');
      return;
    }

    try {
      console.log('🔍 [AuthContext] Loading user tier for:', targetUserId);
      
      // First, load subscription data from Stripe to ensure it's in sync
      await loadUserSubscription(targetUserId);
      
      // Then load the tier from the database
      const { data, error } = await supabase
        .from('profiles')
        .select('user_tier, email, id, updated_at, stripe_customer_id')
        .eq('id', targetUserId)
        .single();
      
      console.log('🔍 [AuthContext] Database response:', { data, error });
      
      if (error) {
        console.error('🚨 [AuthContext] Database error:', error);
        setUserTierSafe('free');
        return;
      }
      
      if (data) {
        // Use the tier enforcement check
        const enforcedTier = await enforceTierAccess(
          supabase,
          targetUserId,
          data.user_tier || 'free',
          data.stripe_customer_id
        );

        console.log('🎯 [AuthContext] Profile data:', {
          enforcedTier,
          databaseTier: data.user_tier,
          email: data.email,
          id: data.id,
          lastUpdated: data.updated_at,
          hasStripeCustomer: !!data.stripe_customer_id
        });
        
        // Log tier change if different
        if (enforcedTier !== data.user_tier) {
          await logTierChange(
            supabase,
            targetUserId,
            data.user_tier,
            enforcedTier,
            'subscription_sync',
            {
              reason: 'Tier enforcement check',
              stripeCustomerId: data.stripe_customer_id
            }
          );
        }
        
        setUserTierSafe(enforcedTier);
        console.log('✅ [AuthContext] User tier set successfully to:', enforcedTier);
      } else {
        console.warn('🚨 [AuthContext] No profile found');
        setUserTierSafe('free');
      }
    } catch (error) {
      console.error('🚨 [AuthContext] Error loading user tier:', error);
      setUserTierSafe('free');
    }
  };

  const enableDemoMode = () => {
    demoDataService.enableDemoMode();
    
    // Create mock user and session for demo mode
    const mockUser = {
      id: 'demo-user-123',
      email: 'alex.demo@athro.app',
      user_metadata: {
        full_name: 'Alex Thompson',
        preferred_name: 'Alex',
        school: 'Westfield Academy',
        year: 11
      },
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2024-09-15T10:30:00Z',
      updated_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      identities: [],
      factors: [],
      is_anonymous: false
    };
    
    const mockSession = {
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockUser
    };
    
    // Set the mock user and session
    setUser(mockUser as any);
    setSession(mockSession as any);
    setUserTier('full');
    userPreferencesService.setUser(mockUser);
    
    console.log('🎭 Demo mode enabled with Alex Thompson profile');
  };

  const disableDemoMode = () => {
    demoDataService.disableDemoMode();
    clearUserData();
    console.log('🎭 Demo mode disabled');
  };

  const isDemoMode = () => {
    // CRITICAL SECURITY FIX: Never allow demo mode when a real user is authenticated
    if (user && user.email && !user.email.includes('demo')) {
      console.log('🔒 Real user authenticated - demo mode forced OFF for security');
      demoDataService.disableDemoMode();
      localStorage.removeItem('demo_mode_enabled');
      return false;
    }
    return demoDataService.isDemoModeEnabled();
  };

  // New subscription methods
  const checkUsage = async (estimatedTokens: number = 100): Promise<UsageCheck> => {
    if (!user) {
      return {
        success: false,
        canProceed: false,
        error: 'User not authenticated',
        currentSpendGBP: 0,
        monthlyLimitGBP: 0,
        remainingGBP: 0,
        remainingTokens: 0,
        tier: 'free'
      };
    }
    return subscriptionService.checkUsageBeforeAction(user.id, 'gpt-4o-mini', estimatedTokens);
  };

  const updateUsage = async (inputTokens: number = 0, outputTokens: number = 0): Promise<UsageCheck> => {
    if (!user) {
      return {
        success: false,
        canProceed: false,
        error: 'User not authenticated',
        currentSpendGBP: 0,
        monthlyLimitGBP: 0,
        remainingGBP: 0,
        remainingTokens: 0,
        tier: 'free'
      };
    }
    await subscriptionService.recordUsage(user.id, 'gpt-4o-mini', inputTokens, outputTokens);
    return checkUsage(0); // Get updated usage
  };

  const checkAccess = async (accessType: 'dashboard' | 'workspace') => {
    if (!user) {
      return { hasAccess: false, reason: 'User not authenticated' };
    }
    return subscriptionService.checkAccess(user.id, accessType);
  };

  const updateUserTier = async (newTier: 'free' | 'lite' | 'full'): Promise<boolean> => {
    if (!user) return false;
    
    const success = await subscriptionService.updateUserTier(user.id, newTier);
    if (success) {
      // Reload subscription data to get updated info from database
      await loadUserSubscription(user.id);
    }
    return success;
  };

  // Load subscription data
  const loadUserSubscription = async (userId: string) => {
    try {
      console.log('🔄 [AuthContext] Loading subscription data for:', userId);
      
      // FIXED: Query database directly instead of using broken inline subscription service
      const { data, error } = await supabase
        .from('profiles')
        .select('user_tier, spent_today_gbp, last_activity_reset_date, stripe_customer_id, stripe_subscription_id')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('🚨 [AuthContext] Error loading subscription from database:', error);
        return;
      }
      
      if (data) {
        const tierLimits = { 'free': 10, 'lite': 50, 'full': 200 };
        const currentTier = data.user_tier || 'free';
        
        const subscriptionData = {
          tier: currentTier as 'free' | 'lite' | 'full',
          spentThisMonthGBP: data.spent_today_gbp || 0,
          monthlyLimitGBP: tierLimits[currentTier as keyof typeof tierLimits],
          remainingGBP: tierLimits[currentTier as keyof typeof tierLimits] - (data.spent_today_gbp || 0),
          lastActivityResetDate: data.last_activity_reset_date || new Date().toISOString().substring(0, 7) + '-01',
          stripeCustomerId: data.stripe_customer_id,
          stripeSubscriptionId: data.stripe_subscription_id
        };

        console.log('✅ [AuthContext] Subscription data loaded from database:', {
          tier: subscriptionData.tier,
          spentThisMonthGBP: subscriptionData.spentThisMonthGBP,
          lastActivityResetDate: subscriptionData.lastActivityResetDate,
          hasStripeCustomer: !!data.stripe_customer_id
        });
        
        setSubscription(subscriptionData);
        
        // Only update tier if different from what we have
        if (subscriptionData.tier !== userTier) {
          console.log('🔄 [AuthContext] Updating tier from database subscription:', subscriptionData.tier);
          setUserTierSafe(subscriptionData.tier);
        }
      } else {
        console.log('ℹ️ [AuthContext] No subscription data found in database');
      }
    } catch (error) {
      console.error('🚨 [AuthContext] Error loading subscription:', error);
    }
  };

  // 🔥 NEW: Timer Methods
  const formatTimeRemaining = (): string => {
    return activityTimer.formatTimeRemaining();
  };

  const isTimerExpired = (): boolean => {
    return activityTimer.isLockedOut();
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, preferred_name, school, year, email, avatar_url')
        .eq('id', user.id)
        .single();
        
      if (!error && profile) {
        setUserProfile({
          id: profile.id,
          full_name: profile.full_name,
          preferred_name: profile.preferred_name,
          school: profile.school,
          year: profile.year,
          email: profile.email,
          avatar_url: profile.avatar_url
        });
        console.log('✅ User profile refreshed:', profile);
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const value = {
    user,
    session,
    userTier,
    subscription,
    loading,
    // 🔥 NEW: Activity Timer State
    activityState,
    // 🚀 NEW: User Profile State
    userProfile,
    signIn,
    signUp,
    signOut,
    signInAnonymously,
    clearUserData,
    isFullTierUser: () => userTier === 'full',
    loadUserTier,
    enableDemoMode,
    disableDemoMode,
    isDemoMode,
    checkUsage,
    updateUsage,
    checkAccess,
    updateUserTier,
    formatTimeRemaining,
    isTimerExpired,
    showFullAppLockout,
    showWorkspaceLockout,
    // 🚀 NEW: Profile update method
    refreshUserProfile
  };

  // Listen for auth state requests from embedded workspace
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REQUEST_AUTH_STATE') {
        console.log('🔗 [Dashboard Auth] Received auth state request from embedded workspace');
        
        // Send auth state to embedded workspace
        const authState = {
          type: 'AUTH_STATE_RESPONSE',
          user,
          session,
          isDemoMode: isDemoMode(),
          userTier,
          timestamp: Date.now()
        };
        
        // Send to all frames (workspace could be in any frame)
        if (event.source) {
          (event.source as Window).postMessage(authState, '*');
        }
        console.log('🔗 [Dashboard Auth] Sent auth state to embedded workspace:', { 
          hasUser: !!user, 
          userEmail: user?.email, 
          tier: userTier 
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [user, session, userTier]);

  // EMERGENCY FIX: If demo mode is active but real user is authenticated, fix immediately
  React.useEffect(() => {
    if (user && user.email && !user.email.includes('demo') && demoDataService.isDemoModeEnabled()) {
      console.error('🚨 CRITICAL SECURITY ISSUE DETECTED: Demo mode active with real user!');
      console.log('🔒 Real user:', user.email);
      console.log('🎭 Demo mode enabled:', demoDataService.isDemoModeEnabled());
      
      // Immediately disable demo mode and reload
      demoDataService.disableDemoMode();
      localStorage.removeItem('demo_mode_enabled');
      
      console.log('🔧 EMERGENCY FIX APPLIED: Demo mode disabled, reloading...');
      window.location.reload();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Add tier change logging table
const logTierChange = async (
  supabase: any,
  userId: string,
  oldTier: string | null,
  newTier: 'free' | 'lite' | 'full',
  source: 'stripe' | 'database' | 'subscription_sync',
  metadata?: any
) => {
  try {
    await supabase
      .from('tier_change_logs')
      .insert({
        user_id: userId,
        old_tier: oldTier,
        new_tier: newTier,
        source,
        metadata: JSON.stringify(metadata),
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log tier change:', error);
  }
};

// Add tier enforcement constants
const TIER_ACCESS = {
  free: {
    maxDailySpendGBP: 0.066,
    hasWorkspaceAccess: true,
    hasDashboardAccess: true,
    features: ['workspace_basic', 'dashboard_basic'],
    description: 'Free trial with limited access'
  },
  lite: {
    maxDailySpendGBP: 0.33,
    hasWorkspaceAccess: true,
    hasDashboardAccess: false,
    features: ['workspace_full'],
    description: 'Full workspace access only'
  },
  full: {
    maxDailySpendGBP: 0.66,
    hasWorkspaceAccess: true,
    hasDashboardAccess: true,
    features: ['workspace_full', 'dashboard_full', 'insights', 'uploads'],
    description: 'Full access to all features'
  }
} as const;

// Add safety check for tier enforcement
const enforceTierAccess = async (
  supabase: any,
  userId: string,
  currentTier: 'free' | 'lite' | 'full' | null,
  stripeCustomerId?: string
): Promise<'free' | 'lite' | 'full'> => {
  // If user has Stripe customer ID, verify subscription
  if (stripeCustomerId) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('stripe_customer_id', stripeCustomerId)
      .eq('status', 'active')
      .single();

    if (subscription?.status === 'active' && (subscription.tier === 'lite' || subscription.tier === 'full')) {
      // CRITICAL: Never downgrade an active paid subscription
      if (currentTier === 'free') {
        console.warn('🚨 Active subscription found but tier was free - correcting to:', subscription.tier);
        await logTierChange(supabase, userId, currentTier, subscription.tier, 'subscription_sync', {
          stripeCustomerId,
          subscriptionStatus: subscription.status
        });
        return subscription.tier;
      }
      return subscription.tier;
    }
  }

  return currentTier || 'free';
}; 