import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Close,
  Timeline,
  Assessment,
  Psychology,
  EmojiEvents,
  TrendingUp,
  AccessTime,
  Quiz,
  Book,
  School,
  Lightbulb,
  Star
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Area, AreaChart } from 'recharts';
import { Athro } from '@athro/shared-types';
import { insightsService } from '../../services/insightsService';

interface AthroInsightsModalProps {
  open: boolean;
  onClose: () => void;
  athro: Athro;
}

interface AthroInsightsData {
  studySessions: any[];
  toolUsage: any[];
  quizResults: any[];
  confidenceHistory: any[];
  totalStudyTime: number;
  averageSessionLength: number;
  sessionCount: number;
  averageQuizScore: number;
  confidenceTrend: number;
  lastActivity: string | null;
  toolBreakdown: Record<string, number>;
  performanceTrend: any[];
  weeklyActivity: any[];
}

const CHART_COLORS = ['#e4c97e', '#4fc38a', '#e85a6a', '#b5cbb2', '#8b5cf6', '#f59e0b'];

const TabPanel: React.FC<{ children?: React.ReactNode; index: number; value: number }> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export const AthroInsightsModal: React.FC<AthroInsightsModalProps> = ({ open, onClose, athro }) => {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [insightsData, setInsightsData] = useState<AthroInsightsData | null>(null);

  useEffect(() => {
    if (open && athro) {
      loadAthroInsights();
    }
  }, [open, athro]);

  const loadAthroInsights = async () => {
    try {
      setLoading(true);

      // Load all data for this specific athro
      const [sessions, tools, quizzes, confidence] = await Promise.all([
        insightsService.getStudySessions(100),
        insightsService.getToolUsage(100),
        insightsService.getQuizResults(100),
        insightsService.getConfidenceHistory(100)
      ]);

      // Filter data for this specific athro
      const athroSessions = sessions.filter(s => s.athro_id === athro.id || s.subject === athro.subject);
      const athroTools = tools.filter(t => t.athro_id === athro.id);
      const athroQuizzes = quizzes.filter(q => q.subject === athro.subject);
      const athroConfidence = confidence.filter(c => c.athro_id === athro.id || c.subject === athro.subject);

      // Calculate metrics
      const totalStudyTime = athroSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
      const sessionCount = athroSessions.length;
      const averageSessionLength = sessionCount > 0 ? totalStudyTime / sessionCount : 0;
      const averageQuizScore = athroQuizzes.length > 0 
        ? athroQuizzes.reduce((sum, q) => sum + (q.score / q.total_questions * 100), 0) / athroQuizzes.length 
        : 0;

      // Confidence trend (compare latest vs earliest)
      const sortedConfidence = athroConfidence.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const confidenceTrend = sortedConfidence.length >= 2 
        ? sortedConfidence[sortedConfidence.length - 1].confidence_level - sortedConfidence[0].confidence_level
        : 0;

      // Last activity
      const allActivities = [...athroSessions, ...athroTools, ...athroQuizzes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastActivity = allActivities.length > 0 ? allActivities[0].created_at : null;

      // Tool breakdown
      const toolBreakdown = athroTools.reduce((acc, tool) => {
        acc[tool.tool_type] = (acc[tool.tool_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Performance trend (last 7 sessions)
      const recentSessions = athroSessions.slice(-7).map((session, index) => ({
        session: `Session ${index + 1}`,
        duration: session.duration_minutes,
        date: new Date(session.created_at).toLocaleDateString()
      }));

      // Weekly activity (last 7 days)
      const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayData = athroSessions.filter(s => {
          const sessionDate = new Date(s.created_at);
          return sessionDate.toDateString() === date.toDateString();
        });
        return {
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          minutes: dayData.reduce((sum, s) => sum + s.duration_minutes, 0),
          sessions: dayData.length
        };
      });

      setInsightsData({
        studySessions: athroSessions,
        toolUsage: athroTools,
        quizResults: athroQuizzes,
        confidenceHistory: athroConfidence,
        totalStudyTime,
        averageSessionLength,
        sessionCount,
        averageQuizScore,
        confidenceTrend,
        lastActivity,
        toolBreakdown,
        performanceTrend: recentSessions,
        weeklyActivity
      });

    } catch (error) {
      console.error('Error loading athro insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'No activity yet';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getConfidenceTrendColor = (trend: number) => {
    if (trend > 0) return '#4fc38a';
    if (trend < 0) return '#e85a6a';
    return '#b5cbb2';
  };

  const getConfidenceTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp />;
    if (trend < 0) return <Timeline style={{ transform: 'rotate(180deg)' }} />;
    return <Timeline />;
  };

  if (!insightsData && !loading) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(28, 42, 30, 0.95), rgba(22, 34, 28, 0.95))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(228, 201, 126, 0.3)',
          borderRadius: 3,
          minHeight: '80vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Avatar
              src={`/athros/athro-${athro.subject.toLowerCase()}.jpg`}
              sx={{ 
                width: 80, 
                height: 80, 
                mr: 3,
                border: '3px solid #e4c97e',
                background: 'linear-gradient(135deg, #e4c97e, #4fc38a)'
              }}
            >
              <School sx={{ fontSize: 40, color: '#1c2a1e' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ color: '#e4c97e', fontWeight: 700, mb: 1 }}>
                {athro.name} Insights
              </Typography>
              <Typography variant="h6" sx={{ color: '#b5cbb2', mb: 1 }}>
                {athro.subject} • {athro.description}
              </Typography>
              {insightsData && (
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip 
                    icon={<AccessTime />}
                    label={formatLastActivity(insightsData.lastActivity)}
                    sx={{ 
                      backgroundColor: 'rgba(228, 201, 126, 0.1)',
                      color: '#e4c97e',
                      border: '1px solid #e4c97e'
                    }}
                  />
                  {insightsData.sessionCount > 0 && (
                    <Chip 
                      icon={<EmojiEvents />}
                      label={`${insightsData.sessionCount} sessions`}
                      sx={{ 
                        backgroundColor: 'rgba(79, 195, 138, 0.1)',
                        color: '#4fc38a',
                        border: '1px solid #4fc38a'
                      }}
                    />
                  )}
                </Box>
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#e4c97e' }}>
            <Close fontSize="large" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="400px">
            <CircularProgress sx={{ color: '#e4c97e' }} size={60} />
          </Box>
        ) : insightsData ? (
          <>


            {/* Tabs for detailed analytics */}
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(228, 201, 126, 0.2)', mb: 3 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                sx={{
                  '& .MuiTabs-indicator': { backgroundColor: '#e4c97e' },
                  '& .MuiTab-root': {
                    color: '#b5cbb2',
                    '&.Mui-selected': { color: '#e4c97e' },
                  },
                }}
              >
                <Tab icon={<Timeline />} label="Activity Trends" />
                <Tab icon={<Assessment />} label="Performance" />
                <Tab icon={<Psychology />} label="Tools & Study Methods" />
                <Tab icon={<Star />} label="Progress Overview" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, background: 'rgba(28, 42, 30, 0.8)', border: '1px solid #4fc38a' }}>
                    <Typography variant="h6" sx={{ color: '#4fc38a', mb: 2 }}>
                      Weekly Activity Pattern
                    </Typography>
                    {insightsData.weeklyActivity.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={insightsData.weeklyActivity}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(181, 203, 178, 0.2)" />
                          <XAxis dataKey="day" stroke="#b5cbb2" />
                          <YAxis stroke="#b5cbb2" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1c2a1e', 
                              border: '1px solid #4fc38a',
                              borderRadius: '8px',
                              color: '#b5cbb2'
                            }} 
                          />
                          <Area type="monotone" dataKey="minutes" stroke="#4fc38a" fill="rgba(79, 195, 138, 0.3)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 4 }}>
                        No activity data yet
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, background: 'rgba(28, 42, 30, 0.8)', border: '1px solid #e4c97e' }}>
                    <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                      Session Duration Trend
                    </Typography>
                    {insightsData.performanceTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={insightsData.performanceTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(181, 203, 178, 0.2)" />
                          <XAxis dataKey="session" stroke="#b5cbb2" />
                          <YAxis stroke="#b5cbb2" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1c2a1e', 
                              border: '1px solid #e4c97e',
                              borderRadius: '8px',
                              color: '#b5cbb2'
                            }} 
                          />
                          <Line type="monotone" dataKey="duration" stroke="#e4c97e" strokeWidth={3} dot={{ fill: '#e4c97e', strokeWidth: 2, r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 4 }}>
                        No session data yet
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, background: 'rgba(28, 42, 30, 0.8)', border: '1px solid #4fc38a' }}>
                    <Typography variant="h6" sx={{ color: '#4fc38a', mb: 2 }}>
                      Quiz Performance History
                    </Typography>
                    {insightsData.quizResults.length > 0 ? (
                      <Box>
                        {insightsData.quizResults.slice(-5).map((quiz, index) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography sx={{ color: '#b5cbb2' }}>
                                Quiz {index + 1}
                              </Typography>
                              <Typography sx={{ color: '#4fc38a', fontWeight: 700 }}>
                                {Math.round((quiz.score / quiz.total_questions) * 100)}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={(quiz.score / quiz.total_questions) * 100}
                              sx={{ 
                                height: 8, 
                                borderRadius: 4,
                                backgroundColor: 'rgba(79, 195, 138, 0.2)',
                                '& .MuiLinearProgress-bar': { backgroundColor: '#4fc38a' }
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 4 }}>
                        No quiz results yet
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, background: 'rgba(28, 42, 30, 0.8)', border: '1px solid #e85a6a' }}>
                    <Typography variant="h6" sx={{ color: '#e85a6a', mb: 2 }}>
                      Confidence Journey
                    </Typography>
                    {insightsData.confidenceHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={insightsData.confidenceHistory.map((conf, index) => ({
                          point: index + 1,
                          confidence: conf.confidence_level,
                          date: new Date(conf.created_at).toLocaleDateString()
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(181, 203, 178, 0.2)" />
                          <XAxis dataKey="point" stroke="#b5cbb2" />
                          <YAxis domain={[1, 10]} stroke="#b5cbb2" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1c2a1e', 
                              border: '1px solid #e85a6a',
                              borderRadius: '8px',
                              color: '#b5cbb2'
                            }} 
                          />
                          <Line type="monotone" dataKey="confidence" stroke="#e85a6a" strokeWidth={3} dot={{ fill: '#e85a6a', strokeWidth: 2, r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 4 }}>
                        No confidence data yet
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, background: 'rgba(28, 42, 30, 0.8)', border: '1px solid #b5cbb2' }}>
                    <Typography variant="h6" sx={{ color: '#b5cbb2', mb: 2 }}>
                      Study Tools Usage
                    </Typography>
                    {Object.keys(insightsData.toolBreakdown).length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(insightsData.toolBreakdown).map(([tool, count]) => ({
                              name: tool.replace('_', ' ').toUpperCase(),
                              value: count
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {Object.entries(insightsData.toolBreakdown).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 4 }}>
                        No tool usage data yet
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, background: 'rgba(28, 42, 30, 0.8)', border: '1px solid #8b5cf6' }}>
                    <Typography variant="h6" sx={{ color: '#8b5cf6', mb: 2 }}>
                      Study Method Breakdown
                    </Typography>
                    {insightsData.studySessions.length > 0 ? (
                      <Box>
                        {Object.entries(
                          insightsData.studySessions.reduce((acc, session) => {
                            acc[session.session_type] = (acc[session.session_type] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => {
                          const sessionCount = count as number;
                          return (
                            <Box key={type} sx={{ mb: 2 }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography sx={{ color: '#b5cbb2', textTransform: 'capitalize' }}>
                                  {type} Sessions
                                </Typography>
                                <Typography sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                                  {sessionCount}
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={(sessionCount / insightsData.studySessions.length) * 100}
                              sx={{ 
                                height: 8, 
                                borderRadius: 4,
                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                '& .MuiLinearProgress-bar': { backgroundColor: '#8b5cf6' }
                              }}
                            />
                                                      </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography sx={{ color: '#b5cbb2', textAlign: 'center', py: 4 }}>
                        No session data yet
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Paper sx={{ p: 4, background: 'rgba(28, 42, 30, 0.8)', border: '1px solid #e4c97e', textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#e4c97e', mb: 3 }}>
                  Overall Progress Summary
                </Typography>
                
                {insightsData.sessionCount === 0 ? (
                  <Box>
                    <Lightbulb sx={{ color: '#e4c97e', fontSize: 60, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                      Ready to Start Your Journey?
                    </Typography>
                    <Typography sx={{ color: '#b5cbb2', mb: 3 }}>
                      No data yet for {athro.name}. Start studying to see your progress insights here!
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{
                        backgroundColor: '#e4c97e',
                        color: '#1c2a1e',
                        fontWeight: 700,
                        '&:hover': { backgroundColor: 'rgba(228, 201, 126, 0.8)' }
                      }}
                      onClick={onClose}
                    >
                      Start Studying
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ color: '#4fc38a', mb: 1 }}>
                          Study Consistency
                        </Typography>
                        <Typography variant="h3" sx={{ color: '#4fc38a', fontWeight: 700 }}>
                          {insightsData.weeklyActivity.filter(day => day.minutes > 0).length}/7
                        </Typography>
                        <Typography sx={{ color: '#b5cbb2' }}>
                          days this week
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ color: '#e85a6a', mb: 1 }}>
                          Learning Momentum
                        </Typography>
                        <Typography variant="h3" sx={{ color: '#e85a6a', fontWeight: 700 }}>
                          {insightsData.performanceTrend.length > 1 && 
                           insightsData.performanceTrend[insightsData.performanceTrend.length - 1].duration > 
                           insightsData.performanceTrend[0].duration ? '📈' : '📊'}
                        </Typography>
                        <Typography sx={{ color: '#b5cbb2' }}>
                          {insightsData.performanceTrend.length > 1 && 
                           insightsData.performanceTrend[insightsData.performanceTrend.length - 1].duration > 
                           insightsData.performanceTrend[0].duration ? 'Improving' : 'Steady'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ color: '#8b5cf6', mb: 1 }}>
                          Tool Mastery
                        </Typography>
                        <Typography variant="h3" sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                          {Object.keys(insightsData.toolBreakdown).length}
                        </Typography>
                        <Typography sx={{ color: '#b5cbb2' }}>
                          tools used
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </TabPanel>
          </>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
              No data available yet
            </Typography>
            <Typography sx={{ color: '#b5cbb2' }}>
              Start studying with {athro.name} to see insights here!
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}; 