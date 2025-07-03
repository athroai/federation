/**
 * 🚫 FULL APP LOCKOUT MODAL
 * 
 * Beautiful themed modal shown when free tier users exhaust their 15-minute limit.
 * All user data is cleared and app is fully locked until upgrade.
 */

import React from 'react';
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
  IconButton,
  Stack,
  Divider
} from '@mui/material';
import {
  Lock,
  Timer,
  Star,
  ArrowForward,
  RestartAlt,
  Lightbulb,
  TrendingUp,
  WorkspacePremium
} from '@mui/icons-material';

interface FullAppLockoutModalProps {
  open: boolean;
  onUpgrade: () => void;
  onRestart?: () => void; // For demo purposes
  userProgress?: {
    sessionsCompleted: number;
    athrosExplored: number;
    minutesUsed: number;
  };
}

const FullAppLockoutModal: React.FC<FullAppLockoutModalProps> = ({
  open,
  onUpgrade,
  onRestart,
  userProgress = { sessionsCompleted: 0, athrosExplored: 0, minutesUsed: 15 }
}) => {
  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          overflow: 'visible'
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/world/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.1,
            zIndex: 0
          }}
        />
        
        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1, p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                mb: 2,
                animation: 'pulse 2s infinite'
              }}
            >
              <Timer sx={{ fontSize: 40, color: '#ff6b6b' }} />
            </Box>
            
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Time's Up! 🕐
            </Typography>
            
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
              Your 15-minute free trial has ended
            </Typography>
            
            <Chip
              icon={<Lock />}
              label="FULL APP LOCKED"
              sx={{
                backgroundColor: 'rgba(255, 107, 107, 0.2)',
                color: '#ff6b6b',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                height: 36
              }}
            />
          </Box>

          {/* Progress Summary */}
          <Card sx={{ mb: 4, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp />
                Your Trial Progress
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Time Used</Typography>
                    <Typography variant="body2" fontWeight="bold">{userProgress.minutesUsed}/15 minutes</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={100} 
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #ff6b6b, #ff8e53)'
                      }
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">{userProgress.sessionsCompleted}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>Sessions Completed</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">{userProgress.athrosExplored}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>Athros Explored</Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card sx={{ mb: 4, background: 'rgba(255, 193, 7, 0.2)', border: '1px solid rgba(255, 193, 7, 0.5)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Lightbulb sx={{ color: '#ffc107', fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#ffc107' }}>
                    Important Notice
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Your progress has been cleared. Upgrade now to continue learning with unlimited access.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Upgrade Options */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
              Choose Your Plan
            </Typography>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Lite Plan */}
              <Card 
                sx={{ 
                  flex: 1, 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    background: 'rgba(255, 255, 255, 0.15)'
                  }
                }}
                onClick={onUpgrade}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Star sx={{ fontSize: 32, color: '#4fc3f7', mb: 1 }} />
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Lite Plan
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                    Chat platform access
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="#4fc3f7">
                    $9.99
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    /month
                  </Typography>
                </CardContent>
              </Card>

              {/* Premium Plan */}
              <Card 
                sx={{ 
                  flex: 1, 
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '2px solid #ffd700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)'
                  }
                }}
                onClick={onUpgrade}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <WorkspacePremium sx={{ fontSize: 32, color: '#333', mb: 1 }} />
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#333' }}>
                    Premium Plan
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#555', mb: 2 }}>
                    Full athro.ai access
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#333' }}>
                    $19.99
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    /month
                  </Typography>
                  <Chip
                    label="RECOMMENDED"
                    size="small"
                    sx={{
                      mt: 1,
                      backgroundColor: '#333',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </CardContent>
              </Card>
            </Stack>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={onUpgrade}
              endIcon={<ArrowForward />}
              sx={{
                background: 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)',
                fontWeight: 'bold',
                px: 4,
                py: 1.5,
                borderRadius: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #29b6f6 0%, #0277bd 100%)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Upgrade Now
            </Button>
            
            {onRestart && (
              <Button
                variant="outlined"
                size="large"
                onClick={onRestart}
                startIcon={<RestartAlt />}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Restart Trial
              </Button>
            )}
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FullAppLockoutModal; 