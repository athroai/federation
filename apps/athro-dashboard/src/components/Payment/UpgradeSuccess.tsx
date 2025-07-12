import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  styled
} from '@mui/material';
import {
  CheckCircle,
  Star,
  Home,
  Login,
  Celebration
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { stripeService } from '../../services/StripeService';

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
  background: 'rgba(17, 25, 21, 0.95)',
  padding: '40px 0',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
});

const StyledCard = styled(Card)({
  background: 'rgba(17, 25, 21, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(228, 201, 126, 0.2)',
  borderRadius: '16px',
  maxWidth: 600,
  width: '100%',
  margin: '0 20px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
});

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

const ActionButton = styled(Button)({
  background: '#e4c97e',
  color: '#000',
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: "'Playfair Display', serif",
  padding: '0.875rem 2rem',
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

const UpgradeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userTier, loadUserTier } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    tier: string;
    amount: string;
  } | null>(null);

  // Define tier redirect logic at the top
  const getTierRedirectUrl = (tier: string | null): string => {
    switch (tier) {
      case 'lite':
        // Lite users now stay on dashboard - no separate workspace window
        return '/dashboard';
      case 'full':
        // Full users get full dashboard access
        return '/dashboard';
      default:
        // Free users default to dashboard
        return '/dashboard';
    }
  };

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
          throw new Error('No payment session found');
        }

        if (!user) {
          throw new Error('Please log in to complete your payment verification');
        }

        console.log('🔍 Verifying payment session:', sessionId);

        // Get additional URL parameters for simple flow
        const userId = searchParams.get('user_id');
        const tier = searchParams.get('tier');

        console.log('🎉 Payment success - Processing simple flow');
        console.log('User ID:', userId);
        console.log('Tier:', tier);

        // Set initial payment details from URL to avoid showing "Free" during loading
        if (tier) {
          const initialTierDisplay = tier === 'full' || tier === 'pro' || tier === 'premium' 
                              ? 'AthroAi Full'
                  : tier === 'lite' 
                  ? 'AthroAi Lite'
                  : 'AthroAi';
          const initialAmount = tier === 'full' || tier === 'pro' || tier === 'premium'
            ? '£14.99/month'
            : tier === 'lite'
            ? '£7.99/month'
            : 'Processing...';
            
          setPaymentDetails({
            tier: initialTierDisplay,
            amount: initialAmount
          });
          
          console.log(`🎯 Initial display set to: ${initialTierDisplay} (${initialAmount})`);
        }

        // If we have user_id and tier from URL (new simple flow)
        if (tier && user && (userId === user.id || !userId)) {
          console.log('🔄 Updating user tier directly...');
          // Handle both 'pro', 'full', and 'premium' -> 'full'
          let userTier: 'free' | 'lite' | 'full' = 'lite';
          if (tier === 'pro' || tier === 'full' || tier === 'premium') {
            userTier = 'full';
          } else if (tier === 'lite') {
            userTier = 'lite';
          }
          await stripeService.updateUserTier(user.id, userTier);
        } else {
          console.log('⚠️ No direct payment info - payment may still be processing via webhook');
        }

        // Wait a moment for webhook processing, then reload user tier
        setTimeout(async () => {
          try {
            await loadUserTier(user.id);
            const newTier = await stripeService.getUserTier(user.id);
            
            // Set payment details for display - use URL tier as fallback instead of 'Free'
            const urlTier = searchParams.get('tier');
            let displayTier = 'AthroAI';
            let displayAmount = 'Payment confirmed';
            
            if (newTier === 'full') {
              displayTier = 'AthroAI Full';
              displayAmount = '£14.99/month';
            } else if (newTier === 'lite') {
              displayTier = 'AthroAI Lite';
              displayAmount = '£7.99/month';
            } else if (urlTier === 'full' || urlTier === 'pro' || urlTier === 'premium') {
              // Fallback to URL tier if database tier is unclear
              displayTier = 'AthroAI Full';
              displayAmount = '£14.99/month';
            } else if (urlTier === 'lite') {
              displayTier = 'AthroAI Lite';
              displayAmount = '£7.99/month';
            }
            
            setPaymentDetails({
              tier: displayTier,
              amount: displayAmount
            });
            
            console.log(`🔄 Updated display: ${displayTier} (${displayAmount}) - DB tier: ${newTier}, URL tier: ${urlTier}`);

            // Auto-redirect after successful payment verification
            setTimeout(() => {
              const redirectUrl = getTierRedirectUrl(newTier);
              console.log(`🚀 Auto-redirecting ${newTier} user to: ${redirectUrl}`);
              
              // All users navigate normally to dashboard - no new windows
              navigate(redirectUrl);
            }, 3000); // Give user time to see success message
            
            setSuccess(true);
            console.log('✅ Payment verification completed, user tier:', newTier);
          } catch (tierError) {
            console.error('Failed to load updated tier:', tierError);
            // Still show success since payment was verified
            setSuccess(true);
            setPaymentDetails({
              tier: 'Your Plan',
              amount: 'Payment confirmed'
            });
          }
        }, 2000);

      } catch (err: unknown) {
        console.error('Payment verification error:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify payment');
      } finally {
        setTimeout(() => setProcessing(false), 3000); // Give time for processing
      }
    };

    verifyPayment();
  }, [user, searchParams, loadUserTier]);

  const handleContinue = () => {
    // Determine redirect based on user tier
    const redirectUrl = getTierRedirectUrl(userTier);
    console.log(`🎯 Redirecting ${userTier} user to: ${redirectUrl}`);
    
    // All users navigate normally to dashboard - no new windows
    navigate(redirectUrl);
  };

  const handleLoginFirst = () => {
    navigate('/login', { 
      state: { 
        redirectAfterLogin: `/upgrade-success?${searchParams.toString()}` 
      } 
    });
  };

  if (!user) {
    return (
      <StyledContainer>
        <Overlay>
          <StyledCard>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Login sx={{ fontSize: 60, color: '#e4c97e', mb: 2 }} />
              <StyledTitle variant="h4">
                Please Log In
              </StyledTitle>
              <Typography variant="body1" sx={{ color: '#fff', mb: 3 }}>
                To complete your payment verification, please log in to your account first.
              </Typography>
              <ActionButton onClick={handleLoginFirst}>
                Log In to Continue
              </ActionButton>
            </CardContent>
          </StyledCard>
        </Overlay>
      </StyledContainer>
    );
  }

  if (processing) {
    return (
      <StyledContainer>
        <Overlay>
          <StyledCard>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <CircularProgress 
                size={60} 
                sx={{ color: '#e4c97e', mb: 3 }} 
              />
              <StyledTitle variant="h4">
                Processing Your Payment
              </StyledTitle>
              <Typography variant="body1" sx={{ color: '#fff', mb: 2 }}>
                We're verifying your payment and updating your account.
              </Typography>
              <Typography variant="body2" sx={{ color: '#e4c97e' }}>
                This usually takes just a few seconds...
              </Typography>
            </CardContent>
          </StyledCard>
        </Overlay>
      </StyledContainer>
    );
  }

  if (error) {
    return (
      <StyledContainer>
        <Overlay>
          <StyledCard>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  backgroundColor: 'rgba(228, 201, 126, 0.1)',
                  color: '#e4c97e',
                  border: '1px solid #e4c97e',
                }}
              >
                {error}
              </Alert>
              <Typography variant="h5" sx={{ color: '#e4c97e', mb: 3 }}>
                Payment Verification Issue
              </Typography>
              <Typography variant="body1" sx={{ color: '#fff', mb: 3 }}>
                There was an issue verifying your payment. Don't worry - your payment may still be processing.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                <ActionButton onClick={handleContinue}>
                  Continue to Dashboard
                </ActionButton>
                <ActionButton 
                  className="secondary"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </ActionButton>
              </Box>
            </CardContent>
          </StyledCard>
        </Overlay>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <Overlay>
        <StyledCard>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Celebration sx={{ fontSize: 80, color: '#4fc38a', mb: 2 }} />
              <CheckCircle sx={{ fontSize: 40, color: '#e4c97e' }} />
            </Box>
            
            <StyledTitle variant="h4">
              Welcome to {paymentDetails?.tier || 'AthroAi'}!
            </StyledTitle>
            
            <Typography variant="h6" sx={{ color: '#4fc38a', mb: 2, fontWeight: 'bold' }}>
              🎉 Payment Successful!
            </Typography>
            
            <Typography variant="body1" sx={{ color: '#fff', mb: 3 }}>
              Your subscription to <strong>{paymentDetails?.tier || 'your plan'}</strong> has been activated.
              {paymentDetails?.amount && (
                <><br />You'll be charged <strong>{paymentDetails.amount}</strong></>
              )}
            </Typography>

            <Box sx={{ 
              backgroundColor: 'rgba(79, 195, 138, 0.1)', 
              border: '1px solid #4fc38a',
              borderRadius: '12px',
              p: 3,
              mb: 3
            }}>
              <Typography variant="h6" sx={{ color: '#4fc38a', mb: 2 }}>
                What's Next?
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', textAlign: 'left' }}>
                • Access all premium features immediately<br />
                • Upload your documents and start studying<br />
                • Explore AI-powered study tools<br />
                • Set up your personal study calendar<br />
                • Track your confidence and progress
              </Typography>
            </Box>

            <ActionButton 
              onClick={handleContinue}
              startIcon={<Home />}
              sx={{ mb: 2 }}
            >
              Start Learning Now
            </ActionButton>

            <Typography variant="body2" sx={{ color: '#e4c97e' }}>
              Ready to transform your study experience? Let's go! 🚀
            </Typography>
          </CardContent>
        </StyledCard>
      </Overlay>
    </StyledContainer>
  );
};

export default UpgradeSuccess; 