import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { DemoLoginInfo } from '../DemoLoginInfo';

export const LoginSection: React.FC = () => {
  const { user, signIn, signUp, signOut } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const action = isSignUp ? signUp : signIn;
      await action(email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setError(null);
    setLoading(true);
    try {
      // Use demo mode instead of anonymous sign-in
      await signIn('alex.demo@athro.app', 'AthroDemo2024!');
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
    }
  };

  if (user) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" sx={{ color: '#e4c97e', mb: 2 }}>
          Account
        </Typography>
        <Box sx={{ 
          background: 'rgba(28,42,30,0.7)', 
          borderRadius: 2, 
          p: 3, 
          border: '1px solid #4fc38a',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: '#4fc38a', color: '#1c2a1e' }}>
            {user.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: '#e4c97e', fontWeight: 600 }}>
              {user.email || 'Guest User'}
            </Typography>
            <Chip 
              label={user.email ? 'Authenticated' : 'Guest'} 
              size="small" 
              sx={{ 
                bgcolor: user.email ? '#4fc38a' : '#e4c97e',
                color: '#1c2a1e',
                fontSize: '0.75rem'
              }} 
            />
          </Box>
          <Button
            variant="outlined"
            onClick={handleSignOut}
            sx={{
              color: '#e4c97e',
              borderColor: '#e4c97e',
              '&:hover': {
                borderColor: '#e4c97e',
                backgroundColor: 'rgba(228, 201, 126, 0.1)'
              }
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle1" sx={{ color: '#e4c97e', mb: 2 }}>
        {isSignUp ? 'Create Account' : 'Sign In'}
      </Typography>
      
      {/* Demo Login Credentials */}
      <DemoLoginInfo />
      
      <Box sx={{ 
        background: 'rgba(28,42,30,0.7)', 
        borderRadius: 2, 
        p: 3, 
        border: '1px solid #4fc38a'
      }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              size="small"
              sx={{ 
                background: '#223', 
                input: { color: '#e4c97e' }, 
                label: { color: '#b5cbb2' }, 
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#4fc38a' } } 
              }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              size="small"
              sx={{ 
                background: '#223', 
                input: { color: '#e4c97e' }, 
                label: { color: '#b5cbb2' }, 
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#4fc38a' } } 
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(255, 87, 87, 0.1)', color: '#ff5757' }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
            sx={{
              backgroundColor: '#e4c97e',
              color: '#1c2a1e',
              fontWeight: 700,
              mb: 2,
              '&:hover': {
                backgroundColor: 'rgba(228, 201, 126, 0.8)',
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(228, 201, 126, 0.3)',
                color: 'rgba(28, 42, 30, 0.5)',
              }
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <Divider sx={{ my: 2, borderColor: '#4fc38a' }}>
          <Typography sx={{ color: '#b5cbb2', fontSize: '0.9rem' }}>or</Typography>
        </Divider>

        <Button
          variant="outlined"
          onClick={handleDemoMode}
          disabled={loading}
          fullWidth
          sx={{
            color: '#4fc38a',
            borderColor: '#4fc38a',
            mb: 2,
            '&:hover': {
              borderColor: '#4fc38a',
              backgroundColor: 'rgba(79, 195, 138, 0.1)'
            }
          }}
        >
          Try Demo Mode
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            onClick={() => setIsSignUp(!isSignUp)}
            sx={{
              color: '#4fc38a',
              textTransform: 'none',
              fontSize: '0.9rem',
              '&:hover': {
                backgroundColor: 'transparent',
                textDecoration: 'underline'
              }
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'New to Athro? Create Account'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}; 