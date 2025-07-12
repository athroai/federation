import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Slider,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Chip,
  Avatar,
  LinearProgress,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Paper,
  Divider,
  Alert,
  Snackbar,
  TableCell
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  VolumeUp,
  VolumeDown,
  VolumeOff,
  Favorite,
  FavoriteBorder,
  Timer,
  Psychology,
  Spa,
  MusicNote,
  Nature,
  EmojiEmotions,
  TrendingUp,
  Refresh,
  ExpandMore,
  Close,
  Add,
  Remove,
  CheckCircle,
  Save,
  Edit
} from '@mui/icons-material';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { demoDataService } from '../../services/DemoDataService';

// Interface for user profile
interface UserProfile {
  preferred_name: string | null;
}

// Interfaces for wellbeing data
interface WellbeingData {
  id: string;
  user_id: string;
  mood_level: number;
  energy_level: number;
  stress_level: number;
  gratitude_entry: string;
  created_at: string;
}

interface BreathingSession {
  id: string;
  user_id: string;
  technique: string;
  duration: number;
  completed: boolean;
  created_at: string;
}

// Breathing techniques
const breathingTechniques = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal inhale, hold, exhale, hold (4-4-4-4)',
    pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
    color: '#4fc38a',
    image: '/png/athro-nature.png'
  },
  {
    id: '478',
    name: '4-7-8 Breathing',
    description: 'Inhale 4, hold 7, exhale 8',
    pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
    color: '#e4c97e',
    image: '/png/athro-wellbeing.png'
  },
  {
    id: 'triangle',
    name: 'Triangle Breathing',
    description: 'Equal inhale, hold, exhale (4-4-4)',
    pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 0 },
    color: '#e85a6a',
    image: '/png/athro-astrology.png'
  }
];

// Mindfulness quotes
const mindfulnessQuotes = [
  {
    text: "The present moment is the only time over which we have dominion.",
    author: "Thích Nhất Hạnh"
  },
  {
    text: "Peace comes from within. Do not seek it without.",
    author: "Buddha"
  },
  {
    text: "In the midst of movement and chaos, keep stillness inside of you.",
    author: "Deepak Chopra"
  },
  {
    text: "You are not a drop in the ocean. You are the entire ocean in a drop.",
    author: "Rumi"
  },
  {
    text: "The mind is everything. What you think you become.",
    author: "Buddha"
  }
];

// Simple Chart Component for Wellbeing Data
const WellbeingChart: React.FC<{ data: WellbeingData[], type: 'mood' | 'energy' | 'stress' }> = ({ data, type }) => {
  if (data.length === 0) return null;

  const getColor = (type: string) => {
    switch (type) {
      case 'mood': return '#e4c97e';
      case 'energy': return '#4fc38a';
      case 'stress': return '#e85a6a';
      default: return '#b5cbb2';
    }
  };

  const getValue = (entry: WellbeingData) => {
    switch (type) {
      case 'mood': return entry.mood_level;
      case 'energy': return entry.energy_level;
      case 'stress': return entry.stress_level;
      default: return 0;
    }
  };

  const maxValue = 10;
  const chartHeight = 120;
  const chartWidth = 300;
  const padding = 20;
  const availableWidth = chartWidth - (padding * 2);
  const availableHeight = chartHeight - (padding * 2);
  const pointSpacing = availableWidth / (data.length - 1);

  const points = data.map((entry, index) => {
    const x = padding + (index * pointSpacing);
    const y = padding + (availableHeight - (getValue(entry) / maxValue) * availableHeight);
    return { x, y, value: getValue(entry), date: entry.created_at };
  });

  const pathData = points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `L ${point.x} ${point.y}`;
  }).join(' ');

  return (
    <Box sx={{ width: chartWidth, height: chartHeight, position: 'relative' }}>
      <svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 2, 4, 6, 8, 10].map((value) => {
          const y = padding + (availableHeight - (value / maxValue) * availableHeight);
          return (
            <line
              key={value}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              stroke="#b5cbb2"
              strokeWidth="0.5"
              opacity="0.3"
            />
          );
        })}
        
        {/* Chart line */}
        <path
          d={pathData}
          stroke={getColor(type)}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={getColor(type)}
            stroke="#1c2a1e"
            strokeWidth="2"
          />
        ))}
      </svg>
      
      {/* Labels */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', px: 2 }}>
        <Typography sx={{ color: '#b5cbb2', fontSize: '0.7rem' }}>now</Typography>
        <Typography sx={{ color: '#b5cbb2', fontSize: '0.7rem' }}>recent</Typography>
        <Typography sx={{ color: '#b5cbb2', fontSize: '0.7rem' }}>oldest</Typography>
      </Box>
    </Box>
  );
};

const WellbeingTools: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [breathingTime, setBreathingTime] = useState(0);
  const [selectedTechnique, setSelectedTechnique] = useState(breathingTechniques[0]);
  const [breathingOrbSize, setBreathingOrbSize] = useState(100);
  
  // Mood tracking
  const [moodLevel, setMoodLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [gratitudeEntry, setGratitudeEntry] = useState('');
  
  // Data state
  const [wellbeingData, setWellbeingData] = useState<WellbeingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // User profile state for personalized headers
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Expanded entry state
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  
  const breathingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const loadWellbeingData = useCallback(async () => {
    try {
      if (import.meta.env.DEV) console.log('Loading wellbeing data...');
      
      // Check if demo mode is enabled
      if (demoDataService.isDemoModeEnabled()) {
        const demoEntries = demoDataService.getDemoWellbeingEntries();
        const formattedEntries = demoEntries.map(entry => ({
          id: entry.id,
          user_id: 'demo-user-123',
          mood_level: entry.mood,
          energy_level: entry.energy_level,
          stress_level: entry.stress_level,
          gratitude_entry: entry.gratitude_entries.join(', '),
          created_at: entry.date,
          date: entry.date
        }));
        
        if (import.meta.env.DEV) {
          console.log('Loaded demo wellbeing data:', formattedEntries);
          console.log('Total demo entries:', formattedEntries.length);
        }
        
        setWellbeingData(formattedEntries);
        setLoading(false);
        return;
      }
      
      // Real data loading for authenticated users
      if (!user) {
        setWellbeingData([]);
        setLoading(false);
        return;
      }
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('wellbeing_data')
        .select('id')
        .limit(1);
      
      if (testError && testError.code === '42P01') {
        // Table doesn't exist yet - return empty array
        setWellbeingData([]);
        setLoading(false);
        return;
      }
      
      if (testError) {
        throw testError;
      }
      
      if (import.meta.env.DEV) console.log('Database connection test successful');
      
      // Load actual data
      const { data, error } = await supabase
        .from('wellbeing_data')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      if (import.meta.env.DEV) {
        console.log('Loaded wellbeing data:', data);
        console.log('Total entries found:', data?.length || 0);
        console.log('Gratitude entries found:', data?.filter(entry => entry.gratitude_entry && entry.gratitude_entry.trim()).length || 0);
      }
      
      setWellbeingData(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Error loading wellbeing data:', error);
      setSaveMessage('Error loading data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load user profile for personalized headers
  const loadUserProfile = useCallback(async () => {
    try {
      // Check if demo mode is enabled
      if (demoDataService.isDemoModeEnabled()) {
        const demoProfile = demoDataService.getDemoProfile();
        setUserProfile({ preferred_name: demoProfile.preferred_name });
        return;
      }
      
      // Real user profile loading
      if (!user) return;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preferred_name')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        if (import.meta.env.DEV) console.error('Error loading user profile:', error);
        return;
      }
      
      setUserProfile(profile);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error loading user profile:', error);
    }
  }, [user]);

  // Load wellbeing data and user profile
  useEffect(() => {
    if (user) {
      loadWellbeingData();
      loadUserProfile();
    }
  }, [user, loadWellbeingData, loadUserProfile]);

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % mindfulnessQuotes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Breathing animation
  useEffect(() => {
    if (breathingActive) {
      const pattern = selectedTechnique.pattern;
      const totalTime = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2;
      
      breathingIntervalRef.current = setInterval(() => {
        setBreathingTime((prev) => {
          const newTime = prev + 1;
          
          if (newTime <= pattern.inhale) {
            setBreathingPhase('inhale');
            setBreathingOrbSize(100 + (newTime / pattern.inhale) * 50);
          } else if (newTime <= pattern.inhale + pattern.hold1) {
            setBreathingPhase('hold1');
            setBreathingOrbSize(150);
          } else if (newTime <= pattern.inhale + pattern.hold1 + pattern.exhale) {
            setBreathingPhase('exhale');
            const exhaleProgress = (newTime - pattern.inhale - pattern.hold1) / pattern.exhale;
            setBreathingOrbSize(150 - (exhaleProgress * 50));
          } else {
            setBreathingPhase('hold2');
            setBreathingOrbSize(100);
          }
          
          if (newTime >= totalTime) {
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (breathingIntervalRef.current) {
        clearInterval(breathingIntervalRef.current);
      }
      setBreathingTime(0);
      setBreathingPhase('inhale');
      setBreathingOrbSize(100);
    }
    
    return () => {
      if (breathingIntervalRef.current) {
        clearInterval(breathingIntervalRef.current);
      }
    };
  }, [breathingActive, selectedTechnique]);

  const saveWellbeingData = async (type: 'mood' | 'gratitude' = 'mood') => {
    try {
      setLoading(true);
      
      // In demo mode, simulate saving but don't actually save
      if (demoDataService.isDemoModeEnabled()) {
        if (import.meta.env.DEV) console.log('Demo mode: Simulating save for wellbeing data');
        
        if (type === 'gratitude') {
          setGratitudeEntry('');
        }
        
        setSaveSuccess(true);
        setSaveMessage(type === 'gratitude' ? 'Gratitude entry saved! (Demo Mode)' : 'Mood check-in saved! (Demo Mode)');
        setTimeout(() => {
          setSaveSuccess(false);
          setSaveMessage('');
        }, 2000);
        setLoading(false);
        return;
      }
      
      // Real saving for authenticated users
      if (!user) {
        setSaveMessage('Please log in to save your wellbeing data.');
        setLoading(false);
        return;
      }
      
      let dataToSave: any = { user_id: user.id };
      if (type === 'gratitude') {
        dataToSave.gratitude_entry = gratitudeEntry;
      } else {
        dataToSave.mood_level = moodLevel;
        dataToSave.energy_level = energyLevel;
        dataToSave.stress_level = stressLevel;
      }
      
      if (import.meta.env.DEV) console.log('Saving wellbeing data:', dataToSave);
      
      const { data, error } = await supabase
        .from('wellbeing_data')
        .insert(dataToSave)
        .select();
        
      if (error) {
        if (import.meta.env.DEV) console.error('Error saving wellbeing data:', error);
        setSaveSuccess(false);
        setSaveMessage('Error saving data. Please try again.');
        setLoading(false);
        return;
      }
      
      if (import.meta.env.DEV) console.log('Successfully saved wellbeing data:', data);
      
      // Immediately update the local state with the new entry
      if (data && data.length > 0) {
        const newEntry = data[0];
        setWellbeingData(prevData => [newEntry, ...prevData]);
      }
      
      // Also reload from database after a short delay to ensure consistency
      setTimeout(async () => {
        await loadWellbeingData();
      }, 1000);
      
      if (type === 'gratitude') {
        setGratitudeEntry('');
      }
      
      setSaveSuccess(true);
      setSaveMessage(type === 'gratitude' ? 'Gratitude entry saved!' : 'Mood check-in saved!');
      setTimeout(() => {
        setSaveSuccess(false);
        setSaveMessage('');
      }, 2000);
      setLoading(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error in saveWellbeingData:', error);
      setSaveSuccess(false);
      setSaveMessage('Error saving data. Please try again.');
      setLoading(false);
    }
  };

  const updateGratitudeEntry = async (entryId: string) => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('wellbeing_data')
      .update({ gratitude_entry: editingText })
      .eq('id', entryId)
      .eq('user_id', user.id);
    setLoading(false);
    setEditingEntryId(null);
    setEditingText('');
    if (!error) {
      setWellbeingData(prev =>
        prev.map(e =>
          e.id === entryId ? { ...e, gratitude_entry: editingText } : e
        )
      );
    }
  };

  const startBreathing = () => {
    setBreathingActive(true);
  };

  const stopBreathing = () => {
    setBreathingActive(false);
  };

  const getPhaseText = () => {
    switch (breathingPhase) {
      case 'inhale': return 'Breathe In';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
      default: return 'Breathe In';
    }
  };

  const getMoodEmoji = (level: number) => {
    if (level <= 2) return '😢';
    if (level <= 4) return '😐';
    if (level <= 7) return '🙂';
    return '😊';
  };

  const getEnergyEmoji = (level: number) => {
    if (level <= 2) return '😴';
    if (level <= 4) return '😌';
    if (level <= 7) return '😊';
    return '⚡';
  };

  return (
    <Box sx={{ color: '#fff' }}>
      {/* Success Notification */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSaveSuccess(false)} 
          severity="success" 
          sx={{ 
            backgroundColor: '#4fc38a', 
            color: '#1c2a1e',
            '& .MuiAlert-icon': { color: '#1c2a1e' }
          }}
        >
          {saveMessage}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: '#e4c97e', 
            mb: 2,
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
            textShadow: '0 0 10px rgba(228, 201, 126, 0.3)'
          }}
        >
          Wellbeing Sanctuary
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: '#b5cbb2',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '1.1rem'
          }}
        >
          Take a moment to breathe, reflect, and recharge
        </Typography>
      </Box>

      {/* Beautiful Card Selectors */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          {/* Breathing Card */}
          <Grid item xs={12} md={4}>
            <Card
              onClick={() => setActiveTab(0)}
              sx={{
                backgroundColor: activeTab === 0 
                  ? 'rgba(228, 201, 126, 0.15)' 
                  : 'rgba(28, 42, 30, 0.8)',
                border: `2px solid ${activeTab === 0 ? '#e4c97e' : '#b5cbb2'}`,
                borderRadius: '1.2rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: '#e4c97e',
                  backgroundColor: 'rgba(228, 201, 126, 0.1)',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(228, 201, 126, 0.2)'
                }
              }}
            >
              <Box
                component="img"
                src="/world/Flux_Dev_Capture_diverse_perspectives_and_scenarios_within_a_s_1_0150fb44-d433-4cbc-a14f-50e0a8fcbf7f.jpg"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.2,
                  zIndex: 0
                }}
              />
              
              <Box sx={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: activeTab === 0 ? '#e4c97e' : '#4fc38a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    mb: 2,
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 0 ? '0 0 20px rgba(228, 201, 126, 0.4)' : '0 0 15px rgba(79, 195, 138, 0.3)'
                  }}
                >
                  <Spa sx={{ fontSize: 40, color: '#1c2a1e' }} />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: activeTab === 0 ? '#e4c97e' : '#b5cbb2',
                    fontWeight: 600,
                    mb: 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  Breathing
                </Typography>
                <Typography 
                  sx={{ 
                    color: '#b5cbb2',
                    fontSize: '0.9rem',
                    opacity: 0.8
                  }}
                >
                  Guided breathing techniques
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Mindfulness Card */}
          <Grid item xs={12} md={4}>
            <Card
              onClick={() => setActiveTab(1)}
              sx={{
                backgroundColor: activeTab === 1 
                  ? 'rgba(228, 201, 126, 0.15)' 
                  : 'rgba(28, 42, 30, 0.8)',
                border: `2px solid ${activeTab === 1 ? '#e4c97e' : '#b5cbb2'}`,
                borderRadius: '1.2rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: '#e4c97e',
                  backgroundColor: 'rgba(228, 201, 126, 0.1)',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(228, 201, 126, 0.2)'
                }
              }}
            >
              <Box
                component="img"
                src="/world/Flux_Dev_Capture_diverse_perspectives_and_scenarios_within_a_s_2_fc24c27c-3b50-4606-b9e6-90f65a85af75.jpg"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.2,
                  zIndex: 0
                }}
              />
              
              <Box sx={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: activeTab === 1 ? '#e4c97e' : '#e85a6a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    mb: 2,
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 1 ? '0 0 20px rgba(228, 201, 126, 0.4)' : '0 0 15px rgba(232, 90, 106, 0.3)'
                  }}
                >
                  <Psychology sx={{ fontSize: 40, color: '#1c2a1e' }} />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: activeTab === 1 ? '#e4c97e' : '#b5cbb2',
                    fontWeight: 600,
                    mb: 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  Mindfulness
                </Typography>
                <Typography 
                  sx={{ 
                    color: '#b5cbb2',
                    fontSize: '0.9rem',
                    opacity: 0.8
                  }}
                >
                  Quotes & personal notes
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Mood Tracking Card */}
          <Grid item xs={12} md={4}>
            <Card
              onClick={() => setActiveTab(2)}
              sx={{
                backgroundColor: activeTab === 2 
                  ? 'rgba(228, 201, 126, 0.15)' 
                  : 'rgba(28, 42, 30, 0.8)',
                border: `2px solid ${activeTab === 2 ? '#e4c97e' : '#b5cbb2'}`,
                borderRadius: '1.2rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: '#e4c97e',
                  backgroundColor: 'rgba(228, 201, 126, 0.1)',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(228, 201, 126, 0.2)'
                }
              }}
            >
              <Box
                component="img"
                src="/world/Flux_Dev_Capture_diverse_perspectives_and_scenarios_within_a_s_3_b6744a9f-24fa-4e59-8210-4f19dd7e25cf.jpg"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.2,
                  zIndex: 0
                }}
              />
              
              <Box sx={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: activeTab === 2 ? '#e4c97e' : '#b5cbb2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    mb: 2,
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 2 ? '0 0 20px rgba(228, 201, 126, 0.4)' : '0 0 15px rgba(181, 203, 178, 0.3)'
                  }}
                >
                  <EmojiEmotions sx={{ fontSize: 40, color: '#1c2a1e' }} />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: activeTab === 2 ? '#e4c97e' : '#b5cbb2',
                    fontWeight: 600,
                    mb: 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  Mood Tracking
                </Typography>
                <Typography 
                  sx={{ 
                    color: '#b5cbb2',
                    fontSize: '0.9rem',
                    opacity: 0.8
                  }}
                >
                  Track your daily wellbeing
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Breathing Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Breathing Orb */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(28, 42, 30, 0.8)', 
              border: '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box
                component="img"
                src="/world/Flux_Dev_Capture_diverse_perspectives_and_scenarios_within_a_s_1_0150fb44-d433-4cbc-a14f-50e0a8fcbf7f.jpg"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.3,
                  zIndex: 0
                }}
              />
              
              {/* Breathing Orb */}
              <Box
                sx={{
                  width: `${breathingOrbSize}px`,
                  height: `${breathingOrbSize}px`,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${selectedTechnique.color}40, ${selectedTechnique.color}20)`,
                  border: `3px solid ${selectedTechnique.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  zIndex: 1,
                  position: 'relative',
                  boxShadow: `0 0 20px ${selectedTechnique.color}40`
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: selectedTechnique.color,
                    fontWeight: 600,
                    textAlign: 'center',
                    fontSize: '1.2rem'
                  }}
                >
                  {getPhaseText()}
                </Typography>
              </Box>
              
              {/* Controls */}
              <Box sx={{ mt: 3, zIndex: 1, position: 'relative' }}>
                <Button
                  variant="contained"
                  onClick={breathingActive ? stopBreathing : startBreathing}
                  sx={{
                    backgroundColor: breathingActive ? '#e85a6a' : '#e4c97e',
                    color: '#1c2a1e',
                    fontWeight: 700,
                    px: 4,
                    '&:hover': {
                      backgroundColor: breathingActive ? 'rgba(232, 90, 106, 0.8)' : 'rgba(228, 201, 126, 0.8)'
                    }
                  }}
                >
                  {breathingActive ? <Pause /> : <PlayArrow />}
                  {breathingActive ? 'Stop' : 'Start'} Breathing
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* Technique Selection */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
              Choose Your Technique
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {breathingTechniques.map((technique) => (
                <Card
                  key={technique.id}
                  onClick={() => setSelectedTechnique(technique)}
                  sx={{
                    backgroundColor: selectedTechnique.id === technique.id 
                      ? 'rgba(228, 201, 126, 0.15)' 
                      : 'rgba(28, 42, 30, 0.8)',
                    border: `2px solid ${selectedTechnique.id === technique.id ? '#e4c97e' : '#b5cbb2'}`,
                    borderRadius: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#e4c97e',
                      backgroundColor: 'rgba(228, 201, 126, 0.1)'
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          backgroundColor: technique.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1c2a1e',
                          fontWeight: 600
                        }}
                      >
                        {technique.pattern.inhale}-{technique.pattern.hold1}-{technique.pattern.exhale}
                      </Box>
                      <Box>
                        <Typography sx={{ color: '#e4c97e', fontWeight: 600 }}>
                          {technique.name}
                        </Typography>
                        <Typography sx={{ color: '#b5cbb2', fontSize: '0.9rem' }}>
                          {technique.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Mindfulness Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Quote Display */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(28, 42, 30, 0.8)', 
              border: '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box
                component="img"
                src="/world/Flux_Dev_Capture_diverse_perspectives_and_scenarios_within_a_s_2_fc24c27c-3b50-4606-b9e6-90f65a85af75.jpg"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.3,
                  zIndex: 0
                }}
              />
              
              <Box sx={{ textAlign: 'center', zIndex: 1, position: 'relative', p: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#e4c97e',
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: 'italic',
                    mb: 2,
                    fontSize: '1.3rem'
                  }}
                >
                  "{mindfulnessQuotes[currentQuote].text}"
                </Typography>
                <Typography
                  sx={{
                    color: '#b5cbb2',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '1rem'
                  }}
                >
                  — {mindfulnessQuotes[currentQuote].author}
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Personal Notes */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(28, 42, 30, 0.8)', 
              border: '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              p: 3
            }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 1 }}>
                Ideas, Thoughts, Achievements, Scribbles...
              </Typography>
              
              <TextField
                multiline
                rows={4}
                value={gratitudeEntry}
                onChange={(e) => setGratitudeEntry(e.target.value)}
                placeholder="Jot down your thoughts, ideas, or achievements..."
                sx={{
                  width: '100%',
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: '#b5cbb2',
                    '& fieldset': {
                      borderColor: '#b5cbb2',
                    },
                    '&:hover fieldset': {
                      borderColor: '#e4c97e',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#e4c97e',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#b5cbb2',
                  }
                }}
              />
              
              <Button
                variant="contained"
                onClick={() => saveWellbeingData('gratitude')}
                disabled={!gratitudeEntry.trim() || loading}
                sx={{
                  backgroundColor: '#e4c97e',
                  color: '#1c2a1e',
                  fontWeight: 700,
                  mt: 2,
                  boxShadow: '0 2px 8px rgba(228, 201, 126, 0.15)',
                  borderRadius: '0.7rem',
                  fontSize: '1.1rem',
                  '&:hover': {
                    backgroundColor: 'rgba(228, 201, 126, 0.8)'
                  },
                  '&:disabled': {
                    backgroundColor: '#b5cbb2',
                    color: '#1c2a1e'
                  }
                }}
              >
                {loading ? 'Saving...' : 'Save Entry'}
              </Button>
            </Card>
          </Grid>

          {/* Recent Entries */}
          <Grid item xs={12}>
            <Card sx={{ 
              backgroundColor: 'rgba(28, 42, 30, 0.8)', 
              border: '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              p: 3
            }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                {userProfile?.preferred_name ? `${userProfile.preferred_name}'s Personal Notes` : 'Your Personal Notes'}
              </Typography>
              
              {wellbeingData.filter(entry => entry.gratitude_entry && entry.gratitude_entry.trim()).length === 0 ? (
                <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 2 }}>
                  No entries yet. Start capturing your thoughts today!
                </Typography>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  maxHeight: '320px', // Show approximately 4 entries then scroll
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(28, 42, 30, 0.3)',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#b5cbb2',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: '#e4c97e',
                    },
                  },
                }}>
                  {wellbeingData
                    .filter(entry => entry.gratitude_entry && entry.gratitude_entry.trim())
                    .map((entry) => {
                      const isExpanded = expandedEntryId === entry.id;
                      const isEditing = editingEntryId === entry.id;
                      const previewText = entry.gratitude_entry.length > 200 
                        ? entry.gratitude_entry.substring(0, 200) + '...'
                        : entry.gratitude_entry;
                      const lines = entry.gratitude_entry.split('\n');
                      const truncatedLines = lines.slice(0, 5);
                      const needsTruncation = lines.length > 5;
                      const displayText = needsTruncation ? truncatedLines.join('\n') + '...' : entry.gratitude_entry;

                      return (
                        <Box
                          key={entry.id}
                          sx={{
                            p: 2,
                            border: '1px solid #b5cbb2',
                            borderRadius: '0.5rem',
                            backgroundColor: 'rgba(28, 42, 30, 0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'rgba(28, 42, 30, 0.6)',
                              borderColor: '#e4c97e'
                            }
                          }}
                          onClick={() => {
                            if (!isEditing) {
                              if (isExpanded) {
                                setExpandedEntryId(null);
                              } else {
                                setExpandedEntryId(entry.id);
                              }
                            }
                          }}
                        >
                          {isEditing ? (
                            <>
                              <TextField
                                value={editingText}
                                onChange={e => setEditingText(e.target.value)}
                                multiline
                                fullWidth
                                rows={6}
                                sx={{ 
                                  mb: 2,
                                  '& .MuiOutlinedInput-root': {
                                    color: '#b5cbb2',
                                    '& fieldset': {
                                      borderColor: '#b5cbb2',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#e4c97e',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#e4c97e',
                                    },
                                  },
                                  '& .MuiInputBase-input': {
                                    color: '#b5cbb2',
                                  }
                                }}
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    updateGratitudeEntry(entry.id);
                                  }}
                                  disabled={loading || !editingText.trim()}
                                  sx={{
                                    backgroundColor: '#e4c97e',
                                    color: '#1c2a1e',
                                    '&:hover': {
                                      backgroundColor: 'rgba(228, 201, 126, 0.8)'
                                    }
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditingEntryId(null);
                                    setEditingText('');
                                  }}
                                  disabled={loading}
                                  sx={{
                                    color: '#b5cbb2',
                                    borderColor: '#b5cbb2',
                                    '&:hover': {
                                      borderColor: '#e4c97e',
                                      color: '#e4c97e'
                                    }
                                  }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </>
                          ) : (
                            <>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography sx={{ color: '#e4c97e', fontSize: '0.8rem', fontWeight: 500 }}>
                                  {new Date(entry.created_at).toLocaleDateString('en-GB', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setEditingEntryId(entry.id);
                                      setEditingText(entry.gratitude_entry);
                                      setExpandedEntryId(null);
                                    }}
                                    sx={{ 
                                      color: '#b5cbb2',
                                      '&:hover': { color: '#e4c97e' }
                                    }}
                                  >
                                    <Edit sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Box>
                              </Box>
                              <Typography 
                                sx={{ 
                                  color: '#b5cbb2', 
                                  mb: 1,
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.4
                                }}
                              >
                                {isExpanded ? entry.gratitude_entry : displayText}
                              </Typography>
                              {(needsTruncation || entry.gratitude_entry.length > 200) && (
                                <Typography 
                                  sx={{ 
                                    color: '#e4c97e', 
                                    fontSize: '0.8rem', 
                                    fontStyle: 'italic',
                                    cursor: 'pointer',
                                    '&:hover': { textDecoration: 'underline' }
                                  }}
                                >
                                  {isExpanded ? 'Show less' : 'Tap to expand'}
                                </Typography>
                              )}
                            </>
                          )}
                        </Box>
                      );
                    })}
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Mood Tracking Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Current Mood */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(28, 42, 30, 0.8)', 
              border: '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              p: 3
            }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 3 }}>
                How are you feeling?
              </Typography>
              
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ color: '#b5cbb2' }}>
                    Mood Level
                  </Typography>
                  <Typography sx={{ color: '#e4c97e', fontSize: '2rem' }}>
                    {getMoodEmoji(moodLevel)}
                  </Typography>
                </Box>
                <Slider
                  value={moodLevel}
                  onChange={(_, value) => setMoodLevel(value as number)}
                  min={1}
                  max={10}
                  marks={[
                    { value: 1, label: '😢' },
                    { value: 5, label: '😐' },
                    { value: 10, label: '😊' }
                  ]}
                  sx={{
                    color: '#e4c97e',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#e4c97e',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#e4c97e',
                    },
                    '& .MuiSlider-markLabel': {
                      color: '#b5cbb2'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ color: '#b5cbb2' }}>
                    Energy Level
                  </Typography>
                  <Typography sx={{ color: '#e4c97e', fontSize: '2rem' }}>
                    {getEnergyEmoji(energyLevel)}
                  </Typography>
                </Box>
                <Slider
                  value={energyLevel}
                  onChange={(_, value) => setEnergyLevel(value as number)}
                  min={1}
                  max={10}
                  marks={[
                    { value: 1, label: '😴' },
                    { value: 5, label: '😌' },
                    { value: 10, label: '⚡' }
                  ]}
                  sx={{
                    color: '#e4c97e',
                    '& .MuiSlider-track': {
                      backgroundColor: '#4fc38a',
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#4fc38a',
                    },
                    '& .MuiSlider-markLabel': {
                      color: '#b5cbb2'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: '#b5cbb2', mb: 2 }}>
                  Stress Level
                </Typography>
                <Slider
                  value={stressLevel}
                  onChange={(_, value) => setStressLevel(value as number)}
                  min={1}
                  max={10}
                  marks={[
                    { value: 1, label: 'Calm' },
                    { value: 5, label: 'Moderate' },
                    { value: 10, label: 'High' }
                  ]}
                  sx={{
                    color: stressLevel <= 3 ? '#4fc38a' : stressLevel <= 7 ? '#e4c97e' : '#e85a6a',
                    '& .MuiSlider-thumb': {
                      backgroundColor: stressLevel <= 3 ? '#4fc38a' : stressLevel <= 7 ? '#e4c97e' : '#e85a6a',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: stressLevel <= 3 ? '#4fc38a' : stressLevel <= 7 ? '#e4c97e' : '#e85a6a',
                    },
                    '& .MuiSlider-markLabel': {
                      color: '#b5cbb2'
                    }
                  }}
                />
              </Box>
              
              <Button
                variant="contained"
                onClick={() => saveWellbeingData('mood')}
                disabled={loading}
                sx={{
                  backgroundColor: '#e4c97e',
                  color: '#1c2a1e',
                  fontWeight: 700,
                  width: '100%',
                  boxShadow: '0 2px 8px rgba(228, 201, 126, 0.15)',
                  borderRadius: '0.7rem',
                  fontSize: '1.1rem',
                  '&:hover': {
                    backgroundColor: 'rgba(228, 201, 126, 0.8)'
                  },
                  '&:disabled': {
                    backgroundColor: '#b5cbb2',
                    color: '#1c2a1e'
                  }
                }}
              >
                {loading ? 'Saving...' : 'Save Mood Check-in'}
              </Button>
            </Card>
          </Grid>

          {/* Mood Charts */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(28, 42, 30, 0.8)', 
              border: '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              p: 3
            }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 3 }}>
                Your Wellbeing Trends
              </Typography>
              
              {wellbeingData.length === 0 ? (
                <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 4 }}>
                  Start tracking your mood to see your trends!
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Mood Chart */}
                  <Box>
                    <Typography sx={{ color: '#e4c97e', mb: 1, fontSize: '0.9rem' }}>
                      Mood Level
                    </Typography>
                    <WellbeingChart data={wellbeingData} type="mood" />
                  </Box>
                  
                  {/* Energy Chart */}
                  <Box>
                    <Typography sx={{ color: '#4fc38a', mb: 1, fontSize: '0.9rem' }}>
                      Energy Level
                    </Typography>
                    <WellbeingChart data={wellbeingData} type="energy" />
                  </Box>
                  
                  {/* Stress Chart */}
                  <Box>
                    <Typography sx={{ color: '#e85a6a', mb: 1, fontSize: '0.9rem' }}>
                      Stress Level
                    </Typography>
                    <WellbeingChart data={wellbeingData} type="stress" />
                  </Box>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Mood History */}
          <Grid item xs={12}>
            <Card sx={{ 
              backgroundColor: 'rgba(28, 42, 30, 0.8)', 
              border: '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              p: 3
            }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 3 }}>
                Your Mood Journey
              </Typography>
              
              {wellbeingData.length === 0 ? (
                <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 2 }}>
                  Start tracking your mood to see your journey!
                </Typography>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  maxHeight: '400px',
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(28, 42, 30, 0.3)',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#b5cbb2',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: '#e4c97e',
                    },
                  },
                }}>
                  {wellbeingData.slice(0, 5).map((entry) => (
                    <Box
                      key={entry.id}
                      sx={{
                        p: 2,
                        border: '1px solid #b5cbb2',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(28, 42, 30, 0.4)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography sx={{ color: '#e4c97e', fontWeight: 600 }}>
                          {new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Typography sx={{ color: '#b5cbb2', fontSize: '1.2rem' }}>
                            {getMoodEmoji(entry.mood_level)}
                          </Typography>
                          <Typography sx={{ color: '#b5cbb2', fontSize: '1.2rem' }}>
                            {getEnergyEmoji(entry.energy_level)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`Mood: ${entry.mood_level}/10`} 
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(228, 201, 126, 0.2)', 
                            color: '#e4c97e',
                            border: '1px solid #e4c97e'
                          }} 
                        />
                        <Chip 
                          label={`Energy: ${entry.energy_level}/10`} 
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(79, 195, 138, 0.2)', 
                            color: '#4fc38a',
                            border: '1px solid #4fc38a'
                          }} 
                        />
                        <Chip 
                          label={`Stress: ${entry.stress_level}/10`} 
                          size="small"
                          sx={{ 
                            backgroundColor: entry.stress_level <= 3 ? 'rgba(79, 195, 138, 0.2)' : 
                                    entry.stress_level <= 7 ? 'rgba(228, 201, 126, 0.2)' : 'rgba(232, 90, 106, 0.2)',
                            color: entry.stress_level <= 3 ? '#4fc38a' : 
                                   entry.stress_level <= 7 ? '#e4c97e' : '#e85a6a',
                            border: `1px solid ${entry.stress_level <= 3 ? '#4fc38a' : 
                                               entry.stress_level <= 7 ? '#e4c97e' : '#e85a6a'}`
                          }} 
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default WellbeingTools; 