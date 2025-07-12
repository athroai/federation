import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Chip, Alert, LinearProgress, Tooltip } from '@mui/material';
import { Refresh, Warning, CheckCircle, MonetizationOn } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { TokenEnforcementService } from '../../packages/shared-services/src/TokenEnforcementService';

interface TokenStatus {
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  isLowTokenWarning: boolean;
  tier: string;
  usagePercentage: number;
  resetDate: string;
  lastChecked: string;
}

export const TokenStatusChecker: React.FC = () => {
  const { user, userTier } = useAuth();
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  /**
   * 🔄 MANUAL TOKEN CHECK - User triggers this manually (no auto-refresh)
   * This prevents screen flicker and constant reloading as requested
   */
  const handleManualTokenCheck = async () => {
    if (!user?.id) {
      setError('Please log in to check token status');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [TokenStatusChecker] Manual token check initiated by user');
      
      // Create enforcement service instance
      const tokenEnforcement = new TokenEnforcementService();
      
      // Get current balance from database
      const balance = await tokenEnforcement.getCurrentBalance(user.id);
      
      const usagePercentage = balance.totalTokens > 0 
        ? ((balance.usedTokens / balance.totalTokens) * 100) 
        : 0;

      const status: TokenStatus = {
        totalTokens: balance.totalTokens,
        usedTokens: balance.usedTokens,
        remainingTokens: balance.remainingTokens,
        isLowTokenWarning: balance.isLowTokenWarning,
        tier: balance.tier,
        usagePercentage,
        resetDate: balance.resetDate,
        lastChecked: new Date().toISOString()
      };

      setTokenStatus(status);
      setLastChecked(new Date());

      console.log('✅ [TokenStatusChecker] Manual check complete:', {
        used: status.usedTokens,
        remaining: status.remainingTokens,
        total: status.totalTokens,
        percentage: Math.round(status.usagePercentage)
      });

      // Check for low token warning
      if (balance.isLowTokenWarning) {
        await tokenEnforcement.sendLowTokenNotification(user.id);
      }

    } catch (err) {
      console.error('❌ [TokenStatusChecker] Manual check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to check token status');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get status color based on remaining tokens
   */
  const getStatusColor = (percentage: number): string => {
    if (percentage >= 75) return '#4caf50'; // Green
    if (percentage >= 50) return '#ff9800'; // Orange  
    if (percentage >= 25) return '#f44336'; // Red
    return '#9e9e9e'; // Gray
  };

  /**
   * Get status message
   */
  const getStatusMessage = (status: TokenStatus): string => {
    const remaining = status.remainingTokens;
    const percentage = ((remaining / status.totalTokens) * 100);
    
    if (percentage <= 5) return 'Critical: Very low tokens remaining';
    if (percentage <= 15) return 'Warning: Low tokens remaining';
    if (percentage <= 50) return 'Caution: Moderate token usage';
    return 'Good: Plenty of tokens available';
  };

  /**
   * Format number with commas
   */
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <Card sx={{ 
      backgroundColor: 'rgba(28, 42, 30, 0.8)', 
      border: '1px solid #4a6741',
      maxWidth: 500,
      margin: 'auto'
    }}>
      <CardContent>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <MonetizationOn />
            Token Status Checker
          </Typography>

          {/* Manual Check Button */}
          <Button
            variant="contained"
            onClick={handleManualTokenCheck}
            disabled={loading}
            startIcon={loading ? <LinearProgress sx={{ width: 20 }} /> : <Refresh />}
            sx={{
              backgroundColor: '#e4c97e',
              color: '#1c2a1e',
              fontWeight: 'bold',
              mb: 2,
              '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.8)' },
              '&:disabled': { backgroundColor: '#666', color: '#999' }
            }}
          >
            {loading ? 'Checking...' : 'Check Token Status'}
          </Button>

          {/* Last Checked Info */}
          {lastChecked && (
            <Typography variant="caption" sx={{ color: '#b5cbb2', display: 'block', mb: 2 }}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Typography>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(244, 67, 54, 0.1)' }}>
              {error}
            </Alert>
          )}

          {/* Token Status Display */}
          {tokenStatus && (
            <Box sx={{ mt: 2 }}>
              {/* Tier Display */}
              <Chip 
                label={`${tokenStatus.tier.charAt(0).toUpperCase()}${tokenStatus.tier.slice(1)} Tier`}
                sx={{ 
                  backgroundColor: '#4a6741', 
                  color: '#e4c97e',
                  fontWeight: 'bold',
                  mb: 2
                }}
              />

              {/* Usage Progress Bar */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 1 }}>
                  Token Usage: {Math.round(tokenStatus.usagePercentage)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={tokenStatus.usagePercentage} 
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getStatusColor(100 - tokenStatus.usagePercentage),
                      borderRadius: 4
                    }
                  }}
                />
              </Box>

              {/* Token Numbers */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#b5cbb2' }}>Used</Typography>
                  <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    {formatNumber(tokenStatus.usedTokens)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#b5cbb2' }}>Remaining</Typography>
                  <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {formatNumber(tokenStatus.remainingTokens)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#b5cbb2' }}>Total</Typography>
                  <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                    {formatNumber(tokenStatus.totalTokens)}
                  </Typography>
                </Box>
              </Box>

              {/* Status Message */}
              <Alert 
                severity={tokenStatus.isLowTokenWarning ? 'warning' : 'success'}
                icon={tokenStatus.isLowTokenWarning ? <Warning /> : <CheckCircle />}
                sx={{ 
                  backgroundColor: tokenStatus.isLowTokenWarning 
                    ? 'rgba(255, 152, 0, 0.1)' 
                    : 'rgba(76, 175, 80, 0.1)',
                  mb: 2
                }}
              >
                {getStatusMessage(tokenStatus)}
              </Alert>

              {/* Reset Date */}
              <Typography variant="caption" sx={{ color: '#b5cbb2' }}>
                Tokens reset: {new Date(tokenStatus.resetDate).toLocaleDateString()}
              </Typography>

              {/* Top-up Hint for Full Tier */}
              {tokenStatus.tier === 'full' && tokenStatus.isLowTokenWarning && (
                <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(228, 201, 126, 0.1)', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: '#e4c97e' }}>
                    💡 As a Full tier user, you can purchase additional token packs for £2.00 each
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Instructions */}
          {!tokenStatus && !error && (
            <Typography variant="body2" sx={{ color: '#b5cbb2', fontStyle: 'italic' }}>
              Click "Check Token Status" to see your current usage.
              <br />
              No automatic refreshing - you control when to check! 🎛️
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}; 