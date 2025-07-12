import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import ChatSessionService from '../services/ChatSessionService';
import UserService from '../services/UserService';

// Simple cross-app auth communication using localStorage and events
const FEDERATED_AUTH_KEY = 'athro_federated_auth';

const checkFederatedAuth = () => {
  try {
    const storedAuth = localStorage.getItem(FEDERATED_AUTH_KEY);
    return storedAuth ? JSON.parse(storedAuth) : null;
  } catch (error) {
    console.error('[Workspace Auth] Error reading federated auth:', error);
    return null;
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Check if we're embedded in the dashboard
      const isEmbedded = (window as any).__ATHRO_EMBEDDED_MODE__ || false;
      
      console.log('🔗 [Workspace Auth] Initializing auth, embedded mode:', isEmbedded);
      
      if (isEmbedded) {
        console.log('🔗 [Workspace Auth] Embedded mode detected - attempting to inherit dashboard auth');
        
        // Try to get authentication from parent window's context
        try {
          // First, try to get auth from localStorage immediately (faster)
          const federatedAuthState = checkFederatedAuth();
          if (federatedAuthState && federatedAuthState.timestamp && (Date.now() - federatedAuthState.timestamp) < 300000) { // 5 minutes
            console.log('🔗 [Workspace Auth] Found fresh federated auth in localStorage:', federatedAuthState);
            setUser(federatedAuthState.user);
            setSession(federatedAuthState.session);
            setIsDemoMode(federatedAuthState.isDemoMode || false);
            setLoading(false);
            
            // Initialize user services
            if (federatedAuthState.user.id !== (globalThis as any).currentUserId) {
              ChatSessionService.clearUserCache();
              UserService.getInstance().clearCache();
              (globalThis as any).currentUserId = federatedAuthState.user.id;
            }
            
            return; // Success via localStorage
          }
          
          // If localStorage auth is stale, try postMessage
          console.log('🔗 [Workspace Auth] No fresh localStorage auth, requesting from parent...');
          
          // Use postMessage to request auth state from parent
          window.parent.postMessage({ type: 'REQUEST_AUTH_STATE' }, '*');
          
          // Listen for auth state response
          const handleAuthResponse = (event: MessageEvent) => {
            if (event.data.type === 'AUTH_STATE_RESPONSE') {
              console.log('🔗 [Workspace Auth] Received auth state from dashboard:', event.data);
              
              if (event.data.user && event.data.session) {
                setUser(event.data.user);
                setSession(event.data.session);
                setIsDemoMode(event.data.isDemoMode || false);
                setLoading(false);
                
                // Initialize user services
                if (event.data.user.id !== (globalThis as any).currentUserId) {
                  ChatSessionService.clearUserCache();
                  UserService.getInstance().clearCache();
                  (globalThis as any).currentUserId = event.data.user.id;
                }
                
                // Remove listener after successful auth
                window.removeEventListener('message', handleAuthResponse);
                return;
              } else {
                console.log('🔗 [Workspace Auth] No user data in auth response, falling back to normal auth');
                window.removeEventListener('message', handleAuthResponse);
                proceedWithNormalAuth();
              }
            }
          };
          
          window.addEventListener('message', handleAuthResponse);
          
          // Shorter timeout for embedded mode - if parent doesn't respond quickly, fall back
          setTimeout(() => {
            window.removeEventListener('message', handleAuthResponse);
            console.log('🔗 [Workspace Auth] No auth response from parent within timeout, proceeding with normal auth');
            proceedWithNormalAuth();
          }, 1000); // Reduced from 2000ms to 1000ms
          
          return; // Exit early for embedded mode
        } catch (error) {
          console.error('🔗 [Workspace Auth] Error communicating with parent:', error);
          proceedWithNormalAuth();
        }
      } else {
        console.log('🔗 [Workspace Auth] Not in embedded mode, proceeding with normal auth');
      }
      
      // Fall through to normal auth initialization
      proceedWithNormalAuth();
    };

    const proceedWithNormalAuth = async () => {
      // 🔥 PRODUCTION-READY FEDERATED AUTH SOLUTION
      // Step 1: Check URL parameters for auth token from dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const authType = urlParams.get('auth_type');
      const timestamp = urlParams.get('timestamp');
      
      // Only process URL auth if it's recent (within 10 seconds)
      const isRecentAuth = timestamp && (Date.now() - parseInt(timestamp)) < 10000;
      
      if (authType && isRecentAuth) {
        console.log('🌐 [Workspace Auth] Processing federated auth from URL:', authType);
        
        if (authType === 'demo') {
          // Handle demo auth from URL
          const demoUser = {
            id: urlParams.get('user_id') || 'demo_alex_thompson',
            email: urlParams.get('user_email') || 'alex.demo@athro.app',
            user_metadata: {
              full_name: urlParams.get('user_name') || 'Alex Thompson',
              preferred_name: urlParams.get('preferred_name') || 'Alex'
            }
          };
          
          const demoSession = {
            user: demoUser,
            access_token: 'demo_token',
            expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
          
          console.log('🎭 [Workspace Auth] Demo user authenticated from URL');
          setUser(demoUser as any);
          setSession(demoSession as any);
          setIsDemoMode(true);
          setLoading(false);
          
          // Clear URL params after processing
          window.history.replaceState({}, '', window.location.pathname);
          
          // Initialize user services
          ChatSessionService.clearUserCache();
          UserService.getInstance().clearCache();
          
          return;
        }
        
        if (authType === 'token') {
          const accessToken = urlParams.get('access_token');
          const userId = urlParams.get('user_id');
          const userEmail = urlParams.get('user_email');
          
          if (accessToken && userId) {
            try {
              console.log('🔐 [Workspace Auth] Validating token from URL...');
              
              // Validate token with Supabase
              const { data: { user }, error } = await supabase.auth.getUser(accessToken);
              
              if (user && !error) {
                console.log('✅ [Workspace Auth] Token validated successfully');
                
                const validatedSession = {
                  user,
                  access_token: accessToken,
                  expires_at: Date.now() + (60 * 60 * 1000) // 1 hour
                };
                
                setUser(user);
                setSession(validatedSession as any);
                setIsDemoMode(false);
                setLoading(false);
                
                // Clear URL params after processing
                window.history.replaceState({}, '', window.location.pathname);
                
                // Initialize user services
                if (user.id !== (globalThis as any).currentUserId) {
                  ChatSessionService.clearUserCache();
                  UserService.getInstance().clearCache();
                  (globalThis as any).currentUserId = user.id;
                }
                
                return;
              } else {
                console.error('❌ [Workspace Auth] Token validation failed:', error);
              }
            } catch (tokenError) {
              console.error('❌ [Workspace Auth] Error validating token:', tokenError);
            }
          }
        }
        
        // If we get here, URL auth failed - fall through to regular auth
        console.log('⚠️ [Workspace Auth] URL auth failed, falling back to regular auth');
      }
      
      // Step 2: Check for existing federated auth in localStorage
      const federatedAuthState = checkFederatedAuth();
      if (federatedAuthState && federatedAuthState.timestamp && (Date.now() - federatedAuthState.timestamp) < 300000) { // 5 minutes
        console.log('[Workspace Auth] Found federated auth state:', federatedAuthState);
        setUser(federatedAuthState.user);
        setSession(federatedAuthState.session);
        setIsDemoMode(federatedAuthState.isDemoMode || false);
        setLoading(false);
        return;
      } else {
        console.log('[Workspace Auth] No federated auth found, initializing Supabase auth');
      }
      
      // Step 3: Regular Supabase authentication
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          // Initialize user services for regular auth
          if (session.user.id !== (globalThis as any).currentUserId) {
            ChatSessionService.clearUserCache();
            UserService.getInstance().clearCache();
            (globalThis as any).currentUserId = session.user.id;
          }
        }
      } catch (error) {
        console.error('[Workspace Auth] Error getting session:', error);
        setLoading(false);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FEDERATED_AUTH_KEY && event.newValue) {
        try {
          const newAuthState = JSON.parse(event.newValue);
          console.log('[Workspace Auth] Federated auth changed from other app:', newAuthState);
          setUser(newAuthState.user);
          setSession(newAuthState.session);
          setIsDemoMode(newAuthState.isDemoMode || false);
          setLoading(newAuthState.loading || false);
          
          // Clear caches if user signed out
          if (!newAuthState.user) {
            ChatSessionService.clearUserCache();
            UserService.getInstance().clearCache();
          }
        } catch (error) {
          console.error('[Workspace Auth] Error parsing federated auth:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    initializeAuth();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Handle demo credentials by checking if they match
    if (email === 'alex.demo@athro.app' && password === 'AthroDemo2024!') {
      console.log('[Workspace Auth] Demo credentials detected, waiting for federated auth from dashboard');
      // Demo sign-in will be handled by federated auth from dashboard
      // Just wait for the storage event to update our state
      return;
    }
    
    // For regular credentials, use Supabase
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    // Clear local state
    setUser(null);
    setSession(null);
    setIsDemoMode(false);
    ChatSessionService.clearUserCache();
    UserService.getInstance().clearCache();
    
    // If we're not in demo mode, sign out from Supabase
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
  };

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    signInAnonymously,
    loading,
    isDemoMode
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 