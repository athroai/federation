import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider
} from '@mui/material';
import {
  Star,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  MonetizationOn,
  Check,
  Info,
  Settings,
  CalendarToday,
  Analytics,
  SelfImprovement,
  Psychology,
  CloudUpload,
  School,
  RocketLaunch,
  AutorenewOutlined,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionService, TokenMeterService } from '@athro/shared-services';
import { stripeService } from '../../services/StripeService';
import UpgradeModal from '../Payment/UpgradeModal';
import { useSearchParams } from 'react-router-dom';


interface TokenBalance {
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  isLowTokenWarning: boolean;
  resetDate: string;
}

interface SubscriptionControlPanelProps {
  onClose?: () => void;
}

const SubscriptionControlPanel: React.FC<SubscriptionControlPanelProps> = ({ onClose }) => {
  const { user, userTier: authUserTier, subscription } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [tokenPurchaseModalOpen, setTokenPurchaseModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Use tier from AuthContext instead of local state
  const userTier = authUserTier || 'free';

  useEffect(() => {
    loadUserData();
  }, [user?.id, authUserTier]);

  // Check for token purchase completion and refresh balance
  useEffect(() => {
    const checkTokenPurchaseCompletion = async () => {
      const tokenPurchaseSuccess = searchParams.get('token_purchase_success');
      const sessionId = searchParams.get('session_id');
      
      if (tokenPurchaseSuccess === 'true' || sessionId) {
        console.log('🔍 Detected return from token purchase, refreshing balance...');
        
        // Wait a moment for webhook to process, then refresh
        setTimeout(async () => {
          await loadTokenBalance();
          console.log('✅ Token balance refreshed after purchase');
        }, 1000);
        
        // Clean up URL parameters
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('token_purchase_success');
        newSearchParams.delete('session_id');
        newSearchParams.delete('type');
        setSearchParams(newSearchParams, { replace: true });
      }
    };
    
    checkTokenPurchaseCompletion();
  }, [searchParams, setSearchParams]);


  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      await loadTokenBalance();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTokenBalance = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingTokens(true);
      console.log('🔋 [TokenBalance] Loading token balance for user:', user.id, 'tier:', userTier);
      
      // FIXED: Use tier from AuthContext instead of broken subscription service
      
      // Always proceed with userTier from AuthContext
      {
        const tokenMeterService = new TokenMeterService();
        console.log('🔋 [TokenBalance] TokenMeterService created, calling getTokenBalance...');
        
        const tokenData = await tokenMeterService.getTokenBalance(user.id, userTier);
        
        console.log('🔋 [TokenBalance] Raw token data from service:', tokenData);
        
        setTokenBalance({
          totalTokens: tokenData.totalTokens,
          usedTokens: tokenData.usedTokens,
          remainingTokens: tokenData.remainingTokens,
          isLowTokenWarning: tokenData.remainingTokens <= 300 && tokenData.remainingTokens > 0,
          resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        console.log('🔋 [TokenBalance] Token balance set in state:', {
          totalTokens: tokenData.totalTokens,
          usedTokens: tokenData.usedTokens,
          remainingTokens: tokenData.remainingTokens
        });
      }
    } catch (error) {
      console.error('❌ [TokenBalance] Error loading token balance:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'free':
        return {
          name: 'Free',
          price: 'Free',
          color: '#9e9e9e',
          features: ['100,000 tokens/month', 'GPT-4.1 for quizzes only', 'Community support'],
          description: 'Free entry point'
        };
      case 'lite':
        return {
          name: 'AthroAi Lite',
          price: '£7.99/month',
          color: '#2196f3',
          features: ['1,000,000 tokens/month', 'GPT-4.1 mini only', 'No top-ups available', 'Full workspace access', 'Full dashboard access', 'Document upload & analysis', 'Progress saved permanently', 'Community support'],
          description: 'Perfect for focused studying'
        };
      case 'full':
        return {
          name: 'AthroAi',
          price: '£14.99/month',
          color: '#e4c97e',
          features: [
            '1,602,000 tokens/month',
            'Mixed GPT-4.1 + mini models',
            'Token top-ups available (£2.00/pack = 320K tokens)',
            'Advanced study calendar',
            'Performance analytics & insights',
            'Wellbeing & mood tracking',
            'Mind maps & visual learning',
            'Advanced flashcard system',
            'Resource management',
            'Study playlists',
            'Premium quiz generation',
            'Priority email support'
          ],
          description: 'Ultimate learning experience'
        };
      default:
        return {
          name: 'Unknown',
          price: 'N/A',
          color: '#9e9e9e',
          features: [],
          description: ''
        };
    }
  };

  const currentTierInfo = getTierInfo(userTier || 'free');
  const tokenUsagePercentage = tokenBalance ? (tokenBalance.usedTokens / tokenBalance.totalTokens) * 100 : 0;

  const getUpgradeOptions = () => {
    const current = userTier || 'free';
    const options = [];

    if (current === 'free') {
      options.push(
        { tier: 'lite', ...getTierInfo('lite'), savings: null },
        { tier: 'full', ...getTierInfo('full'), savings: 'Most Popular' }
      );
    } else if (current === 'lite') {
      options.push(
        { tier: 'full', ...getTierInfo('full'), savings: '600K more tokens' }
      );
    }

    return options;
  };

  const handleUpgrade = (targetTier: string) => {
    setUpgradeModalOpen(true);
  };

  const handleTokenPurchase = () => {
    if (!user?.id) {
      console.error('❌ No user found for token purchase');
      return;
    }

    if (userTier !== 'full') {
      console.error('❌ Token top-ups only available for Full tier users');
      return;
    }

    // Open the themed modal instead of browser alert
    setTokenPurchaseModalOpen(true);
  };

  const handleConfirmTokenPurchase = () => {
    if (!user?.id) {
      console.error('❌ No user ID for token purchase');
      return;
    }

    console.log('🛒 User confirmed token purchase - using direct URL approach');
    
    // Close the modal first
    setTokenPurchaseModalOpen(false);
    
    // Use direct Stripe buy button URL (same approach as tier upgrades)
    const url = stripeService.getTokenPurchaseUrl(user.id);
    console.log('✅ Redirecting to Stripe checkout:', url);
    window.location.href = url;
  };



  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography sx={{ color: '#e4c97e' }}>Loading subscription details...</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
          Subscription Control Panel
        </Typography>
        <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
          Please log in to view your subscription details.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 1 }}>
          Subscription Control Panel
        </Typography>
        <Typography variant="body1" sx={{ color: '#b5cbb2' }}>
          Manage your subscription and monitor your usage
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Current Plan Overview */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            background: `linear-gradient(135deg, rgba(28, 42, 30, 0.9) 0%, rgba(228, 201, 126, 0.1) 100%)`,
            border: `2px solid ${currentTierInfo.color}`,
            borderRadius: '1rem',
            position: 'relative',
            overflow: 'visible'
          }}>
            {userTier === 'full' && (
              <Chip
                label="PREMIUM"
                sx={{
                  position: 'absolute',
                  top: -10,
                  right: 20,
                  backgroundColor: '#e4c97e',
                  color: '#1c2a1e',
                  fontWeight: 'bold',
                  fontSize: '0.7rem'
                }}
              />
            )}
            
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Star sx={{ color: currentTierInfo.color, fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" sx={{ color: currentTierInfo.color, fontWeight: 'bold' }}>
                    {currentTierInfo.name}
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#b5cbb2' }}>
                    {currentTierInfo.price}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body1" sx={{ color: '#b5cbb2', mb: 3 }}>
                {currentTierInfo.description}
              </Typography>

              {/* Token Usage Visualization */}
              {tokenBalance && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#e4c97e' }}>
                      Token Usage This Month
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<Refresh />}
                        onClick={loadTokenBalance}
                        disabled={loadingTokens}
                        sx={{
                          color: '#b5cbb2',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          minWidth: 'auto',
                          '&:hover': { backgroundColor: 'rgba(181, 203, 178, 0.1)' }
                        }}
                      >
                        {loadingTokens ? 'Refreshing...' : 'Refresh'}
                      </Button>
                      <Tooltip title="Tokens reset on your billing cycle">
                        <Info sx={{ color: '#b5cbb2', fontSize: 16 }} />
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  <Box sx={{ position: 'relative', mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={tokenUsagePercentage}
                      sx={{
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: 'rgba(181, 203, 178, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          background: tokenBalance.isLowTokenWarning 
                            ? 'linear-gradient(90deg, #ff9800 0%, #f44336 100%)'
                            : 'linear-gradient(90deg, #4fc38a 0%, #e4c97e 100%)',
                          borderRadius: 10,
                        }
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        textShadow: '0 1px 2px rgba(0,0,0,0.7)'
                      }}
                    >
                      {tokenUsagePercentage.toFixed(1)}%
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ color: '#4fc38a', fontWeight: 'bold' }}>
                          {tokenBalance.remainingTokens.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2' }}>
                          Remaining
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                          {tokenBalance.usedTokens.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2' }}>
                          Used
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                          {tokenBalance.totalTokens.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2' }}>
                          Total
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {tokenBalance.isLowTokenWarning && (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        mt: 2,
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        color: '#ff9800',
                        '& .MuiAlert-icon': { color: '#ff9800' }
                      }}
                    >
                      You're running low on tokens! Consider purchasing more or upgrading your plan.
                    </Alert>
                  )}
                </Box>
              )}

              {/* Current Plan Features */}
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#e4c97e', mb: 2 }}>
                  Your Current Features
                </Typography>
                <Grid container spacing={1}>
                  {currentTierInfo.features.map((feature, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Check sx={{ color: currentTierInfo.color, fontSize: 16 }} />
                        <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                          {feature}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Token Top-up (Full tier only) */}
            {userTier === 'full' && (
              <Card sx={{ backgroundColor: 'rgba(28, 42, 30, 0.8)', border: '1px solid #e4c97e' }}>
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <MonetizationOn sx={{ color: '#e4c97e', fontSize: 32, mb: 1 }} />
                    <Typography variant="h6" sx={{ color: '#e4c97e', mb: 1 }}>
                      Need More Tokens?
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 2 }}>
                      Purchase 320,000 additional tokens for £2.00 per pack
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ShoppingCart />}
                      onClick={handleTokenPurchase}
                      sx={{
                        backgroundColor: '#e4c97e',
                        color: '#1c2a1e',
                        fontWeight: 'bold',
                        '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.8)' }
                      }}
                    >
                      Buy 320K Token Pack (£2.00)
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Billing Management */}
            <Card sx={{ backgroundColor: 'rgba(28, 42, 30, 0.8)', border: '1px solid #4fc38a' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <CreditCard sx={{ color: '#4fc38a', fontSize: 32, mb: 1 }} />
                  <Typography variant="h6" sx={{ color: '#4fc38a', mb: 1 }}>
                    Billing
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 2 }}>
                    Manage payment methods and billing history
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Settings />}
                    sx={{
                      borderColor: '#4fc38a',
                      color: '#4fc38a',
                      '&:hover': { backgroundColor: 'rgba(79, 195, 138, 0.1)' }
                    }}
                  >
                    Manage Billing
                  </Button>
                </Box>
              </CardContent>
            </Card>


          </Box>
        </Grid>

        {/* Incredible Upgrade Section */}
        {getUpgradeOptions().length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(228, 201, 126, 0.15) 0%, rgba(79, 195, 138, 0.1) 50%, rgba(28, 42, 30, 0.9) 100%)',
              border: '3px solid #e4c97e',
              borderRadius: '1.5rem',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, transparent 30%, rgba(228, 201, 126, 0.1) 50%, transparent 70%)',
                animation: 'shimmer 3s ease-in-out infinite',
                '@keyframes shimmer': {
                  '0%, 100%': { opacity: 0 },
                  '50%': { opacity: 1 }
                }
              }
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                {/* Header with Icon */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mb: 4 }}>
                  <RocketLaunch sx={{ 
                    color: '#e4c97e', 
                    fontSize: 48,
                    filter: 'drop-shadow(0 0 20px rgba(228, 201, 126, 0.6))',
                    animation: 'float 3s ease-in-out infinite',
                    '@keyframes float': {
                      '0%, 100%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-10px)' }
                    }
                  }} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ 
                      color: '#e4c97e', 
                      fontWeight: 900,
                      textShadow: '0 0 20px rgba(228, 201, 126, 0.6)',
                      background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontSize: { xs: '2rem', md: '2.5rem' }
                    }}>
                      Unlock Your Potential
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#4fc38a', fontWeight: 'bold', mt: 1 }}>
                      Upgrade to AthroAi Full Experience
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={4}>
                  {getUpgradeOptions().map((option, index) => (
                    <Grid item xs={12} key={option.tier}>
                      <Card sx={{
                        background: 'linear-gradient(135deg, rgba(228, 201, 126, 0.2) 0%, rgba(28, 42, 30, 0.9) 100%)',
                        border: '2px solid #e4c97e',
                        borderRadius: '1.2rem',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: '0 20px 40px rgba(228, 201, 126, 0.3)',
                          border: '2px solid #4fc38a'
                        }
                      }}>
                        <CardContent sx={{ p: 4 }}>
                          <Grid container spacing={3}>
                            {/* Left Side - Image and Title */}
                            <Grid item xs={12} md={4}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Box
                                  component="img"
                                  src="/png/tiers/pro.png"
                                  alt="AthroAi Pro"
                                  sx={{
                                    width: '100%',
                                    maxWidth: '200px',
                                    height: 'auto',
                                    borderRadius: '1rem',
                                    mb: 2,
                                    filter: 'drop-shadow(0 0 20px rgba(228, 201, 126, 0.4))',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                      transform: 'scale(1.05)',
                                      filter: 'drop-shadow(0 0 30px rgba(228, 201, 126, 0.6))'
                                    }
                                  }}
                                />
                                <Typography variant="h4" sx={{ 
                                  color: '#e4c97e', 
                                  fontWeight: 'bold',
                                  textShadow: '0 0 15px rgba(228, 201, 126, 0.5)',
                                  mb: 1
                                }}>
                                  {option.name}
                                </Typography>
                                <Typography variant="h3" sx={{ 
                                  color: '#4fc38a', 
                                  fontWeight: 900,
                                  textShadow: '0 0 15px rgba(79, 195, 138, 0.5)'
                                }}>
                                  {option.price}
                                </Typography>
                              </Box>
                            </Grid>

                            {/* Middle - Features */}
                            <Grid item xs={12} md={5}>
                              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 3, fontWeight: 'bold' }}>
                                ✨ What You Get:
                              </Typography>
                              <Grid container spacing={1}>
                                {option.features.slice(0, 6).map((feature, featureIndex) => (
                                  <Grid item xs={12} sm={6} key={featureIndex}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                      <Check sx={{ 
                                        color: '#4fc38a', 
                                        fontSize: 18,
                                        filter: 'drop-shadow(0 0 8px rgba(79, 195, 138, 0.6))'
                                      }} />
                                      <Typography variant="body2" sx={{ 
                                        color: '#fff', 
                                        fontSize: '0.9rem',
                                        fontWeight: 500 
                                      }}>
                                        {feature}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                ))}
                              </Grid>
                              
                              {/* Feature Icons */}
                              <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center' }}>
                                <CalendarToday sx={{ color: '#e4c97e', fontSize: 24, opacity: 0.8 }} />
                                <Analytics sx={{ color: '#e4c97e', fontSize: 24, opacity: 0.8 }} />
                                <SelfImprovement sx={{ color: '#e4c97e', fontSize: 24, opacity: 0.8 }} />
                                <Psychology sx={{ color: '#e4c97e', fontSize: 24, opacity: 0.8 }} />
                                <CloudUpload sx={{ color: '#e4c97e', fontSize: 24, opacity: 0.8 }} />
                                <School sx={{ color: '#e4c97e', fontSize: 24, opacity: 0.8 }} />
                              </Box>
                            </Grid>

                            {/* Right Side - CTA */}
                            <Grid item xs={12} md={3}>
                              <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'center', 
                                height: '100%',
                                textAlign: 'center'
                              }}>
                                <Typography variant="h6" sx={{ 
                                  color: '#4fc38a', 
                                  fontWeight: 'bold', 
                                  mb: 3,
                                  textShadow: '0 0 10px rgba(79, 195, 138, 0.5)'
                                }}>
                                  🚀 Ready to Level Up?
                                </Typography>
                                
                                <Button
                                  variant="contained"
                                  size="large"
                                  onClick={() => handleUpgrade(option.tier)}
                                  sx={{
                                    background: 'linear-gradient(45deg, #e4c97e 30%, #4fc38a 90%)',
                                    color: '#1c2a1e',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    py: 2,
                                    px: 4,
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    boxShadow: '0 8px 24px rgba(228, 201, 126, 0.4)',
                                    border: '2px solid transparent',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                      background: 'linear-gradient(45deg, #4fc38a 30%, #e4c97e 90%)',
                                      transform: 'scale(1.05)',
                                      boxShadow: '0 12px 32px rgba(79, 195, 138, 0.5)',
                                      border: '2px solid #e4c97e'
                                    },
                                    '&:active': {
                                      transform: 'scale(0.98)'
                                    }
                                  }}
                                >
                                  Upgrade Now
                                  <RocketLaunch sx={{ ml: 1, fontSize: 20 }} />
                                </Button>

                                <Typography variant="body2" sx={{ 
                                  color: '#b5cbb2', 
                                  mt: 2, 
                                  fontStyle: 'italic',
                                  opacity: 0.8
                                }}>
                                  Join thousands of successful students
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Upgrade Modal */}
      <UpgradeModal 
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />

      {/* Token Purchase Modal */}
      <Dialog
        open={tokenPurchaseModalOpen}
        onClose={() => setTokenPurchaseModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(28, 42, 30, 0.95)',
            border: '2px solid #e4c97e',
            borderRadius: '1rem',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          backgroundColor: 'rgba(228, 201, 126, 0.1)',
          borderBottom: '1px solid rgba(228, 201, 126, 0.3)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <ShoppingCart sx={{ color: '#e4c97e', fontSize: 32 }} />
            <Typography variant="h5" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
              Token Pack Purchase
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          <Paper 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(228, 201, 126, 0.1)',
              border: '1px solid rgba(228, 201, 126, 0.3)',
              borderRadius: '0.8rem',
              mb: 3
            }}
          >
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                               <AutorenewOutlined sx={{ color: '#e4c97e', fontSize: 28 }} />
               <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                 AthroAi Token Pack
               </Typography>
             </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 1 }}>
                  Pack Size:
                </Typography>
                <Typography variant="h5" sx={{ color: '#4fc38a', fontWeight: 'bold' }}>
                  320,000 tokens
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 1 }}>
                  Price:
                </Typography>
                <Typography variant="h5" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                  £2.00 GBP
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2, borderColor: 'rgba(228, 201, 126, 0.3)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Star sx={{ color: '#e4c97e', fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                Your Tier: <strong style={{ color: '#e4c97e' }}>{userTier?.toUpperCase()}</strong>
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: '#b5cbb2', lineHeight: 1.6 }}>
              This token pack will be added to your current monthly allowance and can be used for any AthroAi features including advanced AI models, document processing, and premium content generation.
            </Typography>
          </Paper>

          <Alert 
            severity="info" 
            sx={{ 
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              '& .MuiAlert-message': { color: '#b5cbb2' }
            }}
          >
            <Typography variant="body2">
              <strong>💡 What happens next:</strong><br/>
              1. Click "Purchase Now" to go to secure Stripe checkout<br/>
              2. Complete your payment (£2.00)<br/>
              3. Tokens are automatically added to your account<br/>
              4. Start using your extra tokens immediately!
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setTokenPurchaseModalOpen(false)}
            sx={{
              color: '#b5cbb2',
              borderColor: 'rgba(181, 203, 178, 0.3)',
              '&:hover': {
                borderColor: '#b5cbb2',
                backgroundColor: 'rgba(181, 203, 178, 0.1)'
              }
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleConfirmTokenPurchase}
            variant="contained"
            startIcon={<CreditCard />}
            sx={{
              background: 'linear-gradient(45deg, #e4c97e 30%, #4fc38a 90%)',
              color: '#1c2a1e',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(228, 201, 126, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #4fc38a 30%, #e4c97e 90%)',
                boxShadow: '0 6px 24px rgba(79, 195, 138, 0.4)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Purchase Now - £2.00
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionControlPanel; 