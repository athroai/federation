import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { createClient } from '@supabase/supabase-js';
import { stripeService } from '../../services/StripeService';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

const StyledContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  width: '100%',
  backgroundImage: 'url(/world/back3.jpg)', // 🔥 Using strongest dark world background
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}));

const DarkOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 50, 0, 0.85)', // 🔥 Heavy dark green overlay
  zIndex: 1,
});

const ContentContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 2,
  maxWidth: '600px',
  padding: theme.spacing(5, 3),
  textAlign: 'center',
  color: '#ffffff',
}));

const AthroImage = styled('img')({
  width: '180px',
  height: 'auto',
  marginBottom: '30px',
  filter: 'drop-shadow(0 0 20px rgba(229, 201, 126, 0.3))',
});

const AthroTitle = styled(Typography)(({ theme }) => ({
  // 🔥 EXACT DASHBOARD HEADER STYLING
  fontFamily: "'Playfair Display', serif",
  fontWeight: 800,
  fontSize: '3.5rem',
  color: '#e4c97e',
  letterSpacing: '-1px',
  textAlign: 'center',
  marginBottom: '20px',
  textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
  background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundSize: '200% 200%',
  animation: 'gradient 3s ease infinite',
  '@keyframes gradient': {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' }
  },
  [theme.breakpoints.down('md')]: {
    fontSize: '2.5rem',
  },
  [theme.breakpoints.up('lg')]: {
    fontSize: '4rem',
  },
}));

const BodyText = styled(Typography)({
  fontSize: '1.1rem',
  lineHeight: 1.6,
  marginBottom: '20px',
  color: '#ffffff',
  opacity: 0.9,
});

const CtaButton = styled(Button)(({ theme }) => ({
  // 🔥 GOLD BUTTON STYLING TO MATCH DASHBOARD
  display: 'inline-block',
  padding: '14px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  backgroundColor: '#e4c97e', // 🔥 GOLD to match dashboard
  color: '#000000',
  border: 'none',
  boxShadow: '0 0 15px rgba(228, 201, 126, 0.5)', // 🔥 Gold glow
  fontSize: '1rem',
  letterSpacing: '0.5px',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: '#f0d894', // 🔥 Lighter gold on hover
    boxShadow: '0 0 25px rgba(228, 201, 126, 0.7)', // 🔥 Stronger gold glow
    transform: 'translateY(-2px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const CountdownText = styled(Typography)({
  marginTop: '20px',
  fontWeight: 600,
  color: '#cccccc',
  fontSize: '1rem',
  opacity: 0.8,
});

export const EmailConfirmed: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [showFallback, setShowFallback] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [userTier, setUserTier] = useState<string>('lite');

  useEffect(() => {
    const handleEmailConfirmationAndPaymentRedirect = async () => {
      try {
        console.log('📧 Email confirmed page loaded - processing verification and payment redirect');
        
        // 🔥 GET CURRENT USER AFTER EMAIL CONFIRMATION
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('❌ Could not get user after email confirmation:', userError);
          return;
        }

        console.log('✅ User confirmed:', user.email);
        
        // 🔥 GET USER TIER FROM METADATA OR DEFAULT TO LITE
        let tier = user.user_metadata?.tier || 'lite';
        setUserTier(tier);
        
        // 🔥 SET CROSS-DEVICE FLAGS FOR PAYMENT REDIRECT
        const paymentRedirectData = {
          userId: user.id,
          email: user.email,
          tier: tier,
          timestamp: Date.now(),
          action: 'redirect_to_payment'
        };
        
        // Set localStorage flags for cross-device detection
        localStorage.setItem('athro_email_verified', 'true');
        localStorage.setItem('athro_payment_redirect', JSON.stringify(paymentRedirectData));
        localStorage.setItem(`athro_verified_${user.email}`, JSON.stringify(paymentRedirectData));
        
        console.log('🔥 Payment redirect flags set:', paymentRedirectData);
        
        // 🔥 BROADCAST MESSAGE FOR SAME-BROWSER DETECTION
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('athro_auth');
            channel.postMessage({
              type: 'EMAIL_VERIFIED_REDIRECT_TO_PAYMENT',
              data: paymentRedirectData
            });
            console.log('📡 Broadcast message sent for same-browser detection');
            channel.close();
          } catch (broadcastError) {
            console.log('⚠️ BroadcastChannel not supported:', broadcastError);
          }
        }
        
        // 🔥 GENERATE STRIPE PAYMENT URL AND REDIRECT
        if (tier !== 'free') {
          setRedirecting(true);
          
          const tierForStripe = tier === 'pro' || tier === 'full' ? 'premium' : 'lite';
          const stripeUrl = stripeService.getPaymentUrl(user.id, tierForStripe as 'lite' | 'premium');
          
          console.log(`🎯 Redirecting to Stripe payment: ${tierForStripe} plan`);
          console.log(`🔗 Stripe URL: ${stripeUrl}`);
          
          // 🔥 IMMEDIATE REDIRECT TO STRIPE PAYMENT
          setTimeout(() => {
            window.location.href = stripeUrl;
          }, 3000); // 3 second delay to show the message
        } else {
          console.log('✅ Free tier user - no payment required');
          // For free tier, just set the verification flag and close
          setTimeout(() => {
            attemptAutoClose();
          }, 3000);
        }

      } catch (error) {
        console.error('❌ Error processing email confirmation:', error);
      }
    };

    handleEmailConfirmationAndPaymentRedirect();
  }, []);

  // 🔥 AGGRESSIVE AUTO-CLOSE - Multiple methods to ensure it works
  const attemptAutoClose = useCallback(() => {
    console.log('🔄 Attempting to auto-close email confirmation window');
    
    // Method 1: Standard window.close()
    try {
      console.log('📧 Trying window.close()...');
      window.close();
      
      // Check if it worked after a short delay
      setTimeout(() => {
        if (!window.closed) {
          console.log('⚠️ window.close() failed, trying aggressive methods...');
          
          // Method 2: Try to navigate away and then close
          try {
            window.location.href = 'about:blank';
            setTimeout(() => {
              window.close();
            }, 50);
          } catch (err) {
            console.log('❌ Navigation close failed:', err);
          }
          
          // Method 3: Try history manipulation
          try {
            window.history.back();
            setTimeout(() => {
              window.close();
            }, 100);
          } catch (err) {
            console.log('❌ History back close failed:', err);
          }
          
          // Method 4: Final fallback after trying everything
          setTimeout(() => {
            if (!window.closed) {
              console.log('⚠️ All auto-close methods failed - showing manual instructions');
              setShowFallback(true);
            }
          }, 500);
        } else {
          console.log('✅ Window successfully closed!');
        }
      }, 200);
    } catch (error) {
      console.log('❌ Initial close attempt failed:', error);
      setShowFallback(true);
    }
  }, []);

  // 🔥 FORCE CLOSE BUTTON - More aggressive manual close
  const forceCloseTab = useCallback(() => {
    console.log('🔄 Force closing tab...');
    
    // Try all methods in sequence
    window.close();
    
    setTimeout(() => {
      try {
        window.location.href = 'about:blank';
        setTimeout(() => window.close(), 50);
      } catch (err) {
        console.log('Force close error:', err);
      }
    }, 100);
    
    setTimeout(() => {
      try {
        window.history.back();
        setTimeout(() => window.close(), 50);
      } catch (err) {
        console.log('History close error:', err);
      }
    }, 200);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0 && !redirecting && !showFallback) {
      if (userTier === 'free') {
        attemptAutoClose();
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, redirecting, showFallback, userTier, attemptAutoClose]);

  return (
    <StyledContainer>
      <DarkOverlay />
      <ContentContainer>
        {/* 🔥 ATHRO4.PNG IMAGE */}
        <AthroImage 
          src="/png/athro4.png" 
                          alt="AthroAi" 
          onError={(e) => {
            // Fallback if athro4.png doesn't exist
            e.currentTarget.src = "/png/athro-astrology.png";
          }}
        />

        {/* 🔥 MAIN TITLE WITH DASHBOARD STYLING */}
        <AthroTitle variant="h1">
          Email Confirmed
        </AthroTitle>

        {/* 🔥 DYNAMIC CONTENT BASED ON STATE */}
        {redirecting ? (
          <>
            <BodyText>
              ✅ Email verified successfully!
            </BodyText>
            <BodyText>
              🎯 Redirecting to payment in {timeLeft} seconds...
            </BodyText>
            <BodyText sx={{ color: '#4fc38a', fontWeight: 'bold' }}>
              Your other devices will also redirect automatically.
            </BodyText>
            <CountdownText>
                              {userTier === 'pro' || userTier === 'full' ? 'AthroAi Full - £19.99/month' : 'AthroAi Lite - £9.99/month'}
            </CountdownText>
          </>
        ) : (
          <>
            <BodyText>
              Thanks for confirming your email address.
            </BodyText>
            <BodyText>
              Processing verification and preparing payment redirect...
            </BodyText>
          </>
        )}

        {showFallback && (
          <>
            <BodyText>
              Please return to your computer or original device to complete your sign-up process.
            </BodyText>

            {/* 🔥 CTA BUTTON WITH THEME STYLING */}
            <CtaButton onClick={forceCloseTab}>
              Close This Window
            </CtaButton>

            {/* 🔥 COUNTDOWN TIMER */}
            <CountdownText>
              If this window doesn't close automatically, please close it manually and return to your registration screen.
            </CountdownText>
          </>
        )}
      </ContentContainer>
    </StyledContainer>
  );
}; 
