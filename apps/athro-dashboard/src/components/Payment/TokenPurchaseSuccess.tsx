import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { CheckCircle, Token as TokenIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';

const TokenPurchaseSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokensAdded, setTokensAdded] = useState<number>(320000);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyAndAddTokens = async () => {
      try {
        const sessionId = searchParams.get('session_id');

        console.log('🔍 Token purchase redirect detected', { sessionId, user: user?.id });

        // Simple validation - just like tier upgrade flow
        if (!sessionId) {
          console.error('❌ No session ID found in URL');
          setError('Invalid session - missing session ID');
          setLoading(false);
          return;
        }

        if (!user) {
          console.error('❌ No user found');
          setError('Please log in to complete your token purchase verification');
          setLoading(false);
          return;
        }

        console.log('✅ Token purchase parameters valid');
        console.log('📦 Session ID:', sessionId);
        console.log('👤 User ID:', user.id);

        // **MANUALLY ADD TOKENS** - Direct database call (no webhooks!)
        console.log('🔄 Calling purchase_extra_tokens database function...');
        
        const { data, error: dbError } = await supabase
          .rpc('purchase_extra_tokens', { 
            user_id: user.id 
          });

        if (dbError) {
          console.error('❌ Database function error:', dbError);
          setError(`Failed to add tokens: ${dbError.message}`);
          setLoading(false);
          return;
        }

        console.log('✅ Database function result:', data);
        
        if (data && data.success) {
          console.log('🎉 Tokens added successfully!');
          console.log('📊 Tokens added:', data.extra_tokens_added);
          console.log('📊 Total extra tokens:', data.total_extra_tokens);
          
          setTokensAdded(data.extra_tokens_added || 320000);
          setSuccess(true);
        } else {
          console.error('❌ Token purchase failed:', data);
          setError(data?.error || 'Failed to add tokens');
        }

        setLoading(false);

        // Auto-redirect after showing success message
        setTimeout(() => {
          console.log('🎯 Auto-redirecting to dashboard...');
          navigate('/dashboard?tab=subscription&section=usage');
        }, 3000);

      } catch (error) {
        console.error('❌ Error in token purchase verification:', error);
        setError('Verification failed');
        setLoading(false);
      }
    };

    verifyAndAddTokens();
  }, [searchParams, navigate, user]);

  const handleLoginFirst = () => {
    navigate('/login', { 
      state: { 
        redirectAfterLogin: `/token-purchase-success?${searchParams.toString()}` 
      } 
    });
  };

  if (!user) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: '#1c2a1e',
          p: 3
        }}
      >
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            maxWidth: 500,
            backgroundColor: 'rgba(28, 42, 30, 0.95)',
            border: '2px solid #e4c97e',
            borderRadius: '1rem'
          }}
        >
          <Typography variant="h4" sx={{ color: '#e4c97e', mb: 2 }}>
            Please Log In
          </Typography>
          <Typography variant="body1" sx={{ color: '#b5cbb2', mb: 3 }}>
            To complete your token purchase verification, please log in to your account first.
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleLoginFirst}
            sx={{ 
              backgroundColor: '#e4c97e', 
              color: '#1c2a1e',
              '&:hover': { backgroundColor: '#d4b76a' }
            }}
          >
            Log In to Continue
          </Button>
        </Paper>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: '#1c2a1e',
          p: 3
        }}
      >
        <CircularProgress sx={{ color: '#e4c97e', mb: 2 }} />
        <Typography sx={{ color: '#b5cbb2' }}>
          Processing your token purchase...
        </Typography>
        <Typography variant="body2" sx={{ color: '#e4c97e', mt: 1 }}>
          Adding tokens to your account...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: '#1c2a1e',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/dashboard')}
          sx={{ 
            backgroundColor: '#e4c97e', 
            color: '#1c2a1e',
            '&:hover': { backgroundColor: '#d4b76a' }
          }}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#1c2a1e',
        p: 3
      }}
    >
      <Paper 
        sx={{ 
          p: 4, 
          textAlign: 'center', 
          maxWidth: 500,
          backgroundColor: 'rgba(28, 42, 30, 0.95)',
          border: '2px solid #e4c97e',
          borderRadius: '1rem'
        }}
      >
        <CheckCircle 
          sx={{ 
            fontSize: 80, 
            color: '#4fc38a', 
            mb: 2 
          }} 
        />
        
        <Typography 
          variant="h4" 
          sx={{ 
            color: '#e4c97e', 
            fontWeight: 'bold', 
            mb: 2 
          }}
        >
          Tokens Added Successfully!
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 1, 
            mb: 3 
          }}
        >
          <TokenIcon sx={{ color: '#e4c97e', fontSize: 24 }} />
          <Typography 
            variant="h6" 
            sx={{ color: '#b5cbb2' }}
          >
            {tokensAdded.toLocaleString()} tokens added to your account
          </Typography>
        </Box>

        <Typography 
          variant="body1" 
          sx={{ 
            color: '#b5cbb2', 
            mb: 3 
          }}
        >
          Your token pack has been successfully processed. Redirecting to your dashboard...
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            onClick={() => navigate('/dashboard?tab=subscription&section=usage')}
            sx={{ 
              backgroundColor: '#e4c97e', 
              color: '#1c2a1e',
              '&:hover': { backgroundColor: '#d4b76a' }
            }}
          >
            View Usage
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={() => navigate('/workspace')}
            sx={{ 
              borderColor: '#4fc38a', 
              color: '#4fc38a',
              '&:hover': { 
                borderColor: '#4fc38a', 
                backgroundColor: 'rgba(79, 195, 138, 0.1)' 
              }
            }}
          >
            Start Learning
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default TokenPurchaseSuccess; 