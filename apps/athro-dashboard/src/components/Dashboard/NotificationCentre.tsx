import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  IconButton,
  Divider,
  Stack,
  CircularProgress,
  Fade,
  Grid,
  Paper,
  Tooltip,
  Slider,
  Badge,
  LinearProgress
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
  Palette,
  CalendarToday,
  Psychology,
  Token,
  NightlightRound,
  AccessTime,
  Refresh,
  Science,
  Save,
  RestoreOutlined
} from '@mui/icons-material';

interface NotificationPreferences {
  // Delivery Methods
  push_enabled: boolean;
  email_enabled: boolean;
  inapp_enabled: boolean;
  
  // Calendar Reminders
  calendar_reminders_enabled: boolean;
  calendar_reminder_minutes: 5 | 10 | 15;
  
  // Hints & Tips
  hints_tips_enabled: boolean;
  athro_unused_days: number;
  study_tools_unused_days: number;
  resources_upload_nudge_days: number;
  
  // Low Token Warning
  low_token_warning_enabled: boolean;
  low_token_threshold_percentage: number;
  
  // Night Silencing
  night_silence_enabled: boolean;
  night_silence_start: string;
  night_silence_end: string;
}

interface NotificationCentreProps {
  onSave?: (preferences: NotificationPreferences) => void;
  className?: string;
}

export const NotificationCentre: React.FC<NotificationCentreProps> = ({
  onSave,
  className = ''
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    email_enabled: true,
    inapp_enabled: true,
    calendar_reminders_enabled: true,
    calendar_reminder_minutes: 15,
    hints_tips_enabled: true,
    athro_unused_days: 30,
    study_tools_unused_days: 14,
    resources_upload_nudge_days: 7,
    low_token_warning_enabled: true,
    low_token_threshold_percentage: 10,
    night_silence_enabled: true,
    night_silence_start: '22:00',
    night_silence_end: '08:00'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
    checkPushSupport();
  }, []);

  const loadPreferences = async () => {
    try {
      // Get auth token from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials not found');
        setLoading(false);
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('No auth session found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/notifications-preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const { preferences: serverPreferences } = await response.json();
        if (serverPreferences) {
          setPreferences(serverPreferences);
        }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = () => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      // Get auth token from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication session');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/notifications-preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        setSuccessMessage('Notification preferences saved successfully!');
        onSave?.(preferences);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setSuccessMessage('Failed to save preferences. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChange = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const requestPushPermission = async () => {
    if (!pushSupported) return;
    
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, push_enabled: true }));
      }
    } catch (error) {
      console.error('Failed to request push permission:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTestNotificationSent(true);
      
      // Create a test notification in the queue
      if (preferences.inapp_enabled) {
        // Show in-app notification immediately
        setSuccessMessage('Test notification sent! Check your in-app notifications.');
      }
      
      if (preferences.push_enabled && pushPermission === 'granted') {
        new Notification('AthroAI Test Notification', {
          body: 'Your notification system is working perfectly!',
          icon: '/png/athro-astrology.png',
          badge: '/png/athro-astrology.png'
        });
      }
      
      setTimeout(() => {
        setTestNotificationSent(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const resetToDefaults = () => {
    setPreferences({
      push_enabled: true,
      email_enabled: true,
      inapp_enabled: true,
      calendar_reminders_enabled: true,
      calendar_reminder_minutes: 15,
      hints_tips_enabled: true,
      athro_unused_days: 30,
      study_tools_unused_days: 14,
      resources_upload_nudge_days: 7,
      low_token_warning_enabled: true,
      low_token_threshold_percentage: 10,
      night_silence_enabled: true,
      night_silence_start: '22:00',
      night_silence_end: '08:00'
    });
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        background: 'linear-gradient(135deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 43, 0.95))',
        borderRadius: 4
      }}>
        <CircularProgress sx={{ color: '#e4c97e' }} />
      </Box>
    );
  }

  return (
    <Box 
      className={className} 
      sx={{ maxWidth: 1000, margin: '0 auto' }}
    >
      {/* Header Section */}
      <Card sx={{ 
        mb: 3, 
        background: 'linear-gradient(135deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 43, 0.95))',
        borderRadius: 4,
        border: '1px solid rgba(228, 201, 126, 0.2)'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge 
                badgeContent={Object.values(preferences).filter(Boolean).length}
                color="primary"
                sx={{ '& .MuiBadge-badge': { backgroundColor: '#e4c97e', color: '#1a1d23' } }}
              >
                <NotificationsActive sx={{ fontSize: 32, color: '#e4c97e' }} />
              </Badge>
              <Box>
                <Typography variant="h4" sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 0.5 }}>
                  Notification Centre
                </Typography>
                <Typography variant="body1" sx={{ color: '#b5cbb2', opacity: 0.8 }}>
                  Configure how and when you receive notifications from AthroAI
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Test Notifications">
                <IconButton 
                  onClick={sendTestNotification}
                  disabled={testNotificationSent}
                  sx={{ 
                    color: '#e4c97e',
                    '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.1)' }
                  }}
                >
                  {testNotificationSent ? <CircularProgress size={24} sx={{ color: '#e4c97e' }} /> : <Science />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset to Defaults">
                <IconButton 
                  onClick={resetToDefaults}
                  sx={{ 
                    color: '#b5cbb2',
                    '&:hover': { backgroundColor: 'rgba(181, 203, 178, 0.1)' }
                  }}
                >
                  <RestoreOutlined />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {successMessage && (
            <Fade in={!!successMessage}>
              <Alert 
                        severity={successMessage.includes('Failed') ? 'error' : 'success'}
        sx={{
          mb: 2,
          backgroundColor: successMessage.includes('Failed') ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)',
          color: successMessage.includes('Failed') ? '#f44336' : '#4caf50',
          border: `1px solid ${successMessage.includes('Failed') ? '#f44336' : '#4caf50'}20`
                }}
              >
                {successMessage}
              </Alert>
            </Fade>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Delivery Methods Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 43, 0.95))',
            borderRadius: 4,
            border: '1px solid rgba(228, 201, 126, 0.2)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <PhoneIphone sx={{ color: '#e4c97e', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                  Delivery Methods
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                {/* Push Notifications */}
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(228, 201, 126, 0.05)',
                  border: '1px solid rgba(228, 201, 126, 0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Notifications sx={{ color: '#e4c97e' }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                          Push Notifications
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2', opacity: 0.7 }}>
                          Browser/device notifications
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={preferences.push_enabled && pushPermission === 'granted'}
                      onChange={() => {
                        if (pushPermission !== 'granted') {
                          requestPushPermission();
                        } else {
                          handleToggle('push_enabled');
                        }
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#e4c97e' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#e4c97e' }
                      }}
                    />
                  </Box>
                  {pushPermission === 'denied' && (
                    <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                      Push notifications are blocked. Please enable them in your browser settings.
                    </Alert>
                  )}
                </Paper>

                {/* Email Notifications */}
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(181, 203, 178, 0.05)',
                  border: '1px solid rgba(181, 203, 178, 0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Email sx={{ color: '#b5cbb2' }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                          Email Notifications
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2', opacity: 0.7 }}>
                          Send to your registered email
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={preferences.email_enabled}
                      onChange={() => {
                        handleToggle('email_enabled');
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#b5cbb2' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#b5cbb2' }
                      }}
                    />
                  </Box>
                </Paper>

                {/* In-App Notifications */}
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(96, 165, 250, 0.05)',
                  border: '1px solid rgba(96, 165, 250, 0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Star sx={{ color: '#60a5fa' }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                          In-App Notifications
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2', opacity: 0.7 }}>
                          Show notifications within AthroAI
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={preferences.inapp_enabled}
                      onChange={() => {
                        handleToggle('inapp_enabled');
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#60a5fa' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#60a5fa' }
                      }}
                    />
                  </Box>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Calendar Reminders Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 43, 0.95))',
            borderRadius: 4,
            border: '1px solid rgba(228, 201, 126, 0.2)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <CalendarToday sx={{ color: '#e4c97e', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                  Calendar Reminders
                </Typography>
              </Box>
              
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.calendar_reminders_enabled}
                      onChange={() => handleToggle('calendar_reminders_enabled')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#e4c97e' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#e4c97e' }
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: '#b5cbb2' }}>
                      Enable study event reminders
                    </Typography>
                  }
                />

                {preferences.calendar_reminders_enabled && (
                  <Fade in={preferences.calendar_reminders_enabled}>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: 'rgba(228, 201, 126, 0.05)',
                      border: '1px solid rgba(228, 201, 126, 0.1)'
                    }}>
                      <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 2, fontWeight: 'bold' }}>
                        Reminder Timing
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: '#b5cbb2' }}>Minutes before event</InputLabel>
                        <Select
                          value={preferences.calendar_reminder_minutes}
                          onChange={(e) => handleChange('calendar_reminder_minutes', e.target.value)}
                          sx={{
                            color: '#e4c97e',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(228, 201, 126, 0.3)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#e4c97e' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#e4c97e' }
                          }}
                        >
                          <MenuItem value={5}>5 minutes before</MenuItem>
                          <MenuItem value={10}>10 minutes before</MenuItem>
                          <MenuItem value={15}>15 minutes before</MenuItem>
                        </Select>
                      </FormControl>
                    </Paper>
                  </Fade>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Hints & Tips Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 43, 0.95))',
            borderRadius: 4,
            border: '1px solid rgba(228, 201, 126, 0.2)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Psychology sx={{ color: '#e4c97e', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                  Hints & Tips
                </Typography>
              </Box>
              
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.hints_tips_enabled}
                      onChange={() => handleToggle('hints_tips_enabled')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#e4c97e' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#e4c97e' }
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: '#b5cbb2' }}>
                      Enable personalized study tips
                    </Typography>
                  }
                />

                {preferences.hints_tips_enabled && (
                  <Fade in={preferences.hints_tips_enabled}>
                    <Stack spacing={2}>
                      {/* Athro Unused Days */}
                      <Paper sx={{ 
                        p: 2, 
                        backgroundColor: 'rgba(168, 85, 247, 0.05)',
                        border: '1px solid rgba(168, 85, 247, 0.1)'
                      }}>
                        <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 1, fontWeight: 'bold' }}>
                          Athro Inactivity Alert
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2', mb: 2, display: 'block' }}>
                          Notify if an Athro hasn't been used for {preferences.athro_unused_days} days
                        </Typography>
                        <Slider
                          value={preferences.athro_unused_days}
                          onChange={(_, value) => handleChange('athro_unused_days', value)}
                          min={7}
                          max={60}
                          step={7}
                          marks={[
                            { value: 7, label: '1w' },
                            { value: 14, label: '2w' },
                            { value: 30, label: '1m' },
                            { value: 60, label: '2m' }
                          ]}
                          sx={{
                            color: '#a855f7',
                            '& .MuiSlider-thumb': { backgroundColor: '#a855f7' },
                            '& .MuiSlider-track': { backgroundColor: '#a855f7' },
                            '& .MuiSlider-rail': { backgroundColor: 'rgba(168, 85, 247, 0.2)' }
                          }}
                        />
                      </Paper>

                      {/* Study Tools Unused Days */}
                      <Paper sx={{ 
                        p: 2, 
                        backgroundColor: 'rgba(34, 197, 94, 0.05)',
                        border: '1px solid rgba(34, 197, 94, 0.1)'
                      }}>
                        <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 1, fontWeight: 'bold' }}>
                          Study Tools Reminder
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2', mb: 2, display: 'block' }}>
                          Notify if study tools haven't been used for {preferences.study_tools_unused_days} days
                        </Typography>
                        <Slider
                          value={preferences.study_tools_unused_days}
                          onChange={(_, value) => handleChange('study_tools_unused_days', value)}
                          min={3}
                          max={30}
                          step={1}
                          marks={[
                            { value: 3, label: '3d' },
                            { value: 7, label: '1w' },
                            { value: 14, label: '2w' },
                            { value: 30, label: '1m' }
                          ]}
                          sx={{
                            color: '#22c55e',
                            '& .MuiSlider-thumb': { backgroundColor: '#22c55e' },
                            '& .MuiSlider-track': { backgroundColor: '#22c55e' },
                            '& .MuiSlider-rail': { backgroundColor: 'rgba(34, 197, 94, 0.2)' }
                          }}
                        />
                      </Paper>

                      {/* Resource Upload Nudge */}
                      <Paper sx={{ 
                        p: 2, 
                        backgroundColor: 'rgba(249, 115, 22, 0.05)',
                        border: '1px solid rgba(249, 115, 22, 0.1)'
                      }}>
                        <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 1, fontWeight: 'bold' }}>
                          Resource Upload Nudge
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b5cbb2', mb: 2, display: 'block' }}>
                          Remind to upload resources after {preferences.resources_upload_nudge_days} days
                        </Typography>
                        <Slider
                          value={preferences.resources_upload_nudge_days}
                          onChange={(_, value) => handleChange('resources_upload_nudge_days', value)}
                          min={1}
                          max={14}
                          step={1}
                          marks={[
                            { value: 1, label: '1d' },
                            { value: 3, label: '3d' },
                            { value: 7, label: '1w' },
                            { value: 14, label: '2w' }
                          ]}
                          sx={{
                            color: '#f97316',
                            '& .MuiSlider-thumb': { backgroundColor: '#f97316' },
                            '& .MuiSlider-track': { backgroundColor: '#f97316' },
                            '& .MuiSlider-rail': { backgroundColor: 'rgba(249, 115, 22, 0.2)' }
                          }}
                        />
                      </Paper>
                    </Stack>
                  </Fade>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Token Warning Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 43, 0.95))',
            borderRadius: 4,
            border: '1px solid rgba(228, 201, 126, 0.2)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Token sx={{ color: '#e4c97e', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                  Low Token Warning
                </Typography>
              </Box>
              
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.low_token_warning_enabled}
                      onChange={() => handleToggle('low_token_warning_enabled')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#e4c97e' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#e4c97e' }
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: '#b5cbb2' }}>
                      Warn when tokens are running low
                    </Typography>
                  }
                />

                {preferences.low_token_warning_enabled && (
                  <Fade in={preferences.low_token_warning_enabled}>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.1)'
                    }}>
                      <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 2, fontWeight: 'bold' }}>
                        Warning Threshold: {preferences.low_token_threshold_percentage}% remaining
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Warning sx={{ color: '#ef4444' }} />
                        <LinearProgress 
                          variant="determinate" 
                          value={preferences.low_token_threshold_percentage} 
                          sx={{ 
                            flexGrow: 1, 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            '& .MuiLinearProgress-bar': { backgroundColor: '#ef4444' }
                          }} 
                        />
                      </Box>
                      <Slider
                        value={preferences.low_token_threshold_percentage}
                        onChange={(_, value) => handleChange('low_token_threshold_percentage', value)}
                        min={5}
                        max={50}
                        step={5}
                        marks={[
                          { value: 5, label: '5%' },
                          { value: 10, label: '10%' },
                          { value: 25, label: '25%' },
                          { value: 50, label: '50%' }
                        ]}
                        sx={{
                          color: '#ef4444',
                          '& .MuiSlider-thumb': { backgroundColor: '#ef4444' },
                          '& .MuiSlider-track': { backgroundColor: '#ef4444' },
                          '& .MuiSlider-rail': { backgroundColor: 'rgba(239, 68, 68, 0.2)' }
                        }}
                      />
                    </Paper>
                  </Fade>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Night Silencing Section */}
        <Grid item xs={12}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 43, 0.95))',
            borderRadius: 4,
            border: '1px solid rgba(228, 201, 126, 0.2)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <NightlightRound sx={{ color: '#e4c97e', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 'bold' }}>
                  Night Silencing (Do Not Disturb)
                </Typography>
              </Box>
              
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.night_silence_enabled}
                      onChange={() => handleToggle('night_silence_enabled')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#e4c97e' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#e4c97e' }
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: '#b5cbb2' }}>
                      Silence notifications during night hours (10 PM - 8 AM)
                    </Typography>
                  }
                />

                {preferences.night_silence_enabled && (
                  <Fade in={preferences.night_silence_enabled}>
                    <Paper sx={{ 
                      p: 3, 
                      backgroundColor: 'rgba(67, 56, 202, 0.05)',
                      border: '1px solid rgba(67, 56, 202, 0.1)'
                    }}>
                      <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 3, fontWeight: 'bold' }}>
                        Quiet Hours Schedule
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <AccessTime sx={{ color: '#4338ca' }} />
                            <Typography variant="subtitle2" sx={{ color: '#e4c97e' }}>
                              Start Time (Evening)
                            </Typography>
                          </Box>
                          <FormControl fullWidth>
                            <Select
                              value={preferences.night_silence_start}
                              onChange={(e) => handleChange('night_silence_start', e.target.value)}
                              sx={{
                                color: '#e4c97e',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(67, 56, 202, 0.3)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4338ca' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4338ca' }
                              }}
                            >
                              {['20:00', '21:00', '22:00', '23:00'].map(time => (
                                <MenuItem key={time} value={time}>{time}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <AccessTime sx={{ color: '#4338ca' }} />
                            <Typography variant="subtitle2" sx={{ color: '#e4c97e' }}>
                              End Time (Morning)
                            </Typography>
                          </Box>
                          <FormControl fullWidth>
                            <Select
                              value={preferences.night_silence_end}
                              onChange={(e) => handleChange('night_silence_end', e.target.value)}
                              sx={{
                                color: '#e4c97e',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(67, 56, 202, 0.3)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4338ca' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4338ca' }
                              }}
                            >
                              {['06:00', '07:00', '08:00', '09:00'].map(time => (
                                <MenuItem key={time} value={time}>{time}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                      <Alert 
                        severity="info" 
                        sx={{ 
                          mt: 2,
                          backgroundColor: 'rgba(67, 56, 202, 0.1)',
                          color: '#4338ca',
                          border: '1px solid rgba(67, 56, 202, 0.2)'
                        }}
                      >
                        Notifications scheduled during quiet hours will be delayed until {preferences.night_silence_end}
                      </Alert>
                    </Paper>
                  </Fade>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSavePreferences}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          sx={{
            px: 6,
            py: 2,
            background: 'linear-gradient(135deg, #e4c97e, #d4b96e)',
            color: '#1a1d23',
            fontWeight: 'bold',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(228, 201, 126, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #d4b96e, #c4a95e)',
              boxShadow: '0 12px 40px rgba(228, 201, 126, 0.4)',
              transform: 'translateY(-2px)'
            },
            '&:disabled': {
              background: 'rgba(228, 201, 126, 0.3)',
              color: 'rgba(26, 29, 35, 0.5)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          {saving ? 'Saving Preferences...' : 'Save Notification Preferences'}
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationCentre; 