import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Paper,
  Divider,
  Badge
} from '@mui/material';
import {
  EmojiEvents,
  Chat,
  Build,
  CloudUpload,
  PlaylistPlay,
  Timer,
  TrendingUp,
  Close,
  Analytics,
  History,
  Star,
  Assessment
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { insightsService, AthroStats, AthroLeaderboardData } from '../../services/insightsService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: '1rem' }}>
    {value === index && children}
  </div>
);

interface AthroLeaderboardProps {
  expanded?: boolean;
}

const AthroLeaderboard: React.FC<AthroLeaderboardProps> = ({ expanded = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<AthroLeaderboardData | null>(null);
  const [selectedAthro, setSelectedAthro] = useState<AthroStats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboardData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        insightsService.setUser(user);
        const data = await insightsService.getAthroLeaderboardData();
        setLeaderboardData(data);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to load leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboardData();
  }, [user]);

  // Get rank position styling
  const getRankStyling = (position: number) => {
    switch (position) {
      case 1:
        return {
          borderColor: '#FFD700', // Gold
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          rankIcon: '🥇',
          rankSize: '4rem',
          glowColor: 'rgba(255, 215, 0, 0.4)'
        };
      case 2:
        return {
          borderColor: '#C0C0C0', // Silver
          backgroundColor: 'rgba(192, 192, 192, 0.1)',
          rankIcon: '🥈',
          rankSize: '3.5rem',
          glowColor: 'rgba(192, 192, 192, 0.4)'
        };
      case 3:
        return {
          borderColor: '#CD7F32', // Bronze
          backgroundColor: 'rgba(205, 127, 50, 0.1)',
          rankIcon: '🥉',
          rankSize: '3rem',
          glowColor: 'rgba(205, 127, 50, 0.4)'
        };
      default:
        return {
          borderColor: 'rgba(228, 201, 126, 0.3)',
          backgroundColor: 'rgba(28, 42, 30, 0.6)',
          rankIcon: `#${position}`,
          rankSize: '2.5rem',
          glowColor: 'rgba(228, 201, 126, 0.2)'
        };
    }
  };

  // Handle athro card click
  const handleAthroClick = (athro: AthroStats) => {
    setSelectedAthro(athro);
    setDialogOpen(true);
    setTabValue(0);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAthro(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!leaderboardData || leaderboardData.leaderboard.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          No Athro performance data available yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Start studying with your Athros to see their performance stats!
        </Typography>
      </Box>
    );
  }

  const { leaderboard, userTotalStats } = leaderboardData;
  const topThree = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  return (
    <Box>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" color="primary.main" gutterBottom>
          🏆 Athro Performance Leaders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your most engaged Athros based on combined activity metrics
        </Typography>
      </Box>

      {/* User Total Stats Summary */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: 'linear-gradient(135deg, rgba(228, 201, 126, 0.1), rgba(79, 195, 138, 0.1))',
          border: '1px solid rgba(228, 201, 126, 0.3)'
        }}
      >
        <Typography variant="h6" color="primary.main" gutterBottom>
          📊 Your Total Activity
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary.main">{userTotalStats.totalChats}</Typography>
              <Typography variant="caption">Total Chats</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary.main">{userTotalStats.totalComments}</Typography>
              <Typography variant="caption">Total Comments</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary.main">{userTotalStats.totalToolsSaved}</Typography>
              <Typography variant="caption">Tools Saved</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary.main">{Math.round(userTotalStats.totalTimeSpent / 60 * 10) / 10}h</Typography>
              <Typography variant="caption">Study Time</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Top 3 Podium */}
      <Box mb={4}>
        <Typography variant="h5" color="primary.main" gutterBottom textAlign="center">
          🏅 Hall of Fame
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {topThree.map((athro, index) => {
            const rank = index + 1;
            const styling = getRankStyling(rank);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={athro.athroId}>
                <Card
                  onClick={() => handleAthroClick(athro)}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    background: styling.backgroundColor,
                    border: `2px solid ${styling.borderColor}`,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'visible',
                    boxShadow: `0 8px 32px ${styling.glowColor}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: `0 16px 48px ${styling.glowColor}`,
                    }
                  }}
                >
                  {/* Rank Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '-15px',
                      right: '15px',
                      fontSize: styling.rankSize,
                      zIndex: 2
                    }}
                  >
                    {styling.rankIcon}
                  </Box>

                  <CardContent sx={{ textAlign: 'center', pt: 3 }}>
                    {/* Athro Avatar */}
                    <Avatar
                      src={`/athros/athro-${athro.subject.toLowerCase()}.jpg`}
                      sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        border: `3px solid ${styling.borderColor}`
                      }}
                    >
                      {athro.athroName.charAt(0)}
                    </Avatar>

                    {/* Athro Name & Subject */}
                    <Typography variant="h6" color="primary.main" gutterBottom>
                      {athro.athroName}
                    </Typography>
                    <Chip 
                      label={athro.subject} 
                      size="small" 
                      sx={{ 
                        mb: 2,
                        backgroundColor: styling.borderColor,
                        color: '#1c2a1e'
                      }} 
                    />

                    {/* Score */}
                    <Typography variant="h4" color="primary.main" sx={{ mb: 1 }}>
                      {athro.totalScore}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Score
                    </Typography>

                    {/* Quick Stats */}
                    <Grid container spacing={1} sx={{ mt: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          💬 {athro.chatCount} chats
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          ⏱️ {Math.round(athro.totalTimeSpent / 60 * 10) / 10}h
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          🛠️ {athro.toolsSaved} tools
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          📁 {athro.resourcesUploaded} files
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Other Athros */}
      {others.length > 0 && (
        <Box>
          <Typography variant="h6" color="primary.main" gutterBottom>
            Other Athros
          </Typography>
          <Grid container spacing={2}>
            {others.map((athro, index) => {
              const rank = index + 4;
              const styling = getRankStyling(rank);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={athro.athroId}>
                  <Card
                    onClick={() => handleAthroClick(athro)}
                    sx={{
                      cursor: 'pointer',
                      background: styling.backgroundColor,
                      border: `1px solid ${styling.borderColor}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 24px ${styling.glowColor}`,
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Typography variant="h6" color="text.secondary" mr={2}>
                          #{rank}
                        </Typography>
                        <Avatar
                          src={`/athros/athro-${athro.subject.toLowerCase()}.jpg`}
                          sx={{ width: 40, height: 40, mr: 2 }}
                        >
                          {athro.athroName.charAt(0)}
                        </Avatar>
                        <Box flexGrow={1}>
                          <Typography variant="subtitle1" color="primary.main">
                            {athro.athroName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {athro.subject}
                          </Typography>
                        </Box>
                        <Typography variant="h6" color="primary.main">
                          {athro.totalScore}
                        </Typography>
                      </Box>
                      
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((athro.totalScore / leaderboard[0].totalScore) * 100, 100)}
                        sx={{ mb: 1 }}
                      />
                      
                      <Typography variant="caption" color="text.secondary">
                        {Math.round((athro.totalScore / leaderboard[0].totalScore) * 100)}% of leader
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Detailed Stats Modal */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(28, 42, 30, 0.95), rgba(22, 34, 28, 0.95))',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(228, 201, 126, 0.3)'
          }
        }}
      >
        {selectedAthro && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Avatar
                    src={`/athros/athro-${selectedAthro.subject.toLowerCase()}.jpg`}
                    sx={{ width: 60, height: 60, mr: 2 }}
                  >
                    {selectedAthro.athroName.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" color="primary.main">
                      {selectedAthro.athroName} Analytics
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                      {selectedAthro.subject} • Score: {selectedAthro.totalScore}
                    </Typography>
                  </Box>
                </Box>
                <IconButton onClick={handleCloseDialog} color="primary">
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
              >
                <Tab label="📊 Overview" />
                <Tab label="📋 Detailed Stats" />
                <Tab label="📚 History" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {/* Overview Tab */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, background: 'rgba(79, 195, 138, 0.1)' }}>
                      <Typography variant="h6" color="primary.main" gutterBottom>
                        🗣️ Communication Stats
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Total Chats:</Typography>
                        <Typography color="primary.main">{selectedAthro.chatCount}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Total Comments:</Typography>
                        <Typography color="primary.main">{selectedAthro.totalChatComments}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Avg Comments/Chat:</Typography>
                        <Typography color="primary.main">{selectedAthro.averageChatComments.toFixed(1)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Token Usage:</Typography>
                        <Typography color="primary.main">{selectedAthro.tokenUsage.toLocaleString()}</Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, background: 'rgba(228, 201, 126, 0.1)' }}>
                      <Typography variant="h6" color="primary.main" gutterBottom>
                        ⏱️ Time & Activity
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Total Study Time:</Typography>
                        <Typography color="primary.main">{Math.round(selectedAthro.totalTimeSpent / 60 * 10) / 10}h</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Avg Session Time:</Typography>
                        <Typography color="primary.main">{selectedAthro.averageSessionTime.toFixed(0)}min</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Tools Saved:</Typography>
                        <Typography color="primary.main">{selectedAthro.toolsSaved}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Last Activity:</Typography>
                        <Typography color="primary.main">
                          {selectedAthro.lastActivity.toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, background: 'rgba(181, 203, 178, 0.1)' }}>
                      <Typography variant="h6" color="primary.main" gutterBottom>
                        📁 Content Creation
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Resources Uploaded:</Typography>
                        <Typography color="primary.main">{selectedAthro.resourcesUploaded}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Playlists Created:</Typography>
                        <Typography color="primary.main">{selectedAthro.playlistsCreated}</Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, background: 'rgba(232, 90, 106, 0.1)' }}>
                      <Typography variant="h6" color="primary.main" gutterBottom>
                        🏆 Performance Ranking
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Total Score:</Typography>
                        <Typography color="primary.main" variant="h6">{selectedAthro.totalScore}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Rank Position:</Typography>
                        <Typography color="primary.main">
                          #{leaderboard.findIndex(a => a.athroId === selectedAthro.athroId) + 1}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {/* Detailed Stats Tab */}
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Score Contribution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Chat Sessions</TableCell>
                      <TableCell align="right">{selectedAthro.chatCount}</TableCell>
                      <TableCell align="right">{selectedAthro.chatCount * 10}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Chat Comments</TableCell>
                      <TableCell align="right">{selectedAthro.totalChatComments}</TableCell>
                      <TableCell align="right">{selectedAthro.totalChatComments * 2}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Tools Saved</TableCell>
                      <TableCell align="right">{selectedAthro.toolsSaved}</TableCell>
                      <TableCell align="right">{selectedAthro.toolsSaved * 5}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Resources Uploaded</TableCell>
                      <TableCell align="right">{selectedAthro.resourcesUploaded}</TableCell>
                      <TableCell align="right">{selectedAthro.resourcesUploaded * 8}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Playlists Created</TableCell>
                      <TableCell align="right">{selectedAthro.playlistsCreated}</TableCell>
                      <TableCell align="right">{selectedAthro.playlistsCreated * 6}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Study Time (10min blocks)</TableCell>
                      <TableCell align="right">{Math.floor(selectedAthro.totalTimeSpent / 10)}</TableCell>
                      <TableCell align="right">{Math.floor(selectedAthro.totalTimeSpent / 10)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Token Usage (100 token blocks)</TableCell>
                      <TableCell align="right">{Math.floor(selectedAthro.tokenUsage / 100)}</TableCell>
                      <TableCell align="right">{Math.floor(selectedAthro.tokenUsage / 100)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ backgroundColor: 'rgba(228, 201, 126, 0.1)' }}>
                      <TableCell><strong>Total Score</strong></TableCell>
                      <TableCell align="right"><strong>-</strong></TableCell>
                      <TableCell align="right"><strong>{selectedAthro.totalScore}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {/* History Tab */}
                <Box>
                  <Typography variant="h6" color="primary.main" gutterBottom>
                    📚 Your Journey with {selectedAthro.athroName}
                  </Typography>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      Last Activity: {selectedAthro.lastActivity.toLocaleDateString()}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      Total Engagement Score: {selectedAthro.totalScore} points
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      Most Active in: {selectedAthro.subject}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Detailed history tracking coming soon! This will include:
                      • Timeline of all interactions
                      • Progress over time charts
                      • Milestone achievements
                      • Conversation highlights
                    </Typography>
                  </Paper>
                </Box>
              </TabPanel>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AthroLeaderboard; 