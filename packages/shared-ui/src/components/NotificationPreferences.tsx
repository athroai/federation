import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  IconButton,
  Divider,
  Stack,
  CircularProgress,
  Fade,
  Grid,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Email,
  PhoneIphone,
  Star,
  Schedule,
  TrendingUp,
  QuestionAnswer,
  Warning,
  CheckCircle,
  Settings,
  Palette
} from '@mui/icons-material';
import { NotificationService, NotificationPreferences } from '@athro/shared-services';

interface NotificationPreferencesProps {
  onSave?: (preferences: NotificationPreferences) => void;
  className?: string;
}

export const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({
  onSave,
  className = ''
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    webPush: {
      enabled: false,
      studyReminders: true,
      progressUpdates: true,
      lowTokenWarnings: true
    },
    email: {
      enabled: true,
      studyReminders: true,
      progressUpdates: true,
      lowTokenWarnings: true
    },
    inApp: {
      enabled: true,
      studyReminders: true,
      progressUpdates: true,
      lowTokenWarnings: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [notificationService] = useState(() => NotificationService.getInstance());

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedPreferences = notificationService.getPreferences();
        setPreferences(savedPreferences);
        
        // Check push notification support
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
          setPushSupported(true);
          setPushPermission(Notification.permission);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [notificationService]);

  // Handle preference changes
  const updatePreference = (category: keyof NotificationPreferences, key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    
    // Clear success message when user makes changes (makes save button dynamic)
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  // Request push permission
  const requestPushPermission = async () => {
    try {
      setSaving(true);
      const granted = await notificationService.requestPushPermission();
      
      if (granted) {
        setPushPermission('granted');
        updatePreference('webPush', 'enabled', true);
      }
    } catch (error) {
      console.error('Failed to request push permission:', error);
    } finally {
      setSaving(false);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true);
      notificationService.updatePreferences(preferences);
      
      if (onSave) {
        onSave(preferences);
      }

      // Show local success message (matches profile settings behavior)
      setSuccessMessage('Notification preferences saved!');
      
      // Clear success message after 3 seconds, but DON'T close anything
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Failed to save preferences:', error);
      
      // Show error notification for actual errors
      notificationService.eventBus.publish('notification.display.requested', {
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save notification preferences. Please try again.',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 200,
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress sx={{ color: '#e4c97e' }} />
        <Typography sx={{ color: '#b5cbb2' }}>Loading notification preferences...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      maxWidth: 800, 
      mx: 'auto',
      '& @keyframes fadeIn': {
        '0%': { opacity: 0, transform: 'translateY(-10px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' }
      }
    }}>
      {/* Beautiful Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#e4c97e',
              border: '3px solid #b5cbb2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(228, 201, 126, 0.2)'
            }}
          >
            <NotificationsActive sx={{ fontSize: 40, color: '#1c2a1e' }} />
          </Box>
        </Box>
        <Typography 
          variant="h4" 
          sx={{ 
            color: '#e4c97e',
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
            mb: 1,
            textShadow: '0 0 10px rgba(228, 201, 126, 0.3)'
          }}
        >
          Notification Center
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: '#b5cbb2',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '1.1rem'
          }}
        >
          Stay connected to your learning journey with personalized alerts
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Web Push Notifications */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, rgba(28, 42, 30, 0.9) 0%, rgba(22, 34, 28, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(228, 201, 126, 0.3)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'visible',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -1,
                left: -1,
                right: -1,
                bottom: -1,
                borderRadius: 'inherit',
                backgroundColor: '#e4c97e',
                zIndex: -1,
                opacity: 0.05
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PhoneIphone sx={{ color: '#e4c97e', fontSize: 28, mr: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#e4c97e',
                      fontWeight: 600,
                      mb: 0.5
                    }}
                  >
                    Browser Notifications
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#b5cbb2', opacity: 0.8 }}
                  >
                    Get real-time alerts even when AthroAI isn't open
                  </Typography>
                </Box>
                <Chip
                  label={pushSupported ? 'Supported' : 'Not Available'}
                  color={pushSupported ? 'success' : 'default'}
                  size="small"
                  sx={{
                    backgroundColor: pushSupported ? 'rgba(79, 195, 138, 0.2)' : 'rgba(181, 203, 178, 0.2)',
                    color: pushSupported ? '#4fc38a' : '#b5cbb2',
                    border: `1px solid ${pushSupported ? '#4fc38a' : '#b5cbb2'}`
                  }}
                />
              </Box>

              {pushSupported && (
                <Box sx={{ mb: 3 }}>
                  {pushPermission === 'default' && (
                    <Button
                      onClick={requestPushPermission}
                      disabled={saving}
                      variant="contained"
                      startIcon={<NotificationsActive />}
                      sx={{
                        backgroundColor: '#e4c97e',
                        color: '#1c2a1e',
                        fontWeight: 600,
                        borderRadius: 2,
                        textTransform: 'none',
                        px: 3,
                        py: 1.5,
                        boxShadow: '0 4px 16px rgba(228, 201, 126, 0.3)',
                        border: '2px solid #b5cbb2',
                        '&:hover': {
                          backgroundColor: '#d4b76a',
                          boxShadow: '0 6px 20px rgba(228, 201, 126, 0.4)',
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      {saving ? 'Requesting Permission...' : 'Enable Browser Notifications'}
                    </Button>
                  )}
                  
                  {pushPermission === 'granted' && (
                    <Alert 
                      icon={<CheckCircle />}
                      severity="success"
                      sx={{
                        backgroundColor: 'rgba(79, 195, 138, 0.1)',
                        color: '#4fc38a',
                        border: '1px solid rgba(79, 195, 138, 0.3)',
                        '& .MuiAlert-icon': { color: '#4fc38a' }
                      }}
                    >
                      Browser notifications are enabled! You'll receive alerts even when the app is closed.
                    </Alert>
                  )}
                  
                  {pushPermission === 'denied' && (
                    <Alert 
                      icon={<Warning />}
                      severity="warning"
                      sx={{
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        color: '#ff9800',
                        border: '1px solid rgba(255, 152, 0, 0.3)',
                        '& .MuiAlert-icon': { color: '#ff9800' }
                      }}
                    >
                      Browser notifications are blocked. Check your browser settings to enable them.
                    </Alert>
                  )}
                </Box>
              )}

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.webPush.studyReminders}
                      onChange={(e) => updatePreference('webPush', 'studyReminders', e.target.checked)}
                      disabled={!pushSupported || pushPermission !== 'granted'}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#e4c97e',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#e4c97e'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule sx={{ color: '#b5cbb2', fontSize: 20 }} />
                      <Typography sx={{ color: '#b5cbb2', fontWeight: 500 }}>
                        Study Reminders
                      </Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.webPush.progressUpdates}
                      onChange={(e) => updatePreference('webPush', 'progressUpdates', e.target.checked)}
                      disabled={!pushSupported || pushPermission !== 'granted'}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#e4c97e',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#e4c97e'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp sx={{ color: '#b5cbb2', fontSize: 20 }} />
                      <Typography sx={{ color: '#b5cbb2', fontWeight: 500 }}>
                        Progress Updates
                      </Typography>
                    </Box>
                  }
                />
                

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.webPush.lowTokenWarnings}
                      onChange={(e) => updatePreference('webPush', 'lowTokenWarnings', e.target.checked)}
                      disabled={!pushSupported || pushPermission !== 'granted'}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#e4c97e',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#e4c97e'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning sx={{ color: '#b5cbb2', fontSize: 20 }} />
                      <Typography sx={{ color: '#b5cbb2', fontWeight: 500 }}>
                        Low Token Warnings
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Email Notifications */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, rgba(28, 42, 30, 0.9) 0%, rgba(22, 34, 28, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(181, 203, 178, 0.3)',
              borderRadius: 3,
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Email sx={{ color: '#b5cbb2', fontSize: 28, mr: 2 }} />
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#b5cbb2',
                      fontWeight: 600,
                      mb: 0.5
                    }}
                  >
                    Email Updates
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#b5cbb2', opacity: 0.7 }}
                  >
                    Learning & progress alerts
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email.enabled}
                      onChange={(e) => updatePreference('email', 'enabled', e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#b5cbb2',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#b5cbb2'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: '#b5cbb2', fontWeight: 500 }}>
                      Enable Email Notifications
                    </Typography>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email.studyReminders}
                      onChange={(e) => updatePreference('email', 'studyReminders', e.target.checked)}
                      disabled={!preferences.email.enabled}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#b5cbb2',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#b5cbb2'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule sx={{ color: '#b5cbb2', fontSize: 20, opacity: preferences.email.enabled ? 1 : 0.5 }} />
                      <Typography sx={{ color: '#b5cbb2', fontWeight: 500, opacity: preferences.email.enabled ? 1 : 0.5 }}>
                        Study Reminders
                      </Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email.progressUpdates}
                      onChange={(e) => updatePreference('email', 'progressUpdates', e.target.checked)}
                      disabled={!preferences.email.enabled}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#b5cbb2',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#b5cbb2'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp sx={{ color: '#b5cbb2', fontSize: 20, opacity: preferences.email.enabled ? 1 : 0.5 }} />
                      <Typography sx={{ color: '#b5cbb2', fontWeight: 500, opacity: preferences.email.enabled ? 1 : 0.5 }}>
                        Progress Updates
                      </Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email.lowTokenWarnings}
                      onChange={(e) => updatePreference('email', 'lowTokenWarnings', e.target.checked)}
                      disabled={!preferences.email.enabled}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#b5cbb2',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#b5cbb2'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning sx={{ color: '#b5cbb2', fontSize: 20, opacity: preferences.email.enabled ? 1 : 0.5 }} />
                      <Typography sx={{ color: '#b5cbb2', fontWeight: 500, opacity: preferences.email.enabled ? 1 : 0.5 }}>
                        Low Token Warnings
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* In-App Notifications */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, rgba(28, 42, 30, 0.9) 0%, rgba(22, 34, 28, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(79, 195, 138, 0.3)',
              borderRadius: 3,
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <QuestionAnswer sx={{ color: '#4fc38a', fontSize: 28, mr: 2 }} />
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#4fc38a',
                      fontWeight: 600,
                      mb: 0.5
                    }}
                  >
                    In-App Alerts
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#4fc38a', opacity: 0.7 }}
                  >
                    Real-time feedback
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.inApp.enabled}
                      onChange={(e) => updatePreference('inApp', 'enabled', e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#4fc38a',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#4fc38a'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: '#4fc38a', fontWeight: 500 }}>
                      Enable In-App Alerts
                    </Typography>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.inApp.studyReminders}
                      onChange={(e) => updatePreference('inApp', 'studyReminders', e.target.checked)}
                      disabled={!preferences.inApp.enabled}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#4fc38a',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#4fc38a'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule sx={{ color: '#4fc38a', fontSize: 20, opacity: preferences.inApp.enabled ? 1 : 0.5 }} />
                      <Typography sx={{ color: '#4fc38a', fontWeight: 500, opacity: preferences.inApp.enabled ? 1 : 0.5 }}>
                        Study Reminders
                      </Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.inApp.progressUpdates}
                      onChange={(e) => updatePreference('inApp', 'progressUpdates', e.target.checked)}
                      disabled={!preferences.inApp.enabled}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#4fc38a',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#4fc38a'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp sx={{ color: '#4fc38a', fontSize: 20, opacity: preferences.inApp.enabled ? 1 : 0.5 }} />
                      <Typography sx={{ color: '#4fc38a', fontWeight: 500, opacity: preferences.inApp.enabled ? 1 : 0.5 }}>
                        Progress Updates
                      </Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.inApp.lowTokenWarnings}
                      onChange={(e) => updatePreference('inApp', 'lowTokenWarnings', e.target.checked)}
                      disabled={!preferences.inApp.enabled}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#4fc38a',
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#4fc38a'
                          }
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning sx={{ color: '#4fc38a', fontSize: 20, opacity: preferences.inApp.enabled ? 1 : 0.5 }} />
                      <Typography sx={{ color: '#4fc38a', fontWeight: 500, opacity: preferences.inApp.enabled ? 1 : 0.5 }}>
                        Low Token Warnings
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Success Message - Fixed height to prevent layout shift */}
      <Box sx={{ mt: 3, mb: 2, minHeight: successMessage ? 'auto' : 0, transition: 'all 0.3s ease' }}>
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              background: 'rgba(76, 175, 80, 0.1)', 
              color: '#4caf50',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              '& .MuiAlert-icon': { color: '#4caf50' },
              animation: 'fadeIn 0.3s ease-in'
            }}
          >
            {successMessage}
          </Alert>
        )}
      </Box>

      {/* Save Button - Matches Profile Settings Style */}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          onClick={savePreferences}
          disabled={saving}
          variant="contained"
          sx={{
            backgroundColor: '#e4c97e',
            color: '#1c2a1e',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: 'rgba(228, 201, 126, 0.8)',
            },
            '&:disabled': {
              opacity: 0.6
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationPreferencesComponent; 