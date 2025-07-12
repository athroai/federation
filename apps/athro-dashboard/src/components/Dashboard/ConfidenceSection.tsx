import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, CircularProgress } from '@mui/material';
import { ATHROS } from '@athro/shared-athros';
import { athroSelectionService } from '@athro/shared-services';
import { generateQuiz } from '../../utils/AthroSection/quiz';
import { getCurriculumInfoWithFallback } from '../../utils/curriculumMapping';
import type { QuizQuestion } from '../../types/athro';
import { ConfidenceLevel } from '@athro/shared-types';
import { userPreferencesService } from '../../services/userPreferencesService';
import { useAuth } from '../../contexts/AuthContext';

const CONFIDENCE_LEVELS = [
  { key: 'HIGH', label: 'High', desc: 'I feel confident in this subject.', color: '#4fc38a' },
  { key: 'MEDIUM', label: 'Medium', desc: 'I feel okay, but could use more practice.', color: '#e4c97e' },
  { key: 'LOW', label: 'Low', desc: 'I find this subject challenging.', color: '#e85a6a' }
] as const;

const getConfidenceMeta = (level: ConfidenceLevel) => {
  const meta = CONFIDENCE_LEVELS.find(c => c.key === level);
  return meta || { label: 'Not set', color: '#b5cbb2' };
};

const DASHBOARD_APP_ID = 'athro-dashboard';

export const ConfidenceSection: React.FC = () => {
  const { user } = useAuth();
  const [confidenceLevels, setConfidenceLevels] = useState<Record<string, ConfidenceLevel>>({});
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

  useEffect(() => {
    if (!user) return;

    // Set user in preferences service
    userPreferencesService.setUser(user);

    // Load confidence levels from Supabase
    const loadConfidenceLevels = async () => {
      try {
        const athroConfidence = await userPreferencesService.getAthroConfidence();
        // Convert numeric confidence to ConfidenceLevel
        const convertedConfidence: Record<string, ConfidenceLevel> = {};
        Object.entries(athroConfidence).forEach(([athroId, level]) => {
          if (typeof level === 'number') {
            convertedConfidence[athroId] = level >= 8 ? 'HIGH' : level >= 5 ? 'MEDIUM' : 'LOW';
          }
        });
        setConfidenceLevels(convertedConfidence);
      } catch (error) {
        console.error('Failed to load confidence levels:', error);
      }
    };

    loadConfidenceLevels();

    // Load selected subjects
    const selections = athroSelectionService.getSelections(DASHBOARD_APP_ID);
    setSelectedIds(selections.filter(s => s.selected).map(s => s.athroId));

    // Subscribe to selection updates
    const unsubSelection = () => {
      const handler = () => {
        const sel = athroSelectionService.getSelections(DASHBOARD_APP_ID);
        setSelectedIds(sel.filter(s => s.selected).map(s => s.athroId));
      };
      window.addEventListener('focus', handler);
      return () => window.removeEventListener('focus', handler);
    };
    const cleanup = unsubSelection();

    return () => {
      cleanup();
    };
  }, [user]);

  const handleConfidenceChange = async (athroId: string, level: ConfidenceLevel) => {
    if (!user) return;

    try {
      // Convert ConfidenceLevel to numeric value
      const numericLevel = level === 'HIGH' ? 8 : level === 'MEDIUM' ? 5 : 2;
      
      // Update local state
      setConfidenceLevels(prev => ({
        ...prev,
        [athroId]: level
      }));

      // Get current confidence levels and update
      const currentConfidence = await userPreferencesService.getAthroConfidence();
      const updatedConfidence = {
        ...currentConfidence,
        [athroId]: numericLevel
      };

      // Save to Supabase
      await userPreferencesService.setAthroConfidence(updatedConfidence);
    } catch (error) {
      console.error('Failed to update confidence level:', error);
    }
  };

  const handleQuizClick = async (athro: typeof ATHROS[number]) => {
    setQuizOpen(true);
    setQuizLoading(true);
    setQuizSubject(athro.subject);
    setQuizIdx(0);
    setQuizAnswers([]);
    setQuizScore(null);
    try {
      const curriculumInfo = getCurriculumInfoWithFallback(athro.subject);
      const questions = await generateQuiz(athro.subject, 10, curriculumInfo);
      setQuizQuestions(questions);
    } catch (e) {
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizAnswer = (idx: number) => {
    if (quizReveal) return; // Prevent double answer
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
          const confidenceLevel = (score >= 8 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW') as ConfidenceLevel;
          handleConfidenceChange(athro.id, confidenceLevel);
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

  // Only show selected subjects
  const selectedAthros = ATHROS.filter(a => selectedIds.includes(a.id));

  if (selectedAthros.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="primary.main" sx={{ mb: 2 }}>
          No subjects selected
        </Typography>
        <Typography color="text.secondary">
          Please select your subjects in Settings to set confidence levels
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" color="primary.main" sx={{ mb: 3, textAlign: 'center' }}>
        Set your confidence for each subject
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 3 
      }}>
        {selectedAthros.map((athro) => (
          <Box
            key={athro.id}
            sx={{
              background: 'rgba(36,54,38,0.78)',
              borderRadius: '1.2rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <img
              src={athro.image}
              alt={athro.name}
              style={{
                width: '100%',
                maxWidth: 180,
                height: 'auto',
                borderRadius: '0.8rem',
                boxShadow: '0 2px 12px #0004'
              }}
            />
            <Typography
              sx={{
                color: '#e4c97e',
                fontSize: '1.4rem',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              {athro.name}
            </Typography>
            <Typography
              sx={{
                color: '#b5cbb2',
                fontSize: '1.1rem',
                textAlign: 'center'
              }}
            >
              {athro.subject}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {CONFIDENCE_LEVELS.map(level => (
                <Button
                  key={level.key}
                  variant={confidenceLevels[athro.id] === level.key ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleConfidenceChange(athro.id, level.key as ConfidenceLevel)}
                  sx={{
                    backgroundColor: confidenceLevels[athro.id] === level.key ? level.color : 'transparent',
                    borderColor: level.color,
                    color: confidenceLevels[athro.id] === level.key ? '#1c2a1e' : level.color,
                    '&:hover': {
                      backgroundColor: level.color,
                      color: '#1c2a1e'
                    }
                  }}
                >
                  {level.label}
                </Button>
              ))}
            </Box>
            <Typography sx={{ color: getConfidenceMeta(confidenceLevels[athro.id] || 'LOW').color, fontWeight: 600, fontSize: '1.1rem', mt: 1 }}>
              {confidenceLevels[athro.id] ? getConfidenceMeta(confidenceLevels[athro.id]).label : 'Not set'}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => handleQuizClick(athro)}
              sx={{
                borderColor: '#e4c97e',
                color: '#e4c97e',
                '&:hover': {
                  borderColor: '#e4c97e',
                  backgroundColor: '#e4c97e22'
                }
              }}
            >
              Take Quiz
            </Button>
          </Box>
        ))}
      </Box>

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
                        '&:hover': {
                          borderColor: '#e4c97e',
                          backgroundColor: '#e4c97e22'
                        }
                      }}
                    >
                      {option}
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