/**
 * Federated Authentication Service
 * 
 * Manages authentication state across all applications in the athro federation.
 * Uses the event bus to broadcast auth changes and keep all apps in sync.
 */

import { Session, User } from '@supabase/supabase-js';
import { eventBus } from './eventBus';

export interface FederatedUser extends User {
  // Additional user properties for federation
  isDemoUser?: boolean;
  demoProfile?: {
    full_name: string;
    preferred_name: string;
    school: string;
    year: number;
  };
}

export interface FederatedSession extends Session {
  user: FederatedUser;
  isDemoSession?: boolean;
}

export interface AuthState {
  user: FederatedUser | null;
  session: FederatedSession | null;
  loading: boolean;
  isDemoMode: boolean;
  userTier: 'free' | 'lite' | 'full' | null;
}

export class FederatedAuthService {
  private static instance: FederatedAuthService;
  private currentState: AuthState = {
    user: null,
    session: null,
    loading: true,
    isDemoMode: false,
    userTier: null
  };
  private listeners: Array<(state: AuthState) => void> = [];

  private constructor() {
    // Listen for auth events from other apps
    eventBus.on('auth.stateChanged', this.handleRemoteAuthChange.bind(this));
    eventBus.on('auth.demoModeToggled', this.handleDemoModeToggle.bind(this));
    eventBus.on('auth.signOut', this.handleRemoteSignOut.bind(this));
    
    // Initialize from localStorage on startup
    this.initializeFromStorage();
  }

  public static getInstance(): FederatedAuthService {
    if (!FederatedAuthService.instance) {
      FederatedAuthService.instance = new FederatedAuthService();
    }
    return FederatedAuthService.instance;
  }

  // Initialize auth state from localStorage
  private initializeFromStorage(): void {
    try {
      const storedAuth = localStorage.getItem('athro_federated_auth');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        this.currentState = {
          ...this.currentState,
          ...authData,
          loading: false
        };
        console.log('[FederatedAuth] Initialized from storage:', this.currentState);
      } else {
        this.currentState.loading = false;
      }
    } catch (error) {
      console.error('[FederatedAuth] Error initializing from storage:', error);
      this.currentState.loading = false;
    }
  }

  // Get current auth state
  public getState(): AuthState {
    return { ...this.currentState };
  }

  // Subscribe to auth state changes
  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current state
    listener(this.getState());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Update auth state and broadcast to all apps
  public updateAuthState(newState: Partial<AuthState>, broadcast: boolean = true): void {
    const previousState = { ...this.currentState };
    this.currentState = { ...this.currentState, ...newState };
    
    // Save to localStorage for persistence
    this.saveToStorage();
    
    // Notify local listeners
    this.notifyListeners();
    
    // Broadcast to other apps if requested
    if (broadcast) {
      eventBus.emit('auth.stateChanged', this.currentState);
      console.log('[FederatedAuth] Broadcasted state change:', this.currentState);
    }
  }

  // Handle authentication success (regular or demo)
  public signIn(user: FederatedUser, session: FederatedSession, userTier: 'free' | 'lite' | 'full' = 'free'): void {
    console.log('[FederatedAuth] Sign in:', user.email, 'isDemoUser:', user.isDemoUser);
    
    this.updateAuthState({
      user,
      session,
      loading: false,
      isDemoMode: user.isDemoUser || false,
      userTier
    });
  }

  // Handle demo mode authentication
  public signInDemo(): void {
    console.log('[FederatedAuth] Demo sign in');
    
    const mockUser: FederatedUser = {
      id: 'demo-user-123',
      email: 'alex.demo@athro.app',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2024-09-15T10:30:00Z',
      updated_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {
        full_name: 'Alex Thompson',
        preferred_name: 'Alex',
        school: 'Westfield Academy',
        year: 11
      },
      identities: [],
      factors: [],
      is_anonymous: false,
      isDemoUser: true,
      demoProfile: {
        full_name: 'Alex Thompson',
        preferred_name: 'Alex',
        school: 'Westfield Academy',
        year: 11
      }
    };

    const mockSession: FederatedSession = {
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockUser,
      isDemoSession: true
    };

    this.signIn(mockUser, mockSession, 'lite');
    
    // Also enable demo mode flag
    localStorage.setItem('demo_mode_enabled', 'true');
    eventBus.emit('auth.demoModeToggled', true);
  }

  // Handle sign out
  public signOut(): void {
    console.log('[FederatedAuth] Sign out');
    
    this.updateAuthState({
      user: null,
      session: null,
      loading: false,
      isDemoMode: false,
      userTier: null
    });
    
    // Clear demo mode
    localStorage.removeItem('demo_mode_enabled');
    
    // Broadcast sign out event
    eventBus.emit('auth.signOut');
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!(this.currentState.user && this.currentState.session);
  }

  // Check if in demo mode
  public isDemoMode(): boolean {
    return this.currentState.isDemoMode || this.currentState.user?.isDemoUser || false;
  }

  // Handle remote auth changes from other apps
  private handleRemoteAuthChange(remoteState: AuthState): void {
    console.log('[FederatedAuth] Received remote auth change:', remoteState);
    
    // Update local state without re-broadcasting
    this.currentState = { ...remoteState };
    this.saveToStorage();
    this.notifyListeners();
  }

  // Handle demo mode toggle from other apps
  private handleDemoModeToggle(isDemoMode: boolean): void {
    console.log('[FederatedAuth] Remote demo mode toggle:', isDemoMode);
    
    if (isDemoMode) {
      localStorage.setItem('demo_mode_enabled', 'true');
    } else {
      localStorage.removeItem('demo_mode_enabled');
    }
    
    this.updateAuthState({ isDemoMode }, false); // Don't re-broadcast
  }

  // Handle remote sign out
  private handleRemoteSignOut(): void {
    console.log('[FederatedAuth] Remote sign out received');
    
    this.currentState = {
      user: null,
      session: null,
      loading: false,
      isDemoMode: false,
      userTier: null
    };
    
    this.saveToStorage();
    this.notifyListeners();
    
    // Clear demo mode
    localStorage.removeItem('demo_mode_enabled');
  }

  // Save current state to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem('athro_federated_auth', JSON.stringify(this.currentState));
    } catch (error) {
      console.error('[FederatedAuth] Error saving to storage:', error);
    }
  }

  // Notify all local listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('[FederatedAuth] Error in auth listener:', error);
      }
    });
  }

  // Force sync with other apps (useful for initialization)
  public requestSync(): void {
    eventBus.emit('auth.syncRequest');
  }

  // Update user tier
  public updateUserTier(tier: 'free' | 'lite' | 'full'): void {
    this.updateAuthState({ userTier: tier });
  }
}

export default FederatedAuthService; 