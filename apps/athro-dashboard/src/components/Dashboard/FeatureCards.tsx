import { Box, Dialog, DialogTitle, DialogContent, Tabs, Tab, Select, MenuItem, CircularProgress } from '@mui/material';
import { FeatureCard } from './FeatureCard';
import { useState, useEffect } from 'react';
import { PrioritiseAthrosSection } from './PrioritiseAthrosSection';
import { AthroSelectionSection } from './AthroSelectionSection';
import { Settings } from '@mui/icons-material';
import { SettingsModal } from './SettingsModal';
import { Typography, Button } from '@mui/material';
import { ConfidenceSection } from './ConfidenceSection';
import { ATHROS } from '@athro/shared-athros';
import { workspaceService, athroSelectionService, eventBus, EVENTS } from '@athro/shared-services';
import QuizIcon from '@mui/icons-material/Quiz';
import { QuizQuestion } from '../../types/athro';
import { generateQuiz } from '../../utils/AthroSection/quiz';
import { getCurriculumInfoWithFallback } from '../../utils/curriculumMapping';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { Athro, ConfidenceLevel } from '@athro/shared-types';
import DashboardCalendar from './DashboardCalendar';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionService } from '@athro/shared-services';

export const FeatureCards = () => {
  const [showAthroSelection, setShowAthroSelection] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showConfidence, setShowConfidence] = useState(false);
  const [confidenceTab, setConfidenceTab] = useState(0);
  const [confidenceLevels, setConfidenceLevels] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizSubject, setQuizSubject] = useState<string | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizReveal, setQuizReveal] = useState(false);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [prioritySubjects, setPrioritySubjects] = useState<Set<string>>(new Set());

  // REMOVED localStorage fallback for priorities - all data now comes from Supabase via userPreferencesService
  // This eliminates any chance of serving stale "AthroWelsh" data from localStorage

  useEffect(() => {
    const levelsRaw = workspaceService.getConfidenceLevels();
    const levels: Record<string, number> = {};
    Object.entries(levelsRaw).forEach(([id, val]) => {
      if (typeof val === 'number') levels[id] = val;
      else if (val === 'HIGH') levels[id] = 9;
      else if (val === 'MEDIUM') levels[id] = 6;
      else if (val === 'LOW') levels[id] = 2;
    });
    setConfidenceLevels(levels as Record<string, number>);
    const subscriptionId = workspaceService.subscribeToConfidenceUpdates('dashboard', (levels: any) => {
      setConfidenceLevels(levels as Record<string, number>);
    });
    const selections = athroSelectionService.getSelections('athro-dashboard');
    setSelectedIds(selections.filter(s => s.selected).map(s => s.athroId));
    const unsubSelection = () => {
      const handler = () => {
        const sel = athroSelectionService.getSelections('athro-dashboard');
        setSelectedIds(sel.filter(s => s.selected).map(s => s.athroId));
      };
      window.addEventListener('focus', handler);
      const eventUnsub = eventBus.subscribe(EVENTS.SELECTION_UPDATED, handler);
      return () => {
        window.removeEventListener('focus', handler);
        eventBus.unsubscribe(eventUnsub);
      };
    };
    const cleanup = unsubSelection();
    return () => {
      workspaceService.unsubscribeFromConfidenceUpdates(subscriptionId);
      cleanup();
    };
  }, []);

  const selectedAthros = ATHROS.filter(a => selectedIds.includes(a.id));

  const features = [
    {
      title: 'Confidence Levels',
      description: 'Set and track your confidence for each subject.',
      imagePath: '/athros/athro-confidence.jpg',
      onClick: () => setShowConfidence(true),
    },
    {
      title: 'Study Workspace',
      description: 'Your dedicated space for focused learning and interactive sessions.',
      imagePath: '/athros/athro-study1.jpg',
    },
    {
      title: 'Learning Analytics',
      description: 'Track your progress and optimize your study patterns.',
      imagePath: '/athros/athro-metrics.jpg',
    },
    {
      title: 'Settings',
      description: 'Manage your account, school, and subjects.',
      imagePath: '/athros/athro-settings.jpg',
      onClick: () => setShowSettings(true),
    },
  ];

  const CONFIDENCE_SCALE = Array.from({ length: 10 }, (_, i) => i + 1);
  const getConfidenceMeta = (level: number) => {
    if (level >= 8) return { label: 'High', color: '#4fc38a' };
    if (level >= 5) return { label: 'Medium', color: '#e4c97e' };
    return { label: 'Low', color: '#e85a6a' };
  };

  const handleStartQuiz = async (subject: string) => {
    try {
      setQuizLoading(true);
      setQuizOpen(true);
      setQuizSubject(subject);
      
      // CRITICAL: Check if user can generate quiz (requires GPT-4.1 tokens)
      const { user } = useAuth();
      if (!user) {
        throw new Error('Please log in to take a quiz');
      }

      // Create subscription service instance
      const subscriptionService = new SubscriptionService(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      // Check quiz usage specifically (this enforces GPT-4.1 usage)
      const usageCheck = await subscriptionService.checkQuizUsage(user.id, 500); // Estimate 500 tokens for quiz
      
      if (!usageCheck.canProceed) {
        setQuizLoading(false);
        setQuizOpen(false);
        // Show upgrade modal if insufficient tokens
        alert(`Insufficient tokens for quiz generation. ${usageCheck.error || 'Please upgrade your plan.'}`);
        return;
      }

      // Generate quiz using GPT-4.1 (enforced in the quiz utility)
      const questions = await generateQuiz(subject, 10);
      setQuizQuestions(questions);
      setQuizAnswers(new Array(questions.length).fill(-1));
      
      // Record the actual token usage after successful generation
      await subscriptionService.recordUsage(user.id, 'gpt-4o', 300, 200); // Record actual usage
      
    } catch (error) {
      console.error('Quiz generation failed:', error);
      alert('Failed to generate quiz. Please try again or upgrade your plan.');
      setQuizLoading(false);
      setQuizOpen(false);
    }
  };

  const handleQuizAnswer = (idx: number) => {
    if (quizReveal) return;
    setQuizSelected(idx);
    setQuizReveal(true);
    setQuizAnswers(prev => [...prev, idx]);
  };

  const handleQuizNext = () => {
    setQuizReveal(false);
    setQuizSelected(null);
    if (quizIdx < (quizQuestions.length - 1)) {
      setQuizIdx(quizIdx + 1);
    } else {
      // Score
      let score = 0;
      for (let i = 0; i < quizQuestions.length; i++) {
        if (quizAnswers[i] === quizQuestions[i].answer) score++;
      }
      setQuizScore(score);
      // Set confidence for this subject
      if (quizSubject) {
        const athro = selectedAthros.find(a => a.subject === quizSubject);
        if (athro) {
          const confidenceLevel = Math.min(Math.max(score, 0), 10) as unknown as ConfidenceLevel;
          workspaceService.broadcastConfidenceUpdate(athro.id, confidenceLevel);
        }
      }
    }
  };

  const handleQuizClose = () => {
    setQuizOpen(false);
    setQuizQuestions([]);
    setQuizSubject(null);
    setQuizIdx(0);
    setQuizAnswers([]);
    setQuizScore(null);
    setQuizReveal(false);
    setQuizSelected(null);
  };

  const togglePriority = (athroId: string) => {
    setPrioritySubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(athroId)) {
        newSet.delete(athroId);
      } else {
        newSet.add(athroId);
      }
      return newSet;
    });
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
          width: '100%',
        }}
      >
        {features.map((feature) => (
          <Box key={feature.title} onClick={feature.onClick} sx={{ cursor: feature.onClick ? 'pointer' : 'default' }}>
            <FeatureCard {...feature} />
          </Box>
        ))}
      </Box>
      {/* Selected Athros Section */}
      {selectedAthros.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" color="primary.main" sx={{ mb: 3, textAlign: 'center' }}>
            Your Selected Athros
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 2
          }}>
            {selectedAthros.map((athro) => (
              <Box
                key={athro.id}
                onClick={e => {
                  if ((e.target as HTMLElement).closest('.athro-interactive')) return;
                  togglePriority(athro.id);
                }}
                sx={{
                  position: 'relative',
                  background: 'rgba(36,54,38,0.78)',
                  borderRadius: '0.7rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.7rem',
                  maxWidth: 282,
                  minWidth: 0,
                  width: '100%',
                  boxShadow: '0 2px 12px #0005',
                  border: prioritySubjects.has(athro.id) ? '2px solid #e4c97e' : '2px solid transparent',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3 }}>
                  {prioritySubjects.has(athro.id) ? <StarIcon sx={{ color: '#e4c97e', fontSize: 28 }} /> : <StarBorderIcon sx={{ color: '#b5cbb2', fontSize: 28 }} />}
                </Box>
                <img
                  src={athro.image}
                  alt={athro.name}
                  style={{
                    width: '100%',
                    maxWidth: 173,
                    height: 'auto',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 12px #0005'
                  }}
                />
                <Typography
                  sx={{
                    color: '#e4c97e',
                    fontSize: '0.91rem',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                >
                  {athro.name}
                </Typography>
                <Typography
                  sx={{
                    color: '#b5cbb2',
                    fontSize: '0.72rem',
                    textAlign: 'center'
                  }}
                >
                  {athro.subject}
                </Typography>
                <Typography sx={{ color: getConfidenceMeta(confidenceLevels[athro.id] || 0).color, fontWeight: 600, fontSize: '0.78rem', mt: 0.5 }}>
                  {confidenceLevels[athro.id] ? getConfidenceMeta(confidenceLevels[athro.id]).label : 'Not set'}
                </Typography>
                <Select
                  className="athro-interactive"
                  size="small"
                  value={confidenceLevels[athro.id] || ''}
                  displayEmpty
                  onChange={e => {
                    const value = Number(e.target.value);
                    const confidenceLevel = Math.min(Math.max(value, 0), 10) as unknown as ConfidenceLevel;
                    workspaceService.broadcastConfidenceUpdate(athro.id, confidenceLevel);
                  }}
                  sx={{
                    mt: 0.5,
                    fontSize: '0.8rem',
                    minWidth: 60,
                    background: '#222',
                    color: getConfidenceMeta(confidenceLevels[athro.id] || 0).color,
                    borderRadius: '0.4rem',
                    '& .MuiSelect-icon': { color: getConfidenceMeta(confidenceLevels[athro.id] || 0).color },
                  }}
                >
                  <MenuItem value="" disabled>Select</MenuItem>
                  {CONFIDENCE_SCALE.map(level => (
                    <MenuItem key={level} value={level} style={{ color: getConfidenceMeta(level).color }}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  className="athro-interactive"
                  variant="outlined"
                  size="small"
                  startIcon={<QuizIcon />}
                  sx={{ mt: 1, fontSize: '0.7rem', color: '#e4c97e', borderColor: '#e4c97e' }}
                  onClick={e => { e.stopPropagation(); handleStartQuiz(athro.subject); }}
                >
                  Quiz
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {showConfidence && (
        <Dialog open onClose={() => setShowConfidence(false)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ color: '#e4c97e', textAlign: 'center' }}>Confidence Levels</DialogTitle>
          <DialogContent>
            <Tabs value={confidenceTab} onChange={(_, v) => setConfidenceTab(v)} centered sx={{ mb: 3 }}>
              <Tab label="Set Confidence" />
              <Tab label="Take Quiz" />
              <Tab label="Metrics" />
            </Tabs>
            {confidenceTab === 0 && (
              <ConfidenceSection />
            )}
            {confidenceTab === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" color="primary.main">Take a quiz for your subjects (UI coming soon)</Typography>
                {/* TODO: Add quiz UI */}
              </Box>
            )}
            {confidenceTab === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" color="primary.main">View your confidence metrics over time (UI coming soon)</Typography>
                {/* TODO: Add metrics/charts UI */}
              </Box>
            )}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button variant="contained" color="primary" onClick={() => setShowConfidence(false)}>
                Save
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      )}
      {showAthroSelection && <AthroSelectionSection onClose={() => setShowAthroSelection(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {/* Quiz Modal */}
      <Dialog open={quizOpen} onClose={handleQuizClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {quizLoading ? 'Generating Quiz...' : `Quiz: ${quizSubject}`}
        </DialogTitle>
        <DialogContent>
          {quizLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : quizScore !== null ? (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quiz Complete!
              </Typography>
              <Typography>
                Your score: {quizScore} out of {quizQuestions.length}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 3 }}
                onClick={() => {
                  if (quizSubject) {
                    const athro = selectedAthros.find(a => a.subject === quizSubject);
                    if (athro) {
                      const confidenceLevel = Math.min(Math.max(quizScore ?? 0, 0), 10) as unknown as ConfidenceLevel;
                      workspaceService.broadcastConfidenceUpdate(athro.id, confidenceLevel);
                    }
                  }
                  handleQuizClose();
                }}
              >
                Continue
              </Button>
            </Box>
          ) : quizQuestions.length > 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Question {quizIdx + 1} of {quizQuestions.length}
              </Typography>
              <Typography sx={{ mb: 3 }}>
                {quizQuestions[quizIdx].question}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {quizQuestions[quizIdx].options.map((option, idx) => {
                  const isCorrect = idx === quizQuestions[quizIdx].answer;
                  const isSelected = idx === quizSelected;
                  let bg = 'transparent';
                  let borderColor = '#e4c97e';
                  let color = '#e4c97e';
                  let opacity = 1;

                  if (quizReveal) {
                    if (isCorrect) {
                      bg = '#4fc38a44';
                      borderColor = '#4fc38a';
                      color = isSelected ? '#4fc38a' : '#e4c97e';
                    } else if (isSelected) {
                      bg = '#e85a6a44';
                      borderColor = '#e85a6a';
                      color = '#e85a6a';
                    } else {
                      opacity = 0.4;
                    }
                  }

                  return (
                    <Button
                      key={idx}
                      variant={isSelected ? 'contained' : 'outlined'}
                      onClick={() => {
                        if (!quizReveal) handleQuizAnswer(idx);
                        else if (isSelected) handleQuizNext();
                      }}
                      disabled={quizReveal && !isSelected}
                      sx={{
                        borderColor,
                        color: `${color} !important`,
                        background: bg,
                        opacity,
                        fontWeight: isCorrect && quizReveal ? 700 : 600,
                        fontSize: '1rem',
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        borderWidth: 2,
                        mb: 1,
                        '&:hover': {
                          borderColor: '#e4c97e',
                          backgroundColor: '#e4c97e22'
                        }
                      }}
                    >
                      {option}
                      {quizReveal && isSelected && (
                        <span style={{ marginLeft: 12, fontWeight: 700, color: '#e4c97e', fontSize: '0.95em' }}>
                          Click to continue
                        </span>
                      )}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Typography sx={{ p: 2, textAlign: 'center' }}>
              Failed to generate quiz. Please try again.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
