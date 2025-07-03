/**
 * 🔒 WORKSPACE LOCKOUT MODAL
 * 
 * Beautiful modal shown when premium users exhaust their tokens.
 * Dashboard remains accessible, only workspace is locked.
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
  CheckCircle
} from '@mui/icons-material';

interface WorkspaceLockoutModalProps {
  open: boolean;
  onAddTokens: () => void;
  onBackToDashboard: () => void;
  userStats?: {
    tokensUsed: number;
    totalTokens: number;
    sessionsToday: number;
    currentStreak: number;
  };
}

const WorkspaceLockoutModal: React.FC<WorkspaceLockoutModalProps> = ({
  open,
  onAddTokens,
  onBackToDashboard,
  userStats = { tokensUsed: 50000, totalTokens: 50000, sessionsToday: 8, currentStreak: 5 }
}) => {
  const tokenPackages = [
    { tokens: 25000, price: 4.99, hours: '~3 hours', popular: false },
    { tokens: 50000, price: 8.99, hours: '~6 hours', popular: true },
    { tokens: 100000, price: 15.99, hours: '~12 hours', popular: false }
  ];

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
              <WorkOff sx={{ fontSize: 40, color: '#ff9800' }} />
            </Box>
            
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Workspace Tokens Exhausted 🚀
            </Typography>
            
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
              You've used all your AI tokens for today!
            </Typography>
            
            <Chip
              icon={<CheckCircle />}
              label="DASHBOARD STILL AVAILABLE"
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                color: '#4caf50',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                height: 36
              }}
            />
          </Box>

          {/* Token Usage Summary */}
          <Card sx={{ mb: 4, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp />
                Today's Activity
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

          {/* Available Options */}
          <Card sx={{ mb: 4, background: 'rgba(76, 175, 80, 0.2)', border: '1px solid rgba(76, 175, 80, 0.5)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Dashboard sx={{ color: '#4caf50', fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#4caf50' }}>
                    Dashboard Still Available
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Continue using insights, calendar, and other dashboard features while your workspace is temporarily locked.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Token Packages */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
              Add More AI Time
            </Typography>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {tokenPackages.map((pkg, index) => (
                <Card 
                  key={index}
                  sx={{ 
                    flex: 1, 
                    background: pkg.popular 
                      ? 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)'
                      : 'rgba(255, 255, 255, 0.1)', 
                    backdropFilter: pkg.popular ? 'none' : 'blur(10px)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: pkg.popular ? '2px solid #ffd700' : 'none',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      background: pkg.popular 
                        ? 'linear-gradient(135deg, #ffb300 0%, #ff8f00 100%)'
                        : 'rgba(255, 255, 255, 0.15)'
                    }
                  }}
                  onClick={onAddTokens}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    {pkg.popular && (
                      <Chip
                        label="POPULAR"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: '#333',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                    
                    <AccessTime sx={{ 
                      fontSize: 32, 
                      color: pkg.popular ? '#333' : '#4fc3f7', 
                      mb: 1 
                    }} />
                    
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{
                      color: pkg.popular ? '#333' : 'white'
                    }}>
                      {pkg.tokens.toLocaleString()} Tokens
                    </Typography>
                    
                    <Typography variant="body2" sx={{ 
                      opacity: 0.8, 
                      mb: 2,
                      color: pkg.popular ? '#555' : 'white'
                    }}>
                      {pkg.hours} of AI time
                    </Typography>
                    
                    <Typography variant="h4" fontWeight="bold" sx={{
                      color: pkg.popular ? '#333' : '#4fc3f7'
                    }}>
                      ${pkg.price}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={onAddTokens}
              startIcon={<Add />}
              sx={{
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                fontWeight: 'bold',
                px: 4,
                py: 1.5,
                borderRadius: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Add More Time
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={onBackToDashboard}
              endIcon={<ArrowForward />}
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
              Back to Dashboard
            </Button>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceLockoutModal; 