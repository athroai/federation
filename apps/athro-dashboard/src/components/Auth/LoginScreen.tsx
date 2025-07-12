import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  styled,
} from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import LogoutButton from './LogoutButton';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

const StyledContainer = styled('div')({
  minHeight: '100vh',
  color: '#ffffff',
  backgroundColor: '#0c0c0c',
  backgroundImage: 'url("/world/back3.jpg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  margin: 0,
  padding: 0,
  fontFamily: 'var(--body-font)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
});

const Overlay = styled('div')({
  background: 'rgba(17, 25, 21, 0.95)', // Same darker green overlay as splash screen
  padding: '40px 0',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
});

const StyledPaper = styled(Paper)(({ theme }) => ({
  background: 'rgba(17, 25, 21, 0.95)', // Match overlay color for consistency
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(228, 201, 126, 0.2)',
  borderRadius: '16px',
  padding: theme.spacing(4),
  width: '100%',
  maxWidth: 400,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  '&:hover': {
    border: '1px solid rgba(228, 201, 126, 0.4)',
  }
}));

const StyledTitle = styled(Typography)({
  color: '#e4c97e',
  fontSize: '2.5rem',
  fontFamily: "'Playfair Display', serif",
  fontWeight: 800,
  textAlign: 'center',
  marginBottom: '1rem',
  textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
  background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundSize: '200% 200%',
  animation: 'gradient 3s ease infinite',
  letterSpacing: '-1px',
  '@keyframes gradient': {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' }
  }
});

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    '& fieldset': {
      borderColor: 'rgba(228, 201, 126, 0.3)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(228, 201, 126, 0.6)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#e4c97e',
      boxShadow: '0 0 20px rgba(228, 201, 126, 0.3)',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#e4c97e',
    '&.Mui-focused': {
      color: '#e4c97e',
    },
  },
});

const ActionButton = styled(Button)({
  background: '#e4c97e', // Theme gold
  color: '#000',
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: "'Playfair Display', serif",
  padding: '0.875rem',
  borderRadius: '12px',
  textTransform: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 0 20px rgba(228, 201, 126, 0.3)',
  '&:hover': {
    background: '#4fc38a',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 30px rgba(79, 195, 138, 0.4)',
  },
  '&.secondary': {
    background: 'transparent',
    border: '1px solid rgba(228, 201, 126, 0.5)',
    color: '#e4c97e',
    boxShadow: 'none',
    '&:hover': {
      background: 'rgba(228, 201, 126, 0.1)',
      borderColor: '#e4c97e',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(228, 201, 126, 0.2)',
    },
  }
});

interface LoginScreenProps {
  onLogin?: (tier: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailVerificationRequired(false);

    try {
      setLoading(true);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          setEmailVerificationRequired(true);
          setError('Please verify your email address before logging in. Check your inbox for the verification link.');
          return;
        }
        throw signInError;
      }

      if (data.user && !data.user.email_confirmed_at) {
        setEmailVerificationRequired(true);
        setError('Please verify your email address before logging in. Check your inbox for the verification link.');
        return;
      }

      // Check if user has a profile, create one if not
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          // Create basic profile for legacy users
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name || '',
              email: data.user.email || '',
              user_tier: 'free'
            });
        }
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;
      
      setError('Verification email sent! Please check your inbox.');
    } catch (err) {
      console.error('Resend verification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  if (emailVerificationRequired) {
    return (
      <StyledContainer>
        {/* Logout Button - Top Right */}
        <LogoutButton />
        
        <Overlay>
          <StyledPaper>
          <StyledTitle variant="h5">
            Email Verification Required
          </StyledTitle>
          <Typography align="center" sx={{ color: '#fff', mb: 3 }}>
            Please verify your email address before logging in. Check your inbox for the verification link.
          </Typography>
          <ActionButton
            onClick={handleResendVerification}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Resend Verification Email'}
          </ActionButton>
          <ActionButton
            className="secondary"
            onClick={() => setEmailVerificationRequired(false)}
          >
            Back to Login
          </ActionButton>
          {error && (
            <Alert 
              severity={error.includes('resent') ? 'success' : 'error'} 
              sx={{ 
                backgroundColor: error.includes('resent') ? 'rgba(79, 195, 138, 0.1)' : 'rgba(228, 201, 126, 0.1)',
                color: error.includes('resent') ? '#4fc38a' : '#e4c97e',
                border: `1px solid ${error.includes('resent') ? '#4fc38a' : '#e4c97e'}`,
              }}
            >
              {error}
            </Alert>
          )}
        </StyledPaper>
        </Overlay>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      {/* Logout Button - Top Right */}
      <LogoutButton />
      
      <Overlay>
        <StyledPaper>
        <StyledTitle variant="h5">
          Welcome Back
        </StyledTitle>
        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <StyledTextField
            label="Email"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <StyledTextField
            label="Password"
            type="password"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Alert 
              severity="error"
              sx={{ 
                backgroundColor: 'rgba(228, 201, 126, 0.1)',
                color: '#e4c97e',
                border: '1px solid #e4c97e',
              }}
            >
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ActionButton
              type="submit"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </ActionButton>
            

            
            <ActionButton
              className="secondary"
              onClick={() => navigate('/')}
            >
                              Return to AthroAi
            </ActionButton>
          </Box>
        </Box>
      </StyledPaper>
      </Overlay>
    </StyledContainer>
  );
}; 