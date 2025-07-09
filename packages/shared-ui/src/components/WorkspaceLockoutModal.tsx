/**
 * 🔒 WORKSPACE LOCKOUT MODAL
 * 
 * Beautiful modal shown when premium users exhaust their tokens.
 * Dashboard remains accessible, only workspace is locked.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  WorkOff,
  Add,
  Dashboard,
  Star,
  ArrowForward,
  AccessTime,
  TrendingUp,
  CheckCircle,
  Warning
} from '@mui/icons-material';

interface WorkspaceLockoutModalProps {
  open: boolean;
  onAddTokens: () => void;
  onBackToDashboard: () => void;
  onClose?: () => void;
  userStats?: {
    tokensUsed: number;
    totalTokens: number;
    sessionsToday: number;
    currentStreak: number;
  };
  reason?: string;
  tier?: string;
  remainingTokens?: number;
}

const WorkspaceLockoutModal: React.FC<WorkspaceLockoutModalProps> = ({
  open,
  onAddTokens,
  onBackToDashboard,
  onClose,
  userStats = {
    tokensUsed: 95000,
    totalTokens: 100000,
    sessionsToday: 8,
    currentStreak: 12
  },
  reason,
  tier,
  remainingTokens
}) => {
  const [showModal, setShowModal] = useState(open);

  // Listen for token limit events
  useEffect(() => {
    const handleShowUpgradeModal = (event: CustomEvent) => {
      const { reason: eventReason, remainingTokens: eventRemaining, tier: eventTier } = event.detail || {};
      console.log('🚨 Token limit reached:', { eventReason, eventRemaining, eventTier });
      setShowModal(true);
    };

    window.addEventListener('showUpgradeModal', handleShowUpgradeModal as EventListener);
    
    return () => {
      window.removeEventListener('showUpgradeModal', handleShowUpgradeModal as EventListener);
    };
  }, []);

  // Update modal state when prop changes
  useEffect(() => {
    setShowModal(open);
  }, [open]);

  const handleClose = () => {
    setShowModal(false);
    if (onClose) onClose();
  };

  const getUpgradeMessage = () => {
    if (reason) return reason;
    if (remainingTokens === 0) return "You've reached your monthly token limit";
    if (remainingTokens && remainingTokens <= 300) return `Only ${remainingTokens} tokens remaining`;
    return "You need more tokens to continue";
  };

  const getUpgradeOptions = () => {
    const currentTier = tier || 'free';
    
    if (currentTier === 'free') {
      return [
        {
          name: 'AthroAi Lite',
          price: '£7.99/month',
          tokens: '1,000,000',
          features: ['Full workspace access', 'Email support', 'Priority processing']
        },
        {
          name: 'AthroAi Pro',
          price: '£14.99/month',
          tokens: '1,602,000',
          features: ['Everything in Lite', 'Token top-ups', 'Advanced analytics', 'Priority support'],
          recommended: true
        }
      ];
    } else if (currentTier === 'lite') {
      return [
        {
          name: 'AthroAi Pro',
          price: '£14.99/month',
          tokens: '1,602,000',
          features: ['600K more tokens', 'Token top-ups', 'Advanced analytics', 'Priority support'],
          recommended: true
        }
      ];
    } else {
      return [
        {
          name: 'Token Top-up',
          price: '£2.00',
          tokens: '50,000',
          features: ['Instant token boost', 'No subscription change', 'Valid until next billing cycle']
        }
      ];
    }
  };

  return (
    <Dialog 
      open={showModal} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a2332 0%, #0f1419 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
          color: 'white'
        }
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: '0 20px 40px rgba(255, 107, 107, 0.3)'
            }}
          >
            <Warning sx={{ fontSize: 40, color: 'white' }} />
          </Box>

          {/* Title */}
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
            Token Limit Reached
          </Typography>
          
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 2 }}>
            {getUpgradeMessage()}
          </Typography>

          <Chip 
            label={`Current Plan: ${tier?.toUpperCase() || 'FREE'}`}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontWeight: 'bold'
            }} 
          />
        </Box>

        {/* Stats Card */}
        <Card sx={{ mb: 4, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp />
              Token Usage This Month
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">AI Tokens Used</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {userStats.tokensUsed.toLocaleString()}/{userStats.totalTokens.toLocaleString()}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(userStats.tokensUsed / userStats.totalTokens) * 100} 
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #ff9800, #f57c00)'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold">{userStats.sessionsToday}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Sessions Today</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold">{userStats.currentStreak}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Day Streak</Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Upgrade Options */}
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          Upgrade Options
        </Typography>

        <Stack spacing={3} sx={{ mb: 4 }}>
          {getUpgradeOptions().map((option, index) => (
            <Card 
              key={index}
              sx={{ 
                background: option.recommended 
                  ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(56, 142, 60, 0.2))'
                  : 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: option.recommended ? '2px solid #4caf50' : '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative'
              }}
            >
              {option.recommended && (
                <Chip 
                  label="RECOMMENDED"
                  size="small"
                  sx={{ 
                    position: 'absolute',
                    top: -10,
                    right: 16,
                    backgroundColor: '#4caf50',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              )}
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{option.name}</Typography>
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                      {option.price}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Tokens</Typography>
                    <Typography variant="h6" fontWeight="bold">{option.tokens}</Typography>
                  </Box>
                </Box>
                
                <Stack spacing={1}>
                  {option.features.map((feature, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                      <Typography variant="body2">{feature}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Divider sx={{ my: 3, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
          <Button
            onClick={onBackToDashboard}
            variant="outlined"
            size="large"
            startIcon={<Dashboard />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'white',
              '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            Back to Dashboard
          </Button>
          
          <Button
            onClick={onAddTokens}
            variant="contained"
            size="large"
            startIcon={<Add />}
            endIcon={<ArrowForward />}
            sx={{
              background: 'linear-gradient(135deg, #4caf50, #388e3c)',
              color: 'white',
              fontWeight: 'bold',
              px: 4,
              '&:hover': { 
                background: 'linear-gradient(135deg, #388e3c, #2e7d32)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)'
              }
            }}
          >
            Upgrade Now
          </Button>
        </Stack>

        {/* Reset Info */}
        <Box sx={{ textAlign: 'center', mt: 3, opacity: 0.6 }}>
          <Typography variant="caption">
            <AccessTime sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Tokens reset on your next billing cycle
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceLockoutModal; 