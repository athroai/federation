import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Removed unused anonymous sign-in state variables

  // Check if we're in embedded mode (inside dashboard)
  const isEmbedded = (window as any).__ATHRO_EMBEDDED_MODE__ || false;
  
  console.log('🔗 [AuthWrapper] Embedded mode:', isEmbedded, 'User:', !!user, 'Loading:', loading);

  // REMOVED: Automatic anonymous sign-in was causing logout loops
  // Users must explicitly sign in or use demo mode
  
  // If embedded in dashboard, skip authentication requirements
  if (isEmbedded) {
    console.log('🔗 [AuthWrapper] Embedded mode detected - skipping auth requirements');
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const action = isSignUp ? signUp : signIn;
      await action(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleDemoMode = async () => {
    try {
      setError(null);
      // Use demo mode instead of anonymous sign-in
      await signIn('alex.demo@athro.app', 'AthroDemo2024!');
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #16221c 0%, #1c2a1e 100%)',
        color: '#e4c97e',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(228, 201, 126, 0.3)',
            borderTop: '3px solid #e4c97e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>
            Loading...
          </span>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #16221c 0%, #1c2a1e 100%)',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '1rem',
          background: 'rgba(28, 42, 30, 0.8)',
          border: '1px solid rgba(228, 201, 126, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          color: '#e4c97e'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <h1 style={{ 
              fontSize: '1.75rem',
              fontWeight: '700',
              margin: '0 0 0.5rem 0',
              color: '#e4c97e',
              letterSpacing: '-0.025em'
            }}>
              {isSignUp ? 'Create Account' : 'Sign In to Workspace'}
            </h1>
            <p style={{
              fontSize: '0.95rem',
              color: 'rgba(228, 201, 126, 0.7)',
              margin: '0',
              fontWeight: '400'
            }}>
              {isSignUp ? 'Join Athro to start your learning journey' : 'Welcome back to your workspace'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#e4c97e',
                marginBottom: '0.5rem'
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(228, 201, 126, 0.3)',
                  background: 'rgba(22, 34, 28, 0.8)',
                  color: '#e4c97e',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#e4c97e';
                  e.target.style.boxShadow = '0 0 0 3px rgba(228, 201, 126, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(228, 201, 126, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#e4c97e',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(228, 201, 126, 0.3)',
                  background: 'rgba(22, 34, 28, 0.8)',
                  color: '#e4c97e',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#e4c97e';
                  e.target.style.boxShadow = '0 0 0 3px rgba(228, 201, 126, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(228, 201, 126, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            {error && (
              <div style={{ 
                color: '#ff6b6b', 
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                padding: '0.75rem',
                background: 'rgba(255, 107, 107, 0.1)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 107, 107, 0.2)'
              }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: '#e4c97e',
                color: '#1c2a1e',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                marginBottom: '1rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(228, 201, 126, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0d8a0';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(228, 201, 126, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#e4c97e';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(228, 201, 126, 0.3)';
              }}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '0',
              right: '0',
              height: '1px',
              background: 'rgba(228, 201, 126, 0.2)'
            }}></div>
            <span style={{
              background: 'rgba(28, 42, 30, 0.8)',
              padding: '0 1rem',
              fontSize: '0.875rem',
              color: 'rgba(228, 201, 126, 0.6)',
              fontWeight: '500'
            }}>
              or
            </span>
          </div>
          
          <button
            onClick={handleDemoMode}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: 'transparent',
              color: '#e4c97e',
              border: '1px solid rgba(228, 201, 126, 0.4)',
              borderRadius: '0.75rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(228, 201, 126, 0.1)';
              e.currentTarget.style.borderColor = '#e4c97e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(228, 201, 126, 0.4)';
            }}
          >
            Try Demo Mode
          </button>
          
          <div style={{ 
            textAlign: 'center', 
            fontSize: '0.875rem',
            color: 'rgba(228, 201, 126, 0.7)'
          }}>
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button 
                  onClick={() => setIsSignUp(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e4c97e',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                New user?{' '}
                <button 
                  onClick={() => setIsSignUp(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e4c97e',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper; 