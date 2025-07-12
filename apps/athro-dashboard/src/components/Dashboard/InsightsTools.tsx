import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  IconButton,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  AccessTime,
  Quiz,
  Assessment,
  Psychology,
  EmojiEvents,
  Star,
  Analytics,
  Lightbulb,
  MoreVert,
  PlaylistPlay,
  TrendingFlat,
  Article,
  VideoLibrary,
  Description,
  Add
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { insightsService } from '../../services/insightsService';
import { AthroInsightsModal } from './AthroInsightsModal';
import { Athro } from '@athro/shared-types';
import { demoDataService } from '../../services/DemoDataService';
import { getWorkspaceUrl } from '../../config/federation';

interface AthroInsightCard {
  athro: Athro;
  totalStudyTime: number;
  sessionCount: number;
  averageQuizScore: number;
  lastActivity: string | null;
  confidenceTrend: number;
  toolsUsed: number;
  hasData: boolean;
}

interface Playlist {
  id: string;
  athro_id: string;
  name: string;
  created_at: string;
  playlist_documents: Array<{
    id: string;
    title: string;
    document_url: string;
    document_type: string;
    created_at: string;
  }>;
}

const InsightsTools: React.FC = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athroInsights, setAthroInsights] = useState<AthroInsightCard[]>([]);
  const [selectedAthro, setSelectedAthro] = useState<Athro | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);

  // Get selected athros from the dashboard context
  const [selectedAthros, setSelectedAthros] = useState<Athro[]>([]);

  // Load selected athros from parent component or localStorage
  useEffect(() => {
    // This would typically come from a context or props
    // For now, let's get it from the athro selection service
    const loadSelectedAthros = async () => {
      try {
        // Import athros and selection service
        const { ATHROS } = await import('@athro/shared-athros');
        const { AthroSelectionService } = await import('@athro/shared-services');
        
        const athroSelectionService = AthroSelectionService.getInstance();
        const selections = athroSelectionService.getSelections('athro-dashboard');
        const selectedIds = selections.filter(s => s.selected).map(s => s.athroId);
        const athros = ATHROS.filter(a => selectedIds.includes(a.id));
        
        console.log('🔍 [InsightsTools] Loaded selected athros:', athros.map(a => a.name));
        setSelectedAthros(athros);
      } catch (error) {
        console.error('Error loading selected athros:', error);
      }
    };

    loadSelectedAthros();

    // 🚀 CRITICAL FIX: Listen for dynamic athro selection changes
    const handleAthroSelectionChange = () => {
      console.log('🔄 [InsightsTools] Athro selection changed - reloading insights...');
      loadSelectedAthros();
    };

    // Listen for selection changes from settings
    window.addEventListener('athro-selection-changed', handleAthroSelectionChange);
    window.addEventListener('athro-selections-updated', handleAthroSelectionChange);

    // Cleanup listener
    return () => {
      window.removeEventListener('athro-selection-changed', handleAthroSelectionChange);
      window.removeEventListener('athro-selections-updated', handleAthroSelectionChange);
    };
  }, []);

  // Load insights data for all selected athros
  const loadAllAthroInsights = useCallback(async () => {
    if (!user || selectedAthros.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Set user in insights service
      insightsService.setUser(user);

      // Load all data
      const [sessions, tools, quizzes, confidence] = await Promise.all([
        insightsService.getStudySessions(200),
        insightsService.getToolUsage(200),
        insightsService.getQuizResults(200),
        insightsService.getConfidenceHistory(200)
      ]);

      // Create sample data if none exists
      if (sessions.length === 0 && tools.length === 0 && quizzes.length === 0) {
        console.log('No insights data found - showing empty state with guidance');
        // Instead of creating sample data, show empty state with guidance
        processAthroInsights([], [], [], []);
      } else {
        console.log(`Found real data: ${sessions.length} sessions, ${tools.length} tools, ${quizzes.length} quizzes`);
        processAthroInsights(sessions, tools, quizzes, confidence);
      }

    } catch (err) {
      console.error('Error loading insights data:', err);
      setError('Failed to load insights data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAthros]);

  const processAthroInsights = (sessions: any[], tools: any[], quizzes: any[], confidence: any[]) => {
    const insights: AthroInsightCard[] = selectedAthros.map(athro => {
      // Filter data for this athro
      const athroSessions = sessions.filter(s => 
        s.athro_id === athro.id || s.subject === athro.subject
      );
      const athroTools = tools.filter(t => 
        t.athro_id === athro.id
      );
      const athroQuizzes = quizzes.filter(q => 
        q.subject === athro.subject
      );
      const athroConfidence = confidence.filter(c => 
        c.athro_id === athro.id || c.subject === athro.subject
      );

      // Calculate metrics
      const totalStudyTime = athroSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
      const sessionCount = athroSessions.length;
      const averageQuizScore = athroQuizzes.length > 0 
        ? athroQuizzes.reduce((sum, q) => sum + (q.score / q.total_questions * 100), 0) / athroQuizzes.length 
        : 0;

      // Get last activity
      const allActivities = [...athroSessions, ...athroTools, ...athroQuizzes];
      const lastActivity = allActivities.length > 0 
        ? allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;

      // Calculate confidence trend
      const sortedConfidence = athroConfidence.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const confidenceTrend = sortedConfidence.length >= 2 
        ? sortedConfidence[sortedConfidence.length - 1].confidence_level - sortedConfidence[0].confidence_level
        : 0;

      const toolsUsed = new Set(athroTools.map(t => t.tool_type)).size;
      const hasData = athroSessions.length > 0 || athroTools.length > 0 || athroQuizzes.length > 0;

      return {
        athro,
        totalStudyTime,
        sessionCount,
        averageQuizScore,
        lastActivity,
        confidenceTrend,
        toolsUsed,
        hasData
      };
    });

    setAthroInsights(insights);
  };

  useEffect(() => {
    if (selectedAthros.length > 0) {
      loadAllAthroInsights();
    }
  }, [loadAllAthroInsights, selectedAthros]);

  const handleAthroClick = (athro: Athro) => {
    setSelectedAthro(athro);
    setModalOpen(true);
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'No activity yet';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getConfidenceTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp sx={{ color: '#4fc38a' }} />;
    if (trend < 0) return <TrendingDown sx={{ color: '#e85a6a' }} />;
    return <Timeline sx={{ color: '#b5cbb2' }} />;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return '#4fc38a';
    if (score >= 60) return '#e4c97e';
    return '#e85a6a';
  };

  // Load playlists
  const loadPlaylists = useCallback(async () => {
    if (!user) return;

    try {
      setPlaylistsLoading(true);
      setPlaylistsError(null);
      
      const data = await insightsService.getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setPlaylistsError('Failed to load playlists');
    } finally {
      setPlaylistsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (currentTab === 1) {
      loadPlaylists();
    }
  }, [currentTab, loadPlaylists]);

  const handleCreatePlaylist = async () => {
    if (!user) return;

    try {
      // Get the selected athro from the current view
      const selectedAthro = selectedAthros[0]; // For now, use the first selected athro
      if (!selectedAthro) {
        console.error('No athro selected');
        return;
      }

      // Create the playlist
      const playlistName = prompt('Enter playlist name:');
      if (!playlistName || playlistName.trim() === '') return;

      // Create the playlist in the workspace
      const workspaceUrl = getWorkspaceUrl();
      const response = await fetch(`${workspaceUrl}/api/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          athro_id: selectedAthro.id,
          name: playlistName.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      // Reload playlists
      loadPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      // TODO: Show error message to user
    }
  };

  const handleDocumentClick = async (documentUrl: string) => {
    try {
      // Get the signed URL for the document
      const workspaceUrl = getWorkspaceUrl();
      const response = await fetch(`${workspaceUrl}/api/documents/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ storagePath: documentUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to get document URL');
      }

      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      // TODO: Show error message to user
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <Description />;
      case 'video':
        return <VideoLibrary />;
      case 'article':
        return <Article />;
      default:
        return <Description />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress sx={{ color: '#e4c97e', mb: 2 }} size={60} />
        <Typography sx={{ color: '#b5cbb2' }}>Loading your learning insights...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (selectedAthros.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Analytics sx={{ color: '#b5cbb2', fontSize: 80, mb: 2 }} />
        <Typography variant="h5" sx={{ color: '#e4c97e', mb: 2 }}>
          Select Your Athros First
        </Typography>
        <Typography sx={{ color: '#b5cbb2', mb: 3 }}>
          Go to Settings to select the subjects you're studying to see insights here.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('athro-open-settings'));
            }
          }}
          sx={{
            backgroundColor: '#e4c97e',
            color: '#1c2a1e',
            fontWeight: 700,
            '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.8)' }
          }}
        >
          Go to Settings
        </Button>
      </Box>
    );
  }

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#e4c97e', fontWeight: 700, mb: 1 }}>
          Learning Hub
        </Typography>
        <Typography variant="h6" sx={{ color: '#b5cbb2', mb: 3 }}>
          Your complete learning dashboard and resource library
        </Typography>

        {/* Tabs */}
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          centered
          sx={{
            mb: 4,
            '& .MuiTabs-indicator': {
              backgroundColor: '#e4c97e',
              height: 3,
              borderRadius: '3px 3px 0 0'
            },
            '& .MuiTab-root': {
              color: '#b5cbb2',
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              minWidth: 160,
              '&.Mui-selected': {
                color: '#e4c97e'
              },
              '&:hover': {
                color: '#e4c97e',
                backgroundColor: 'rgba(228, 201, 126, 0.1)'
              }
            }
          }}
        >
          <Tab
            icon={<TrendingFlat />}
            label="Learning Insights"
            iconPosition="start"
            sx={{ gap: 1 }}
          />
          <Tab
            icon={<PlaylistPlay />}
            label="My Playlists"
            iconPosition="start"
            sx={{ gap: 1 }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Box>
          {/* Quick Stats */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 1, sm: 4 }, flexWrap: 'wrap', mb: 3 }}>
            <Chip 
              icon={<EmojiEvents />}
              label={`${athroInsights.filter(a => a.hasData).length} Active Athros`}
              sx={{ 
                backgroundColor: 'rgba(79, 195, 138, 0.1)',
                color: '#4fc38a',
                border: '1px solid #4fc38a',
                fontWeight: 600,
                fontSize: { xs: '0.8rem', sm: '1rem' },
                height: { xs: 32, sm: 40 }
              }}
            />
            <Chip 
              icon={<AccessTime />}
              label={`${Math.round(athroInsights.reduce((sum, a) => sum + a.totalStudyTime, 0))} Total Minutes`}
              sx={{ 
                backgroundColor: 'rgba(228, 201, 126, 0.1)',
                color: '#e4c97e',
                border: '1px solid #e4c97e',
                fontWeight: 600,
                fontSize: { xs: '0.8rem', sm: '1rem' },
                height: { xs: 32, sm: 40 }
              }}
            />
            <Chip 
              icon={<Assessment />}
              label={`${Math.round(athroInsights.filter(a => a.averageQuizScore > 0).reduce((sum, a) => sum + a.averageQuizScore, 0) / Math.max(1, athroInsights.filter(a => a.averageQuizScore > 0).length))}% Avg Score`}
              sx={{ 
                backgroundColor: 'rgba(232, 90, 106, 0.1)',
                color: '#e85a6a',
                border: '1px solid #e85a6a',
                fontWeight: 600,
                fontSize: { xs: '0.8rem', sm: '1rem' },
                height: { xs: 32, sm: 40 }
              }}
            />
          </Box>

          {/* Athro Cards Grid */}
          <Grid container spacing={3}>
            {athroInsights.map((insight) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={insight.athro.id}>
                <Card
                  onClick={() => handleAthroClick(insight.athro)}
                  sx={{
                    height: '100%',
                    minHeight: { xs: '280px', sm: '320px' },
                    cursor: 'pointer',
                    background: insight.hasData 
                      ? 'linear-gradient(135deg, rgba(28, 42, 30, 0.9), rgba(22, 34, 28, 0.9))' 
                      : 'linear-gradient(135deg, rgba(28, 42, 30, 0.6), rgba(22, 34, 28, 0.6))',
                    border: insight.hasData 
                      ? '2px solid #4fc38a' 
                      : '2px solid rgba(181, 203, 178, 0.3)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: insight.hasData 
                        ? '0 20px 40px rgba(79, 195, 138, 0.2)' 
                        : '0 20px 40px rgba(181, 203, 178, 0.1)',
                      border: '2px solid #e4c97e'
                    }
                  }}
                >
                  {/* Background Pattern */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '100px',
                      height: '100px',
                      background: `url(${insight.athro.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.1,
                      borderRadius: '0 0 0 100px'
                    }}
                  />

                  <CardContent sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Content */}
                    {insight.hasData ? (
                      <Box sx={{ flex: 1 }}>
                        {/* 🚀 CRITICAL FIX: Add Athro Name to Data-Filled Cards */}
                        <Box sx={{ mb: 2, textAlign: 'center' }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: '#e4c97e', 
                              fontWeight: 700, 
                              fontSize: { xs: '1.1rem', sm: '1.25rem' },
                              textShadow: '0 0 8px rgba(228, 201, 126, 0.5)',
                              mb: 0.5
                            }}
                          >
                            {insight.athro.name}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#b5cbb2', 
                              fontSize: { xs: '0.75rem', sm: '0.85rem' },
                              fontWeight: 500,
                              opacity: 0.8
                            }}
                          >
                            {insight.athro.subject}
                          </Typography>
                        </Box>

                        {/* Study Time */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#b5cbb2',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                fontWeight: 500
                              }}
                            >
                              Study Time
                            </Typography>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                color: '#4fc38a', 
                                fontWeight: 700,
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }}
                            >
                              {Math.round(insight.totalStudyTime)}m
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(100, (insight.totalStudyTime / 300) * 100)} // Scale to 5 hours max
                            sx={{ 
                              height: { xs: 4, sm: 6 }, 
                              borderRadius: 3,
                              backgroundColor: 'rgba(79, 195, 138, 0.2)',
                              '& .MuiLinearProgress-bar': { backgroundColor: '#4fc38a' }
                            }}
                          />
                        </Box>

                        {/* Quiz Performance */}
                        {insight.averageQuizScore > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: '#b5cbb2',
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                  fontWeight: 500
                                }}
                              >
                                Quiz Performance
                              </Typography>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  color: getPerformanceColor(insight.averageQuizScore), 
                                  fontWeight: 700,
                                  fontSize: { xs: '1rem', sm: '1.25rem' }
                                }}
                              >
                                {Math.round(insight.averageQuizScore)}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={insight.averageQuizScore}
                              sx={{ 
                                height: { xs: 4, sm: 6 }, 
                                borderRadius: 3,
                                backgroundColor: `rgba(${getPerformanceColor(insight.averageQuizScore).replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ')}, 0.2)`,
                                '& .MuiLinearProgress-bar': { backgroundColor: getPerformanceColor(insight.averageQuizScore) }
                              }}
                            />
                          </Box>
                        )}

                        {/* Footer Stats */}
                        <Box sx={{ mt: 'auto', pt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 0 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getConfidenceTrendIcon(insight.confidenceTrend)}
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: '#b5cbb2',
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  fontWeight: 500
                                }}
                              >
                                Confidence
                              </Typography>
                            </Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#b5cbb2',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                fontWeight: 500,
                                textAlign: { xs: 'left', sm: 'right' }
                              }}
                            >
                              {insight.toolsUsed} tools used
                            </Typography>
                          </Box>
                          
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#b5cbb2', 
                              opacity: 0.7,
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              fontWeight: 400,
                              display: 'block',
                              lineHeight: 1.2
                            }}
                          >
                            {formatLastActivity(insight.lastActivity)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 2 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: '#e4c97e', 
                            fontWeight: 700, 
                            mb: 1,
                            fontSize: { xs: '1.1rem', sm: '1.25rem' },
                            textAlign: 'center',
                            textShadow: '0 0 8px rgba(228, 201, 126, 0.5)'
                          }}
                        >
                          {insight.athro.name}
                        </Typography>
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#b5cbb2', 
                            fontWeight: 500, 
                            mb: 2,
                            fontSize: { xs: '0.85rem', sm: '0.9rem' },
                            textAlign: 'center',
                            opacity: 0.8
                          }}
                        >
                          Start Your Journey
                        </Typography>
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#b5cbb2', 
                            mb: 2,
                            fontSize: { xs: '0.75rem', sm: '0.85rem' },
                            lineHeight: 1.4,
                            px: 1
                          }}
                        >
                          Visit the workspace to begin chatting, taking quizzes, and using study tools with this Athro
                        </Typography>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 1,
                          width: '100%',
                          px: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              bgcolor: '#4fc38a',
                              flexShrink: 0
                            }} />
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#b5cbb2', 
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                lineHeight: 1.2
                              }}
                            >
                              Chat and get study help
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              bgcolor: '#4fc38a',
                              flexShrink: 0
                            }} />
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#b5cbb2', 
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                lineHeight: 1.2
                              }}
                            >
                              Take quizzes to test knowledge
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              bgcolor: '#4fc38a',
                              flexShrink: 0
                            }} />
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#b5cbb2', 
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                lineHeight: 1.2
                              }}
                            >
                              Use study tools and resources
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Status Badge */}
                    <Box sx={{ position: 'absolute', top: { xs: 8, sm: 12 }, right: { xs: 8, sm: 12 } }}>
                      {insight.hasData ? (
                        <Star sx={{ color: '#e4c97e', fontSize: { xs: 16, sm: 20 } }} />
                      ) : (
                        <Star sx={{ color: '#b5cbb2', fontSize: { xs: 16, sm: 20 }, opacity: 0.3 }} />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* No Data Call-to-Action */}
          {athroInsights.length > 0 && athroInsights.every(a => !a.hasData) && (
            <Paper sx={{ 
              mt: 4, 
              p: 4, 
              textAlign: 'center',
              background: 'rgba(28, 42, 30, 0.8)',
              border: '1px solid #e4c97e'
            }}>
              <Analytics sx={{ color: '#e4c97e', fontSize: 60, mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                Ready to Start Learning?
              </Typography>
              <Typography sx={{ color: '#b5cbb2', mb: 3 }}>
                You have {selectedAthros.length} Athros selected, but no learning data yet. Start studying to see beautiful insights here!
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  console.log('🌐 [InsightsTools] Navigating to workspace using enhanced navigation...');
                  
                  // USE ENHANCED NAVIGATION - Dispatch custom event to dashboard
                  window.dispatchEvent(new CustomEvent('navigateToCard', {
                    detail: {
                      targetCard: 'workspace',
                      reason: 'Start Studying button from Insights'
                    }
                  }));
                }}
                sx={{
                  backgroundColor: '#e4c97e',
                  color: '#1c2a1e',
                  fontWeight: 700,
                  mr: 2,
                  '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.8)' }
                }}
              >
                Start Studying Now
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  console.log('🌐 [InsightsTools] Navigating to subjects card...');
                  
                  // Navigate to subjects to select more Athros
                  window.dispatchEvent(new CustomEvent('navigateToCard', {
                    detail: {
                      targetCard: 'subjects',
                      reason: 'Select more Athros from Insights'
                    }
                  }));
                }}
                sx={{
                  borderColor: '#4fc38a',
                  color: '#4fc38a',
                  '&:hover': { 
                    borderColor: '#4fc38a',
                    backgroundColor: 'rgba(79, 195, 138, 0.1)'
                  }
                }}
              >
                Select More Athros
              </Button>
            </Paper>
          )}
        </Box>
      )}

      {/* My Playlists Tab Content */}
      {currentTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5" sx={{ color: '#e4c97e' }}>
              My Learning Resources
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{
                backgroundColor: '#4fc38a',
                '&:hover': { backgroundColor: '#3da970' }
              }}
              onClick={handleCreatePlaylist}
            >
              Create Playlist
            </Button>
          </Box>

          {playlistsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: '#e4c97e' }} />
            </Box>
          ) : playlistsError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {playlistsError}
            </Alert>
          ) : playlists.length === 0 ? (
            <Paper sx={{ 
              p: 4, 
              textAlign: 'center',
              background: 'rgba(28, 42, 30, 0.8)',
              border: '1px solid #e4c97e'
            }}>
              <PlaylistPlay sx={{ color: '#e4c97e', fontSize: 60, mb: 2 }} />
              <Typography variant="h5" sx={{ color: '#e4c97e', mb: 2 }}>
                No Playlists Yet
              </Typography>
              <Typography sx={{ color: '#b5cbb2', mb: 3 }}>
                Create your first playlist to organize your learning resources!
              </Typography>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#e4c97e',
                  color: '#1c2a1e',
                  '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.8)' }
                }}
                onClick={handleCreatePlaylist}
              >
                Create Your First Playlist
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {playlists.map((playlist) => (
                <Grid item xs={12} md={6} lg={4} key={playlist.id}>
                  <Card sx={{
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(28, 42, 30, 0.9), rgba(22, 34, 28, 0.9))',
                    border: '1px solid #4fc38a',
                    borderRadius: 2
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: '#e4c97e' }}>
                          {playlist.name}
                        </Typography>
                        <IconButton 
                          size="small" 
                          sx={{ color: '#b5cbb2' }}
                          onClick={() => {
                            // Open the workspace to this playlist
                            const workspaceUrl = getWorkspaceUrl();
                            window.open(`${workspaceUrl}?playlist=${playlist.id}`, '_blank');
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>

                      <List>
                        {playlist.playlist_documents.map((doc) => (
                          <ListItem
                            key={doc.id}
                            sx={{
                              borderRadius: 1,
                              mb: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(79, 195, 138, 0.1)'
                              }
                            }}
                            onClick={() => handleDocumentClick(doc.document_url)}
                          >
                            <ListItemIcon sx={{ color: '#4fc38a' }}>
                              {getDocumentIcon(doc.document_type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
                                  {doc.title}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#b5cbb2', opacity: 0.7 }}>
                          {new Date(playlist.created_at).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={`${playlist.playlist_documents.length} items`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(79, 195, 138, 0.1)',
                            color: '#4fc38a',
                            border: '1px solid #4fc38a'
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Insights Modal */}
      {selectedAthro && (
        <AthroInsightsModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedAthro(null);
          }}
          athro={selectedAthro}
        />
      )}
    </Box>
  );
};

export default InsightsTools; 