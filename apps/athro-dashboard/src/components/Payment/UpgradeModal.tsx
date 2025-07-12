import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Check,
  Star,
  Close,
  CalendarToday,
  Analytics,
  SelfImprovement,
  School,
  CloudUpload,
  Psychology
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ open, onClose }) => {
  const { user, userTier } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Stripe script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/buy-button.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const liteFeatures = [
    '1,000,000 tokens per month',
    'Full workspace access',
    'Full dashboard access',
    'Advanced AI conversation',
    'Document upload & analysis',
    'Progress saved permanently',
    'Community support'
  ];

  const fullFeatures = [
    '1,602,000 tokens per month',
    'Everything in Lite',
    'Token top-ups available (£2.00/pack)',
    'Advanced study calendar',
    'Performance analytics & insights',
    'Wellbeing & mood tracking',
    'Mind maps & visual learning',
    'Advanced flashcard system',
    'Resource management',
    'Study playlists',
    'Premium quiz generation',
    'Priority email support'
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1c2a1e',
          border: '2px solid #e4c97e',
          borderRadius: '1.5rem'
        }
      }}
    >
      <DialogTitle sx={{ 
        color: '#e4c97e', 
        textAlign: 'center',
        borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
        pb: 2
      }}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
          <Star sx={{ color: '#e4c97e' }} />
          <Box component="span" fontWeight="bold" fontSize="1.5rem">
                          Choose Your AthroAi Plan
          </Box>
          <Star sx={{ color: '#e4c97e' }} />
        </Box>
        <Box sx={{ color: '#b5cbb2', mt: 1, fontSize: '1rem' }}>
          Unlock your learning potential with AI-powered study tools
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(244, 67, 54, 0.1)' }}>
            {error}
          </Alert>
        )}

        <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }}>
          {/* Lite Plan - £7.99 */}
          <Card sx={{ 
            flex: 1,
            backgroundColor: 'rgba(28, 42, 30, 0.6)',
            border: '1px solid #b5cbb2',
            borderRadius: '1rem'
          }}>
            <CardContent>
              {/* Lite Image Above Button */}
              <Box sx={{ mb: 2, mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Box
                  component="img"
                  src="/png/tiers/lite.png"
                  alt="AthroAi Lite"
                  sx={{
                    width: '120px',
                    height: 'auto',
                    borderRadius: '12px',
                    filter: 'drop-shadow(0 0 20px rgba(181, 203, 178, 0.4))',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      filter: 'drop-shadow(0 0 30px rgba(181, 203, 178, 0.6))'
                    }
                  }}
                />
              </Box>

              {/* Stripe Purchase Button or Current Plan - Moved to Top */}
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                {userTier === 'lite' ? (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(181, 203, 178, 0.2)',
                      border: '2px solid #b5cbb2',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="body1" sx={{ color: '#b5cbb2', fontWeight: 'bold' }}>
                      Current Plan
                    </Typography>
                  </Box>
                ) : (
                  <stripe-buy-button
                    buy-button-id="buy_btn_1Rh8DUQYU340CsP0B5BleIGI"
                    publishable-key="pk_test_51RezB6QYU340CsP0O12XJjDOZAd7hDKNKdRhpKd4TQRMvXnAWy5nuML1zL6fqrrGlCMEoTLkor7XAZz87DPU1nuE00n0ghjqrt"
                    client-reference-id={user?.id}
                    customer-email={user?.email}
                  />
                )}
              </Box>

              <Box textAlign="center" mb={2}>
                <Typography variant="h6" sx={{ color: '#b5cbb2', mb: 1 }}>
                  AthroAi Lite
                </Typography>
                <Box display="flex" alignItems="baseline" justifyContent="center" gap={1}>
                  <Typography variant="h4" sx={{ color: '#b5cbb2', fontWeight: 'bold' }}>
                    £7.99
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#b5cbb2' }}>
                    /month
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                  1M tokens monthly
                </Typography>
              </Box>
              
              <List dense>
                {liteFeatures.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Check sx={{ color: '#b5cbb2', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={feature}
                      primaryTypographyProps={{ 
                        sx: { color: '#b5cbb2', fontSize: '0.9rem' }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* AthroAi Full Plan - £14.99 */}
          <Card sx={{ 
            flex: 1,
            backgroundColor: 'rgba(228, 201, 126, 0.1)',
            border: '2px solid #e4c97e',
            borderRadius: '1rem',
            position: 'relative'
          }}>

            
            <CardContent>
              {/* Pro Image Above Button */}
              <Box sx={{ mb: 2, mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Box
                  component="img"
                  src="/png/tiers/pro.png"
                  alt="AthroAi Pro"
                  sx={{
                    width: '120px',
                    height: 'auto',
                    borderRadius: '12px',
                    filter: 'drop-shadow(0 0 20px rgba(228, 201, 126, 0.4))',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      filter: 'drop-shadow(0 0 30px rgba(228, 201, 126, 0.6))'
                    }
                  }}
                />
              </Box>

              {/* Stripe Purchase Button or Current Plan - Moved to Top */}
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                {userTier === 'full' ? (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(228, 201, 126, 0.2)',
                      border: '2px solid #e4c97e',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="body1" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                      Current Plan
                    </Typography>
                  </Box>
                ) : (
                  <stripe-buy-button
                    buy-button-id="buy_btn_1Rh7s0QYU340CsP0POfp9y98"
                    publishable-key="pk_test_51RezB6QYU340CsP0O12XJjDOZAd7hDKNKdRhpKd4TQRMvXnAWy5nuML1zL6fqrrGlCMEoTLkor7XAZz87DPU1nuE00n0ghjqrt"
                    client-reference-id={user?.id}
                    customer-email={user?.email}
                  />
                )}
              </Box>

              <Box textAlign="center" mb={2}>
                <Typography variant="h6" sx={{ color: '#e4c97e', mb: 1 }}>
                  AthroAi
                </Typography>
                <Box display="flex" alignItems="baseline" justifyContent="center" gap={1}>
                  <Typography variant="h4" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                    £14.99
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#b5cbb2' }}>
                    /month
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                  1.6M tokens + top-ups available
                </Typography>
              </Box>
              
              <List dense>
                {fullFeatures.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Check sx={{ color: '#e4c97e', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={feature}
                      primaryTypographyProps={{ 
                        sx: { 
                          color: index === 0 ? '#e4c97e' : '#b5cbb2', 
                          fontSize: '0.9rem',
                          fontWeight: index === 0 ? 'bold' : 'normal'
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Feature Highlights */}
        <Box mt={4}>
          <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2, textAlign: 'center' }}>
            What You'll Get with Full Access
          </Typography>
          
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2}>
            <Box textAlign="center" p={2}>
              <CalendarToday sx={{ color: '#e4c97e', fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 1 }}>
                Smart Scheduling
              </Typography>
              <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                Plan your study sessions with AI-powered calendar
              </Typography>
            </Box>
            
            <Box textAlign="center" p={2}>
              <Analytics sx={{ color: '#e4c97e', fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 1 }}>
                Progress Insights
              </Typography>
              <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                Track your learning with detailed analytics
              </Typography>
            </Box>
            
            <Box textAlign="center" p={2}>
              <SelfImprovement sx={{ color: '#e4c97e', fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 1 }}>
                Wellbeing Tools
              </Typography>
              <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                Monitor your mental health and study balance
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(228, 201, 126, 0.2)', justifyContent: 'center' }}>
        <Typography
          component="span"
          onClick={() => {
            onClose();
            // Navigate to login as free user
            window.location.href = '/login';
          }}
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
      </DialogActions>
    </Dialog>
  );
};

export default UpgradeModal; 