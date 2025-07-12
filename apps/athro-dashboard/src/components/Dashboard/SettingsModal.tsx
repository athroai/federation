import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Stack
} from '@mui/material';
import {
  Person,
  AccountBalance,
  CreditCard,
  Close,
  Info,
  Warning,
  NotificationsActive
} from '@mui/icons-material';
import { AthroSelectionSection } from './AthroSelectionSection';
import { ATHROS } from '@athro/shared-athros';
import { athroSelectionService } from '@athro/shared-services';
import { userDataService } from '../../services/userDataService';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionService } from '@athro/shared-services';
import SubscriptionControlPanel from './SubscriptionControlPanel';
import { NotificationPreferencesComponent } from '@athro/shared-ui';
import { ModelSelectionToggle } from '../ModelSelectionToggle';
import { TokenStatusChecker } from '../TokenStatusChecker';

interface UserInfo {
  full_name: string;
  preferred_name: string;
  school: string;
  year: string;
  exam_board: string;
  recent_grades: string;
}

interface SettingsModalProps {
  onClose: () => void;
}

interface TokenBalance {
  remainingTokens: number;
  totalTokens: number;
  usedTokens: number;
  monthlySpendLimit: number;
  currentSpend: number;
  remainingSpend: number;
  tier: 'free' | 'lite' | 'full';
  isLowTokenWarning: boolean;
}

const DASHBOARD_APP_ID = 'athro-dashboard';
const years = ['7', '8', '9', '10', '11', '12', '13'];
const examBoards = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'SQA', 'CCEA', 'Other'];

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user, userTier } = useAuth();
  const [showSubjectSelection, setShowSubjectSelection] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    full_name: '',
    preferred_name: '',
    school: '',
    year: '',
    exam_board: '',
    recent_grades: ''
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);


  const subscriptionService = new SubscriptionService(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  // Load user data and token balance on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load user profile from Supabase
        const profile = await userDataService.getUserProfile();
        if (profile) {
          setUserInfo({
            full_name: profile.full_name || '',
            preferred_name: profile.preferred_name || '',
            school: profile.school || '',
            year: profile.year ? profile.year.toString() : '',
            exam_board: profile.exam_board || '',
            recent_grades: profile.recent_grades || ''
          });
        }

        // Load selected subjects
        const selections = athroSelectionService.getSelections(DASHBOARD_APP_ID);
        setSelectedIds(selections.filter(s => s.selected).map(s => s.athroId));

        // Load token balance if user is authenticated
        if (user?.id) {
          const balance = await subscriptionService.getTokenBalance(user.id);
          setTokenBalance(balance);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user?.id]);

  // Load selected subjects on mount and after subject selection dialog closes
  useEffect(() => {
    const selections = athroSelectionService.getSelections(DASHBOARD_APP_ID);
    setSelectedIds(selections.filter(s => s.selected).map(s => s.athroId));
  }, [showSubjectSelection]);

  // Show selected subject names
  const selectedAthros = ATHROS.filter(a => selectedIds.includes(a.id));

  const handleUserInfoChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save user info to Supabase
      await userDataService.updateUserProfile({
        full_name: userInfo.full_name,
        preferred_name: userInfo.preferred_name,
        school: userInfo.school,
        year: userInfo.year ? parseInt(userInfo.year) : null,
        exam_board: userInfo.exam_board,
        recent_grades: userInfo.recent_grades
      });

      onClose();
    } catch (err) {
      console.error('Error saving user data:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };



  const renderProfileTab = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
      {/* MEGA ULTRA DEBUG */}
      <div style={{
        backgroundColor: '#ff0000',
        color: '#ffffff',
        padding: '20px',
        border: '5px solid #ff0000',
        fontSize: '20px',
        fontWeight: 'bold',
        textAlign: 'center',
        margin: '10px 0'
      }}>
        🚨🚨🚨 EMERGENCY DEBUG MODE 🚨🚨🚨
        <br />
        PROFILE TAB IS LOADING!
        <br />
        User Tier: {userTier || 'UNDEFINED'}
        <br />
        If you see this BIG RED BOX, settings are working!
      </div>
      
      {/* My Subjects Section - MOVED TO TOP */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1, color: '#e4c97e' }}>
          My Subjects
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#e4c97e', mb: 2 }}>
          Please select ALL subjects that you study at school
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setShowSubjectSelection(true)}
          sx={{ mb: 2 }}
          disabled={loading}
        >
          Change Subjects
        </Button>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {selectedAthros.length === 0 ? (
            <Typography color="text.secondary">No subjects selected</Typography>
          ) : (
            selectedAthros.map(a => (
              <Chip key={a.id} label={a.subject} color="primary" variant="outlined" />
            ))
          )}
        </Box>
      </Box>

      <TextField
        label="Full Name"
        value={userInfo.full_name}
        onChange={e => handleUserInfoChange('full_name', e.target.value)}
        fullWidth
        variant="outlined"
        disabled={loading}
      />
      <TextField
        label="Preferred Name (for chats)"
        value={userInfo.preferred_name}
        onChange={e => handleUserInfoChange('preferred_name', e.target.value)}
        fullWidth
        variant="outlined"
        disabled={loading}
        helperText="This is the name used in chat conversations"
      />
      <TextField
        label="School Name"
        value={userInfo.school}
        onChange={e => handleUserInfoChange('school', e.target.value)}
        fullWidth
        variant="outlined"
        disabled={loading}
      />
      <FormControl fullWidth disabled={loading}>
        <InputLabel>Year Group</InputLabel>
        <Select
          value={userInfo.year}
          label="Year Group"
          onChange={e => handleUserInfoChange('year', e.target.value)}
        >
          <MenuItem value="">
            <em>Select your year</em>
          </MenuItem>
          {years.map(year => (
            <MenuItem key={year} value={year}>Year {year}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth disabled={loading}>
        <InputLabel>Exam Board</InputLabel>
        <Select
          value={userInfo.exam_board}
          label="Exam Board"
          onChange={e => handleUserInfoChange('exam_board', e.target.value)}
        >
          <MenuItem value="">
            <em>Select your exam board</em>
          </MenuItem>
          {examBoards.map(board => (
            <MenuItem key={board} value={board}>{board}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Model Selection Toggle - Only for AI chat preferences */}
      <Divider sx={{ my: 2, borderColor: 'rgba(228, 201, 126, 0.3)' }} />
      
      {/* DEBUG: Simple test component */}
      <Box sx={{ 
        p: 2, 
        border: '2px solid #ff0000', 
        borderRadius: 2,
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        mb: 2
      }}>
        <Typography variant="h6" sx={{ color: '#ff0000' }}>
          🔧 DEBUG: Model Selection Area
        </Typography>
        <Typography variant="body2" sx={{ color: '#e4c97e', mt: 1 }}>
          Current User Tier: {userTier || 'undefined'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
          If you can see this red box, the SettingsModal is working correctly.
        </Typography>
      </Box>
      
      {/* Simplified inline model selection toggle */}
      <Box sx={{ 
        p: 2, 
        border: '1px solid rgba(228, 201, 126, 0.3)', 
        borderRadius: 2,
        backgroundColor: 'rgba(228, 201, 126, 0.05)'
      }}>
        <Typography variant="subtitle2" sx={{ color: '#e4c97e', fontWeight: 600, mb: 2 }}>
          🤖 AI Model Selection
        </Typography>
        
        <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 2 }}>
          Choose your preferred AI model for chat interactions:
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={false}
              disabled={userTier !== 'full'}
              color="primary"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#e4c97e',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#e4c97e',
                },
              }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: userTier === 'full' ? '#e4c97e' : '#999' }}>
              GPT-4o Mini → GPT-4.1 Advanced
            </Typography>
          }
        />
        
        {userTier !== 'full' && (
          <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 1 }}>
            Model selection available for Full tier users only
          </Typography>
        )}
        
        <Typography variant="caption" sx={{ color: '#b5cbb2', display: 'block', mt: 2 }}>
          Note: Quiz generation always uses GPT-4.1 for accuracy regardless of this setting
        </Typography>
      </Box>

    </Box>
  );

  const renderTierUsageTab = () => {
    try {
      return (
        <Box>
          <Typography variant="h4" sx={{ color: '#e4c97e', mb: 2, textAlign: 'center' }}>
            🎨 SUBSCRIPTION CONTROL PANEL
          </Typography>
          <SubscriptionControlPanel onClose={onClose} />
          
          {/* Manual Token Status Checker */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
              Token Status Checker
            </Typography>
            <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 2 }}>
              Click to manually check your current token balance and usage status. No automatic refreshing to prevent disruptions.
            </Typography>
            <TokenStatusChecker />
          </Box>
        </Box>
      );
    } catch (error) {
      console.error('Error rendering SubscriptionControlPanel:', error);
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#ff9800', mb: 2 }}>
            🚨 Component Error
          </Typography>
          <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
            The new subscription control panel encountered an error. Check browser console for details.
          </Typography>
        </Box>
      );
    }
  };

  if (loading) {
    return (
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'rgba(28, 42, 30, 0.95)',
          color: '#e4c97e'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Settings
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#e4c97e' }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, backgroundColor: 'rgba(28, 42, 30, 0.95)' }}>
          {error && (
            <Alert severity="error" sx={{ m: 3, mb: 0 }}>
              {error}
            </Alert>
          )}

          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: '1px solid rgba(181, 203, 178, 0.3)',
              '& .MuiTab-root': {
                color: '#b5cbb2',
                fontWeight: 600,
                '&.Mui-selected': {
                  color: '#e4c97e',
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#e4c97e',
              }
            }}
          >
            <Tab 
              icon={<Person />} 
              label="Profile Settings" 
              iconPosition="start"
            />
            <Tab 
              icon={<AccountBalance />} 
              label="Subscription Center" 
              iconPosition="start"
            />
            <Tab 
              icon={<NotificationsActive />} 
              label="Notifications" 
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ p: 3, minHeight: 400 }}>
            {activeTab === 0 && renderProfileTab()}
            {activeTab === 1 && renderTierUsageTab()}
            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                  Notification Preferences
                </Typography>
                <Typography variant="body1" sx={{ color: '#b5cbb2', mb: 3 }}>
                  Customize how and when you receive notifications from Athro. Stay informed about your learning progress while managing interruptions.
                </Typography>
                <NotificationPreferencesComponent />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          backgroundColor: 'rgba(28, 42, 30, 0.95)',
          borderTop: '1px solid rgba(181, 203, 178, 0.3)'
        }}>
          <Button onClick={onClose} sx={{ color: '#b5cbb2' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            sx={{
              backgroundColor: '#e4c97e',
              color: '#1c2a1e',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: 'rgba(228, 201, 126, 0.8)',
              }
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Athro Selection Dialog - Keep exactly as it was */}
      <Dialog
        open={showSubjectSelection}
        onClose={() => setShowSubjectSelection(false)}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'rgba(22,34,28,0.95)',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#e4c97e' }}>
          Select Your Subjects
        </DialogTitle>
        <DialogContent>
          <AthroSelectionSection onClose={() => setShowSubjectSelection(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}; 