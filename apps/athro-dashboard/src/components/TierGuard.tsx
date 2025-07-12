import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Button, Card, CardContent, Chip } from '@mui/material';
import { Lock, Upgrade, ShoppingCart, Star } from '@mui/icons-material';
import UpgradeModal from './Payment/UpgradeModal';

interface TierGuardProps {
  children: React.ReactNode;
  requiredTier: 'lite' | 'full';
  fallbackMessage?: string;
  showUpgradeButton?: boolean;
  feature?: string; // e.g., "Calendar scheduling", "Learning insights"
}

export const TierGuard: React.FC<TierGuardProps> = ({
  children,
  requiredTier,
  fallbackMessage,
  showUpgradeButton = true,
  feature = "this feature"
}) => {
  const { userTier, loading } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Show loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Check if user has required tier
  const hasAccess = () => {
    if (requiredTier === 'lite') {
      return userTier === 'lite' || userTier === 'full';
    }
    if (requiredTier === 'full') {
      return userTier === 'full';
    }
    return false;
  };

  const accessGranted = hasAccess();

  if (accessGranted) {
    return <>{children}</>;
  }

  // Generate tier-aware messages based on user's current tier
  const getTierAwareMessage = () => {
    const currentTier = userTier || 'free';
    
    switch (currentTier) {
      case 'free':
        return {
          title: `Unlock ${feature}`,
          message: fallbackMessage || `Unlock this feature with Lite or AthroAi.`,
          buttonText: "Go to Settings to Upgrade",
          buttonIcon: <Upgrade />,
          color: '#9e9e9e',
          chipLabel: 'FREE TIER'
        };
      case 'lite':
        return {
              title: `AthroAi Feature`,
    message: fallbackMessage || `Unlock this feature with AthroAi.`,
          buttonText: "Go to Settings to Upgrade",
          buttonIcon: <Star />,
          color: '#2196f3',
          chipLabel: 'LITE TIER'
        };
      case 'full':
        // This case should rarely happen, but could occur if tokens are exhausted
        return {
          title: `Tokens Required`,
          message: fallbackMessage || `You're out of tokens for this month. Buy more to keep going.`,
          buttonText: "Go to Settings to Buy Tokens",
          buttonIcon: <ShoppingCart />,
          color: '#e4c97e',
          chipLabel: 'ATHROAI TIER'
        };
      default:
        return {
          title: `Premium Feature`,
          message: fallbackMessage || `Upgrade your plan to access this feature.`,
          buttonText: "Go to Settings to Upgrade",
          buttonIcon: <Upgrade />,
          color: '#9e9e9e',
          chipLabel: 'UPGRADE NEEDED'
        };
    }
  };

  const tierInfo = getTierAwareMessage();

  // Show tier-aware upgrade prompt
  return (
    <>
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px" 
        p={2}
      >
        <Card sx={{ 
          maxWidth: 450, 
          textAlign: 'center',
          backgroundColor: 'rgba(28, 42, 30, 0.8)',
          border: `2px solid ${tierInfo.color}`,
          borderRadius: '16px',
          position: 'relative',
          overflow: 'visible'
        }}>
          {/* Tier Badge */}
          <Box sx={{ 
            position: 'absolute', 
            top: -12, 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 1
          }}>
            <Chip
              label={tierInfo.chipLabel}
              size="small"
              sx={{
                backgroundColor: tierInfo.color,
                color: tierInfo.color === '#e4c97e' ? '#1c2a1e' : '#fff',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                px: 1
              }}
            />
          </Box>

          <CardContent sx={{ pt: 4 }}>
            {/* Lock Icon */}
            <Lock sx={{ 
              fontSize: 48, 
              color: tierInfo.color, 
              mb: 2,
              opacity: 0.8
            }} />
            
            {/* Title */}
            <Typography variant="h6" sx={{ 
              color: tierInfo.color, 
              mb: 2, 
              fontWeight: 'bold' 
            }}>
              {tierInfo.title}
            </Typography>
            
            {/* Description */}
            <Typography sx={{ 
              color: '#b5cbb2', 
              mb: 3,
              lineHeight: 1.6
            }}>
              {tierInfo.message}
            </Typography>
            
            {/* Upgrade Button */}
            {showUpgradeButton && (
              <Button
                variant="contained"
                size="large"
                startIcon={tierInfo.buttonIcon}
                onClick={() => setUpgradeModalOpen(true)}
                sx={{
                  backgroundColor: tierInfo.color,
                  color: tierInfo.color === '#e4c97e' ? '#1c2a1e' : '#fff',
                  fontWeight: 'bold',
                  px: 3,
                  py: 1.2,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': {
                    backgroundColor: tierInfo.color,
                    opacity: 0.9,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${tierInfo.color}40`
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {tierInfo.buttonText}
              </Button>
            )}

            {/* Additional Info for Different Tiers */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(181, 203, 178, 0.2)' }}>
              <Typography variant="caption" sx={{ 
                color: '#b5cbb2',
                opacity: 0.8,
                fontStyle: 'italic'
              }}>
                        {userTier === 'free' && "Start with Lite (£7.99/month) for 1M tokens or go full with AthroAi (£14.99/month) for 1.6M tokens"}
        {userTier === 'lite' && "Upgrade to AthroAi (£14.99/month) for 1.6M tokens and token top-ups"}
                {userTier === 'full' && "Purchase additional tokens (£2.00 per pack) to continue using premium features"}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <UpgradeModal 
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
    </>
  );
};

export default TierGuard; 