import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stepper,
  Step,
  StepLabel,
  Divider,
  IconButton
} from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import { stripeService } from '../../services/StripeService';
import { useAuth } from '../../contexts/AuthContext';
import { EmailVerificationService, VerificationStatus } from '../../services/EmailVerificationService';
import LogoutButton from './LogoutButton';
import { ArrowBack, Home } from '@mui/icons-material';

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
  background: 'rgba(17, 25, 21, 0.95)',
  padding: '40px 0',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
});

const StyledPaper = styled(Paper)(({ theme }) => ({
  background: 'rgba(17, 25, 21, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(228, 201, 126, 0.2)',
  borderRadius: '16px',
  padding: theme.spacing(4),
  width: '100%',
  maxWidth: 600,
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

const StyledSubtitle = styled(Typography)({
  color: '#e4c97e',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '1rem',
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

const StyledFormControl = styled(FormControl)({
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
  '& .MuiSelect-icon': {
    color: '#e4c97e',
  },
});

const ActionButton = styled(Button)({
  background: '#e4c97e',
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

const YEAR_GROUPS = [
  { value: 7, label: 'Year 7' },
  { value: 8, label: 'Year 8' },
  { value: 9, label: 'Year 9' },
  { value: 10, label: 'Year 10 (GCSE)' },
  { value: 11, label: 'Year 11 (GCSE)' },
  { value: 12, label: 'Year 12 (A-Level)' },
  { value: 13, label: 'Year 13 (A-Level)' },
];

interface RegisterScreenProps {
  onRegister?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get tier from either URL params or location state
  const [searchParams] = useSearchParams();
  const requirePayment = searchParams.get('requirePayment') === 'true';
  
  // Determine the tier - if requirePayment is true, detect from user metadata or default to lite
  let selectedTier = location.state?.selectedTier || searchParams.get('tier') || 'free';
  if (requirePayment && user && selectedTier === 'free') {
    // If redirected for payment, try to get tier from user metadata
    const userTier = user.user_metadata?.tier;
    if (userTier && userTier !== 'free') {
      selectedTier = userTier;
    } else {
      // Default to lite if we can't determine the tier
      selectedTier = 'lite';
    }
  }
  
  // Form state
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [school, setSchool] = useState('');
  const [year, setYear] = useState<number | ''>('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // ✅ Production-grade email verification state  
  const [checking, setChecking] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  
  // ✅ Existing user detection and upgrade options
  const [existingUser, setExistingUser] = useState<VerificationStatus | null>(null);
  const [showUpgradeOption, setShowUpgradeOption] = useState(false);

  // Handle automatic payment redirect for verified users
  useEffect(() => {
    if (requirePayment && user) {
      console.log('🔄 User needs to complete payment, redirecting to payment step');
      console.log('🎯 Selected tier for payment:', selectedTier);
      setUserId(user.id);
      setEmail(user.email || '');
      setStep(0); // For payment flow, step 0 is the payment step
      setRegistrationComplete(true);
      setVerificationSent(false); // Make sure we don't show verification screen
    }
  }, [requirePayment, user, selectedTier]);

  // ✅ PRODUCTION-GRADE: Start polling when verification email sent
  useEffect(() => {
    if (!verificationSent || requirePayment || emailVerified || !email) {
      console.log('❌ Email verification polling NOT started because:', {
        verificationSent,
        requirePayment,
        emailVerified,
        email
      });
      return;
    }

    console.log('🔄 Starting production-grade email verification polling...');
    console.log('📊 Polling conditions:', {
      verificationSent,
      requirePayment,
      emailVerified,
      email,
      selectedTier
    });
    
    // Start polling your own database every 5 seconds
          EmailVerificationService.startPolling(
        email,
        (status: VerificationStatus) => {
          console.log('✅ Email verified via production polling!', status);
          setEmailVerified(true);
          setVerificationStatus(status);
          setError(null);
          setSuccessMessage('✅ Email verified! You can now continue.');
          
          // Handle payment redirect if needed
          if (selectedTier !== 'free' && status.tier !== 'free') {
            const paymentRedirectData = {
              userId: status.user_id,
              email: status.email,
              tier: status.tier,
              timestamp: Date.now(),
              action: 'redirect_to_payment'
            };
            localStorage.setItem('athro_payment_redirect', JSON.stringify(paymentRedirectData));
            console.log('💰 Payment redirect data saved:', paymentRedirectData);
          }
          
          // 🚀 CRITICAL FIX: Actually advance to the next screen!
          console.log('🎯 Advancing to next screen after email verification...');
          handleEmailVerified();
        },
      (error: string) => {
        console.error('❌ Polling error:', error);
        setSuccessMessage(null); // Clear success message on error
        setError(`Verification check failed: ${error}`);
      },
      3000 // Poll every 3 seconds for faster debugging
    );

    // Cleanup polling when component unmounts or verification completes
    return () => {
      console.log('🛑 Cleaning up email verification polling for:', email);
      EmailVerificationService.stopPolling(email);
    };
  }, [verificationSent, requirePayment, emailVerified, email, selectedTier]);

  // ✅ Check if user already exists and what tier they're on
  const checkExistingUser = useCallback(async (emailToCheck: string): Promise<VerificationStatus | null> => {
    try {
      console.log('🔍 Checking if user already exists:', emailToCheck);
      const status = await EmailVerificationService.checkVerificationStatus(emailToCheck);
      return status;
    } catch (error) {
      console.error('❌ Error checking existing user:', error);
      return null;
    }
  }, []);

  // Manual force check (button click) - Production version
  const forceAuthCheck = useCallback(async () => {
    if (checking || !email) return;
    
    setChecking(true);
    console.log('🔨 Force checking verification status...');
    
    try {
      const status = await EmailVerificationService.forceCheckVerification(email);
      
      if (status && status.email_confirmed) {
        console.log('✅ Force check: Email verified!');
        setEmailVerified(true);
        setVerificationStatus(status);
        setError(null);
        setSuccessMessage('✅ Email verified! You can now continue.');
        EmailVerificationService.stopPolling(email);
      } else {
        console.log('❌ Force check: Email not yet verified');
        setSuccessMessage(null); // Clear success message on error
        setError('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      console.error('❌ Force check error:', error);
      setSuccessMessage(null); // Clear success message on error
      setError('Failed to check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [checking, email]);

  // ✅ Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      if (email) {
        EmailVerificationService.stopAllPolling();
      }
    };
  }, []);

  // ✅ Production-grade system: All complex auth detection replaced with simple database polling above

  const steps = requirePayment 
    ? ['Complete Payment'] // Simple flow for payment completion
    : selectedTier === 'free' 
      ? ['Account Details', 'Email Verification'] 
      : ['Account Details', 'Profile Setup', 'Email Verification', 'Payment'];

  const handleAccountSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (selectedTier === 'free') {
      // For free tier, go straight to registration
      await handleRegistration();
    } else {
      // For paid tiers, proceed to profile setup
      setStep(1);
    }
  };

  const handleProfileSetup = () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!school.trim()) {
      setError('Please enter your school name');
      return;
    }
    if (!year) {
      setError('Please select your year group');
      return;
    }

    setError(null);
    setStep(2); // Move to email verification step
  };

  const handleRegistration = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting registration process for:', email);
      
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // For paid tiers, ensure required profile fields are filled
      if (selectedTier !== 'free') {
        if (!fullName.trim()) {
          throw new Error('Full name is required for paid plans');
        }
        if (!school.trim()) {
          throw new Error('School is required for paid plans');
        }
        if (!year) {
          throw new Error('Year group is required for paid plans');
        }
      }
      
      // Skip existing user check for now to avoid complexity - let Supabase handle it
      console.log('✅ Proceeding with registration...');
      
      const userData: any = {
        tier: selectedTier,
        full_name: fullName || '',
        preferred_name: preferredName || '',
        school: school || '',
        year: year || null,
      };

      console.log('📧 Creating Supabase user account...');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/email-confirmed`,
        },
      });

      console.log('🔍 Supabase signup response:', { 
        user: data?.user, 
        session: data?.session, 
        error: signUpError,
        emailSentDetails: data
      });

      if (signUpError) {
        console.error('❌ Supabase signup error:', signUpError);
        
        // Handle specific error cases
        if (signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please use the login page or try a different email.');
        } else if (signUpError.message.includes('weak password')) {
          throw new Error('Password is too weak. Please use a stronger password.');
        } else if (signUpError.message.includes('invalid email')) {
          throw new Error('Please enter a valid email address.');
        } else {
          throw new Error(`Registration failed: ${signUpError.message}`);
        }
      }

      if (!data.user) {
        throw new Error('Account creation failed. Please try again.');
      }

      const user = data.user;
      setUserId(user.id);
      console.log('✅ User account created:', user.id);
      console.log('📧 Email confirmation details:', {
        emailConfirmedAt: user.email_confirmed_at,
        emailConfirmationSentAt: user.confirmation_sent_at,
        userCreatedAt: user.created_at,
        userEmail: user.email,
        needsEmailConfirmation: !user.email_confirmed_at
      });
      
      // Create user record in users table (CRITICAL for email verification)
      try {
        console.log('📝 Creating user record for email verification...');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            tier: selectedTier,
            email_confirmed: false,
            email_confirmed_at: null,
          })
          .select()
          .single();

        if (userError) {
          console.error('❌ User record creation failed - CRITICAL ERROR:', {
            error: userError,
            message: userError.message,
            code: userError.code,
            details: userError.details,
            hint: userError.hint
          });
          
          if (userError.message.includes('duplicate key')) {
            console.log('✅ User record already exists (from trigger) - this is OK');
          } else {
            console.error('🚨 CRITICAL: User record creation failed - polling will not work!');
            // Don't fail registration, but log the critical error
          }
        } else {
          console.log('✅ User record created successfully:', userData);
        }
      } catch (userErr) {
        console.error('❌ User record creation exception - CRITICAL ERROR:', userErr);
      }

      // Create profile record with error handling
      try {
        console.log('📝 Creating user profile...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: fullName || null,
            preferred_name: preferredName || null,
            school: school || null,
            year: year || null,
            user_tier: selectedTier === 'pro' ? 'full' : selectedTier,
          });

        if (profileError) {
          console.warn('⚠️ Profile creation failed (non-critical):', profileError);
          // Not critical for registration flow
        } else {
          console.log('✅ Profile created successfully');
        }
      } catch (profileErr) {
        console.warn('⚠️ Profile creation error (non-critical):', profileErr);
      }

      // Success! Move to email verification
      console.log('🎉 Registration successful! Transitioning to email verification...');
      setRegistrationComplete(true);
      setVerificationSent(true);
      
      if (onRegister) {
        onRegister();
      }

    } catch (err) {
      console.error('❌ Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during registration';
      setError(errorMessage);
      
      // Don't set verificationSent on error - keep user on registration step
      setVerificationSent(false);
      setRegistrationComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerified = () => {
    if (selectedTier === 'free') {
      // Free tier goes directly to dashboard
      navigate('/dashboard');
    } else {
      // Paid tiers proceed to payment
      setStep(selectedTier === 'free' ? 1 : 3);
    }
  };

  const handlePayment = async () => {
    console.log('🔍 handlePayment called with:', { userId, user, selectedTier, requirePayment });
    
    if (!userId) {
      console.error('❌ No userId found - checking alternatives...');
      
      // Try to get userId from current auth user
      if (user && user.id) {
        console.log('✅ Found userId from auth user:', user.id);
        setUserId(user.id);
        // Continue with payment using auth user ID
      } else {
        console.error('❌ No auth user found either');
        setError('Please log in first or complete registration before making payment.');
        return;
      }
    }

    try {
      setLoading(true);
      
      // Get the actual userId to use - prefer userId state, fallback to current user
      const actualUserId = userId || user?.id;
      if (!actualUserId) {
        setError('Please log in first before making payment.');
        setLoading(false);
        return;
      }
      
      console.log('💳 Using userId for payment:', actualUserId);
      
      // Determine the tier for payment - check user metadata if current tier is 'free'
      let paymentTier = selectedTier;
      if (requirePayment && user && selectedTier === 'free' && user.user_metadata?.tier) {
        paymentTier = user.user_metadata.tier;
        console.log('🎯 Using user metadata tier for payment:', paymentTier);
      }
      
      // Default to 'lite' if we still don't have a valid paid tier
      if (paymentTier === 'free') {
        paymentTier = 'lite';
        console.log('⚠️ No paid tier found, defaulting to lite');
      }
      
      const tierForStripe = paymentTier === 'pro' ? 'premium' : 'lite';
      console.log('🚀 Creating payment URL with:', { actualUserId, tierForStripe, paymentTier });
      
      const url = stripeService.getPaymentUrl(actualUserId, tierForStripe as 'lite' | 'premium');
      console.log('✅ Payment URL created:', url);
      
      window.location.href = url;
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create payment session');
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    console.log('🔄 Resend email button clicked for:', email);
    
    if (!email) {
      console.error('❌ No email address available for resend');
      setSuccessMessage(null); // Clear success message on error
      setError('No email address found. Please try registering again.');
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      setSuccessMessage(null); // Clear any previous success messages
      
      console.log('📧 Resending verification email to:', email);
      console.log('🔗 Email redirect URL:', `${window.location.origin}/email-confirmed`);
      
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`,
        },
      });

      console.log('📧 Supabase resend response:', { 
        data, 
        error,
        hasData: !!data,
        errorMessage: error?.message,
        errorCode: error?.status 
      });

      // Check for specific Supabase resend errors
      if (error) {
        console.error('❌ Resend email error details:', {
          message: error.message,
          status: error.status,
          type: typeof error
        });
        
        // Handle rate limiting specifically
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          throw new Error('Too many email requests. Please wait 5 minutes before trying again.');
        }
        
        // Handle email not found
        if (error.message.includes('not found') || error.message.includes('user not found')) {
          throw new Error('Email address not found in our system. Please try registering again.');
        }
        
        throw error;
      }

      // Even if no error, check if data indicates success
      if (!data) {
        console.warn('⚠️ Resend returned success but no data - this might indicate a silent failure');
      }
      
      console.log('✅ Verification email resent successfully');
      setError(null);
      setSuccessMessage('✅ Verification email resent successfully! Please check your inbox.');
      
    } catch (err) {
      console.error('❌ Resend email failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
      setSuccessMessage(null); // Clear success message on error
      setError(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPlans = () => {
    navigate('/');
  };

  // ✅ Handle upgrade for existing users
  const handleUpgrade = async (upgradeTier: string) => {
    if (!existingUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Processing upgrade for existing user:', existingUser.email, 'to', upgradeTier);
      
      // Update the user's tier in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          tier: upgradeTier,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.user_id);
        
      if (updateError) {
        console.error('❌ Failed to update user tier:', updateError);
        throw new Error('Failed to update your account. Please try again.');
      }
      
      // Update profiles table as well
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          user_tier: upgradeTier,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.user_id);
        
      if (profileUpdateError) {
        console.log('⚠️ Profile update failed (might not exist):', profileUpdateError);
        // Not critical - continue with flow
      }
      
      console.log('✅ User upgraded successfully to:', upgradeTier);
      
      // Set user ID for payment flow and update selected tier
      setUserId(existingUser.user_id);
      setStep(3); // Go to payment step
      setRegistrationComplete(true);
      
      // Update the selected tier for the payment flow
      if (upgradeTier === 'pro') {
        // Force component re-render with pro tier
        window.history.replaceState({}, '', `${window.location.pathname}?tier=pro&requirePayment=true`);
      } else if (upgradeTier === 'lite') {
        // Force component re-render with lite tier  
        window.history.replaceState({}, '', `${window.location.pathname}?tier=lite&requirePayment=true`);
      }
      
      // Clear existing user state
      setExistingUser(null);
      setShowUpgradeOption(false);
      
    } catch (err) {
      console.error('❌ Upgrade error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade account');
    } finally {
      setLoading(false);
    }
  };

  // CRITICAL: Add navigation functions to prevent user entrapment
  const handleBackToHome = () => {
    // Always allow users to go back to plan selection
    navigate('/plans', { replace: true });
  };

  const handleBackToTierSelection = () => {
    // Go back to tier selection step
    if (requirePayment) {
      // If this was a payment-required redirect, go to plans instead
      navigate('/plans', { replace: true });
    } else {
      setStep(Math.max(0, step - 1));
    }
  };

  // Email verification screen (show when verification email has been sent)
  if (verificationSent) {
    return (
      <StyledContainer>
        {/* Logout Button - Top Right */}
        <LogoutButton />
        
        <Overlay>
          <StyledPaper>
            <StyledTitle variant="h5">
              {emailVerified ? '✅ Email Verified!' : 'Check Your Email'}
            </StyledTitle>
            
            {!emailVerified ? (
              <>
                <Typography align="center" paragraph sx={{ color: '#fff', mb: 3 }}>
                  We've sent a verification link to <strong style={{ color: '#e4c97e' }}>{email}</strong>. Please check your email and click the link to verify your account.
                </Typography>
                

                <Typography align="center" sx={{ color: '#e4c97e', mb: 3 }}>
                  After verification, you'll be redirected to {selectedTier === 'free' ? 'your dashboard' : 'complete your payment'}.
                </Typography>

                {/* 🔥 Cross-Device Helper Info */}
                <Box sx={{ 
                  backgroundColor: 'rgba(79, 195, 138, 0.1)', 
                  border: '1px solid rgba(79, 195, 138, 0.3)',
                  borderRadius: '12px',
                  p: 2,
                  mb: 3 
                }}>
                  <Typography variant="body2" sx={{ color: '#4fc38a', fontWeight: 'bold', mb: 1 }}>
                    Verifying on another device?
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', mb: 2 }}>
                    Click the verification link on your phone/tablet and this page will automatically detect it!
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#e4c97e', fontSize: '0.85rem' }}>
                    {checking ? '🔍 Checking verification status...' : '✨ Monitoring for verification...'}
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <Typography align="center" paragraph sx={{ color: '#4fc38a', mb: 3, fontSize: '1.1rem' }}>
                  🎉 Your email has been successfully verified!
                </Typography>
                <Typography align="center" sx={{ color: '#fff', mb: 3 }}>
                  {selectedTier === 'free' 
                    ? 'You can now access your dashboard.' 
                    : 'You can now proceed to complete your payment and activate your subscription.'
                  }
                </Typography>
              </>
            )}

            {/* Action Buttons */}
            {!emailVerified ? (
              <>
                <ActionButton
                  onClick={handleResendEmail}
                  disabled={loading || checking}
                  className="secondary"
                  sx={{ mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Resend Verification Email'}
                </ActionButton>
                

              </>
            ) : (
              <ActionButton
                onClick={() => {
                  if (selectedTier === 'free') {
                    navigate('/dashboard');
                  } else {
                    setStep(3); // Go to payment step
                    setVerificationSent(false); // Exit email verification screen
                  }
                }}
                sx={{ mb: 2, fontSize: '1.1rem', py: 1.5 }}
              >
                {selectedTier === 'free' ? '🎯 Go to Dashboard' : '💳 Continue to Payment'}
              </ActionButton>
            )}

            <ActionButton
              className="secondary"
              onClick={handleBackToPlans}
              disabled={checking}
            >
              Logout
            </ActionButton>

            {successMessage && (
              <Alert 
                severity="success" 
                sx={{ 
                  backgroundColor: 'rgba(79, 195, 138, 0.1)',
                  color: '#4fc38a',
                  border: '1px solid #4fc38a',
                  mt: 2
                }}
              >
                {successMessage}
              </Alert>
            )}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  backgroundColor: 'rgba(228, 201, 126, 0.1)',
                  color: '#e4c97e',
                  border: '1px solid #e4c97e',
                  mt: 2
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
          {/* CRITICAL: Always show navigation back to home */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2,
            borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
            pb: 2
          }}>
            <IconButton 
              onClick={handleBackToHome}
              sx={{ 
                color: '#e4c97e',
                '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.1)' }
              }}
              title="Back to Home"
            >
              <Home />
            </IconButton>
            
            <Typography variant="h6" sx={{ color: '#e4c97e', flexGrow: 1, textAlign: 'center' }}>
              {requirePayment ? 'Complete Payment' : 'Create Account'}
            </Typography>
            
            {step > 0 && !requirePayment && (
              <IconButton 
                onClick={handleBackToTierSelection}
                sx={{ 
                  color: '#e4c97e',
                  '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.1)' }
                }}
                title="Back"
              >
                <ArrowBack />
              </IconButton>
            )}
          </Box>

          <StyledTitle variant="h5">
            Create Your Account
          </StyledTitle>
          <StyledSubtitle variant="subtitle1">
            {requirePayment 
                      ? `Complete Payment - ${selectedTier === 'pro' ? 'AthroAi' : selectedTier === 'lite' ? 'AthroAi LITE' : 'FREE'} Plan`
        : `${selectedTier === 'pro' ? 'AthroAi' : selectedTier === 'lite' ? 'AthroAi LITE' : 'FREE'} Plan`
            }
          </StyledSubtitle>

          {/* Show clear escape option for payment-required flows */}
          {requirePayment && (
            <Alert 
              severity="info"
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(228, 201, 126, 0.1)',
                color: '#e4c97e',
                border: '1px solid #e4c97e',
                '& .MuiAlert-icon': { color: '#e4c97e' }
              }}
              action={
                <Button 
                  size="small" 
                  onClick={handleBackToHome}
                  sx={{ color: '#e4c97e', fontWeight: 'bold' }}
                >
                  Browse Plans
                </Button>
              }
            >
              Need to change your plan? You can browse all available options.
            </Alert>
          )}

          {/* Progress Stepper */}
          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ 
                  '& .MuiStepLabel-label': { color: '#e4c97e' },
                  '& .MuiStepIcon-root': { color: 'rgba(228, 201, 126, 0.3)' },
                  '& .MuiStepIcon-root.Mui-active': { color: '#e4c97e' },
                  '& .MuiStepIcon-root.Mui-completed': { color: '#4fc38a' },
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Payment-only flow for redirected users */}
          {requirePayment && step === 0 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                Complete Your Payment
              </Typography>
              <Typography sx={{ color: '#fff', mb: 3 }}>
                Welcome back! Complete your payment to activate your {selectedTier === 'pro' ? 'AthroAi' : selectedTier === 'lite' ? 'AthroAi LITE' : 'subscription'} subscription.
              </Typography>
              
              {/* Show tier selection with option to change */}
              <Box sx={{ 
                p: 3, 
                border: '1px solid #e4c97e', 
                borderRadius: 2, 
                mb: 3,
                backgroundColor: 'rgba(228, 201, 126, 0.05)'
              }}>
                <Typography sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 2 }}>
                  {(() => {
                    const tierName = selectedTier === 'pro' ? 'AthroAi' : 'AthroAi LITE';
                    const price = selectedTier === 'pro' ? '£14.99/month' : '£7.99/month';
                    return `${tierName} - ${price}`;
                  })()}
                </Typography>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBackToHome}
                  sx={{
                    color: '#e4c97e',
                    borderColor: '#e4c97e',
                    '&:hover': {
                      backgroundColor: 'rgba(228, 201, 126, 0.1)',
                    }
                  }}
                >
                  Change Plan
                </Button>
              </Box>
              
              {error && (
                <Alert 
                  severity="error"
                  sx={{ 
                    backgroundColor: 'rgba(228, 201, 126, 0.1)',
                    color: '#e4c97e',
                    border: '1px solid #e4c97e',
                    mb: 3
                  }}
                >
                  {error}
                </Alert>
              )}
              
              <ActionButton
                onClick={(e) => {
                  console.log('🔥 PAYMENT BUTTON CLICKED!', { 
                    event: e, 
                    userId, 
                    selectedTier, 
                    loading,
                    timestamp: new Date().toISOString()
                  });
                  
                  // Test if the function exists
                  if (typeof handlePayment !== 'function') {
                    console.error('❌ handlePayment is not a function!');
                    alert('ERROR: handlePayment function missing!');
                    return;
                  }
                  
                  // Call the actual handler
                  try {
                    handlePayment();
                  } catch (err: unknown) {
                    console.error('❌ Payment handler error:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    alert(`Payment Error: ${errorMessage}`);
                  }
                }}
                disabled={loading}
                sx={{ mb: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Complete Payment'}
              </ActionButton>
              
              <Typography sx={{ color: '#fff', fontSize: '0.875rem', mt: 2, opacity: 0.7 }}>
                ⚠️ Payment is required to activate your {selectedTier === 'pro' ? 'AthroAi' : selectedTier === 'lite' ? 'AthroAi LITE' : 'subscription'} subscription
              </Typography>
            </Box>
          )}

          {/* Step 0: Account Details (for normal registration flow) */}
          {!requirePayment && step === 0 && (
            <Box component="form" onSubmit={handleAccountSetup} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <StyledTextField
                label="Email"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear existing user state when email changes
                  if (existingUser || showUpgradeOption) {
                    setExistingUser(null);
                    setShowUpgradeOption(false);
                    setError(null);
                  }
                }}
              />
              <StyledTextField
                label="Password"
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Minimum 6 characters"
              />
              <StyledTextField
                label="Confirm Password"
                type="password"
                fullWidth
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {selectedTier === 'free' && (
                <>
                  <Divider sx={{ borderColor: 'rgba(228, 201, 126, 0.2)', my: 2 }} />
                  <Typography variant="h6" sx={{ color: '#e4c97e' }}>Optional Profile Information</Typography>
                  <StyledTextField
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <StyledTextField
                    label="Preferred Name"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    helperText="How you'd like AthroAi to address you"
                  />
                  <StyledTextField
                    label="School"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                  />
                  <StyledFormControl>
                    <InputLabel>Year Group</InputLabel>
                    <Select
                      value={year}
                      label="Year Group"
                      onChange={(e) => setYear(e.target.value as number)}
                    >
                      {YEAR_GROUPS.map((yearGroup) => (
                        <MenuItem key={yearGroup.value} value={yearGroup.value}>
                          {yearGroup.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </StyledFormControl>
                </>
              )}

              {error && (
                <Alert 
                  severity={showUpgradeOption ? "warning" : "error"}
                  sx={{ 
                    backgroundColor: showUpgradeOption 
                      ? 'rgba(79, 195, 138, 0.1)' 
                      : 'rgba(228, 201, 126, 0.1)',
                    color: showUpgradeOption ? '#4fc38a' : '#e4c97e',
                    border: showUpgradeOption 
                      ? '1px solid #4fc38a' 
                      : '1px solid #e4c97e',
                  }}
                >
                  {error}
                </Alert>
              )}

              {/* ✅ Existing User Upgrade Option - AthroAi PRO is KING! */}
              {showUpgradeOption && existingUser && (
                <Box sx={{ 
                  backgroundColor: 'rgba(79, 195, 138, 0.1)', 
                  border: '1px solid rgba(79, 195, 138, 0.3)',
                  borderRadius: '12px',
                  p: 3,
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" sx={{ color: '#4fc38a', mb: 2 }}>
                    🚀 Unlock the Full AthroAi Experience!
                  </Typography>
                  <Typography sx={{ color: '#fff', mb: 2 }}>
                                          You're currently on {existingUser.tier === 'free' ? 'the free plan' : `AthroAi ${existingUser.tier.toUpperCase()}`}.
                  </Typography>
                  <Typography sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 3 }}>
                    Choose your upgrade level:
                  </Typography>
                  
                  {/* 👑 ATHROAI PRO - THE KING OPTION */}
                  <Box sx={{ 
                    backgroundColor: 'rgba(228, 201, 126, 0.15)', 
                    border: '2px solid #e4c97e',
                    borderRadius: '12px',
                    p: 2,
                    mb: 2,
                    position: 'relative'
                  }}>
                    <Typography variant="body2" sx={{ 
                      position: 'absolute',
                      top: -8,
                      left: 12,
                      backgroundColor: '#e4c97e',
                      color: '#000',
                      px: 2,
                      py: 0.5,
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      👑 RECOMMENDED
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#e4c97e', mt: 1, mb: 1 }}>
                      AthroAi PRO
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.875rem', mb: 2 }}>
                      Complete AI learning companion • £14.99/month
                    </Typography>
                    <ActionButton
                      onClick={() => handleUpgrade('pro')}
                      disabled={loading}
                      sx={{ width: '100%', fontSize: '1.1rem', py: 1.5 }}
                    >
                      {loading ? <CircularProgress size={24} /> : '🚀 Upgrade to AthroAi PRO'}
                    </ActionButton>
                  </Box>

                  {/* AthroAi LITE - Secondary option */}
                  <Box sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    p: 2,
                    mb: 3
                  }}>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                      AthroAi LITE
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.875rem', mb: 2, opacity: 0.8 }}>
                      Essential AI features • £7.99/month
                    </Typography>
                    <ActionButton
                      onClick={() => handleUpgrade('lite')}
                      disabled={loading}
                      className="secondary"
                      sx={{ width: '100%' }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Upgrade to LITE'}
                    </ActionButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <ActionButton
                      className="secondary"
                      onClick={() => {
                        setExistingUser(null);
                        setShowUpgradeOption(false);
                        setError(null);
                      }}
                      disabled={loading}
                      sx={{ minWidth: '120px' }}
                    >
                      Cancel
                    </ActionButton>
                  </Box>
                  
                  <Typography sx={{ color: '#fff', fontSize: '0.875rem', mt: 2, opacity: 0.7 }}>
                    Or <Button 
                      onClick={() => navigate('/login')} 
                      sx={{ 
                        color: '#4fc38a', 
                        textTransform: 'none', 
                        padding: 0, 
                        minWidth: 'auto',
                        textDecoration: 'underline'
                      }}
                    >
                      login to your existing account
                    </Button>
                  </Typography>
                </Box>
              )}

              {/* Regular form buttons - only show if not showing upgrade option */}
              {!showUpgradeOption && (
                <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                  <ActionButton
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 
                      selectedTier === 'free' ? 'Create Account' : 'Continue'
                    }
                  </ActionButton>
                  <ActionButton
                    className="secondary"
                    onClick={handleBackToPlans}
                  >
                    Return to AthroAi
                  </ActionButton>
                </Box>
              )}
            </Box>
          )}

          {/* Step 1: Profile Setup (for paid tiers) */}
          {step === 1 && selectedTier !== 'free' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h6" sx={{ color: '#e4c97e' }}>Complete Your Profile</Typography>
              
              <StyledTextField
                label="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <StyledTextField
                label="Preferred Name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                                    helperText="How you'd like AthroAi to address you"
              />
              <StyledTextField
                label="School"
                required
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              />
              <StyledFormControl required>
                <InputLabel>Year Group</InputLabel>
                <Select
                  value={year}
                  label="Year Group"
                  onChange={(e) => setYear(e.target.value as number)}
                >
                  {YEAR_GROUPS.map((yearGroup) => (
                    <MenuItem key={yearGroup.value} value={yearGroup.value}>
                      {yearGroup.label}
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>

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

              <Box sx={{ display: 'flex', gap: 2 }}>
                <ActionButton
                  onClick={() => setStep(0)}
                  className="secondary"
                  sx={{ flex: 1 }}
                >
                  Back
                </ActionButton>
                <ActionButton
                  onClick={handleProfileSetup}
                  sx={{ flex: 1 }}
                >
                  Continue to Verification
                </ActionButton>
              </Box>
            </Box>
          )}

          {/* Step 2: Email Verification (for paid tiers) */}
          {step === 2 && selectedTier !== 'free' && !verificationSent && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                Ready to Create Your Account
              </Typography>
              <Typography sx={{ color: '#fff', mb: 3 }}>
                Click below to create your account and send verification email.
              </Typography>
              
              {error && (
                <Alert 
                  severity="error"
                  sx={{ 
                    backgroundColor: 'rgba(228, 201, 126, 0.1)',
                    color: '#e4c97e',
                    border: '1px solid #e4c97e',
                    mb: 3
                  }}
                >
                  {error}
                  <Box sx={{ mt: 1 }}>
                    <Button 
                      size="small" 
                      onClick={() => setError(null)}
                      sx={{ color: '#e4c97e', textDecoration: 'underline' }}
                    >
                      Try Again
                    </Button>
                  </Box>
                </Alert>
              )}
              
              <ActionButton
                onClick={handleRegistration}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Account & Send Verification'}
              </ActionButton>
              
              <ActionButton
                onClick={() => setStep(1)}
                className="secondary"
              >
                Back to Profile
              </ActionButton>
            </Box>
          )}



          {/* Step 3: Payment (for paid tiers) */}
          {step === 3 && selectedTier !== 'free' && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                Complete Your Payment
              </Typography>
              <Typography sx={{ color: '#fff', mb: 3 }}>
                {requirePayment 
                  ? `Welcome back! Complete your payment to activate your subscription.`
                  : `Your account has been created! Complete your payment to activate your ${selectedTier === 'pro' ? 'AthroAi' : 'AthroAi LITE'} subscription.`
                }
              </Typography>
              <Typography sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 3 }}>
                {(() => {
                  // Determine display tier and price
                  let displayTier = selectedTier;
                  if (requirePayment && user && selectedTier === 'free' && user.user_metadata?.tier) {
                    displayTier = user.user_metadata.tier;
                  }
                  if (displayTier === 'free') displayTier = 'lite'; // Default fallback
                  
                  const tierName = displayTier === 'pro' ? 'AthroAi' : 'AthroAi LITE';
                  const price = displayTier === 'pro' ? '£14.99/month' : '£7.99/month';
                  
                  return `${tierName} - ${price}`;
                })()}
              </Typography>
              
              {error && (
                <Alert 
                  severity="error"
                  sx={{ 
                    backgroundColor: 'rgba(228, 201, 126, 0.1)',
                    color: '#e4c97e',
                    border: '1px solid #e4c97e',
                    mb: 3
                  }}
                >
                  {error}
                </Alert>
              )}
              
              <ActionButton
                onClick={async (e) => {
                  console.log('💳💳💳 STEP 3 PAYMENT BUTTON CLICKED!');
                  console.log('🔍 Payment details:', { 
                    event: e,
                    userId, 
                    selectedTier, 
                    requirePayment,
                    loading,
                    timestamp: new Date().toISOString()
                  });
                  
                  // Test if function exists
                  if (typeof handlePayment !== 'function') {
                    console.error('❌ handlePayment is not a function in Step 3!');
                    alert('ERROR: handlePayment function missing in Step 3!');
                    return;
                  }
                  
                  try {
                    await handlePayment();
                  } catch (err: unknown) {
                    console.error('❌ Step 3 payment error:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Payment failed';
                    setError(errorMessage);
                    alert(`Step 3 Payment Error: ${errorMessage}`);
                  }
                }}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Complete Payment'}
              </ActionButton>
              
              

              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography
                  component="span"
                  onClick={() => navigate('/login')}
                  sx={{ 
                    color: '#b5cbb2', 
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    '&:hover': {
                      color: '#e4c97e'
                    }
                  }}
                >
                  OR continue on current tier
                </Typography>
              </Box>
              
              <Typography sx={{ color: '#fff', fontSize: '0.875rem', mt: 2, opacity: 0.7 }}>
                ⚠️ Payment is required to activate your {selectedTier === 'pro' ? 'AthroAi' : selectedTier === 'lite' ? 'AthroAi LITE' : 'subscription'} subscription
              </Typography>
            </Box>
          )}
        </StyledPaper>
      </Overlay>
    </StyledContainer>
  );
}; 