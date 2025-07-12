import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Athro, ConfidenceLevel } from '@athro/shared-types';
import { ATHROS } from '@athro/shared-athros';
import { generateQuiz } from '../../utils/AthroSection/quiz';
import { QuizQuestion } from '../../types/athro';
import { athroSelectionService } from '@athro/shared-services';

interface AthroSelectionSectionProps {
  onClose?: () => void;
  onSelectionChange?: (selectedIds: string[]) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const CONFIDENCE_OPTIONS: ConfidenceLevel[] = ['HIGH', 'MEDIUM', 'LOW'];

const DASHBOARD_APP_ID = 'athro-dashboard';

export const AthroSelectionSection: React.FC<AthroSelectionSectionProps> = ({ onClose, onSelectionChange }) => {
  const [selectedAthros, setSelectedAthros] = useState<Athro[]>([]);

  useEffect(() => {
    // Load initial selections
    const selections = athroSelectionService.getSelections(DASHBOARD_APP_ID);
    const selectedIds = selections.filter(s => s.selected).map(s => s.athroId);
    setSelectedAthros(ATHROS.filter(a => selectedIds.includes(a.id)));
    if (onSelectionChange) onSelectionChange(selectedIds);

    // Subscribe to selection updates
    const unsubSelection = () => {
      const handler = () => {
        const sel = athroSelectionService.getSelections(DASHBOARD_APP_ID);
        const newSelectedIds = sel.filter(s => s.selected).map(s => s.athroId);
        setSelectedAthros(ATHROS.filter(a => newSelectedIds.includes(a.id)));
        if (onSelectionChange) onSelectionChange(newSelectedIds);
      };
      window.addEventListener('focus', handler);
      return () => window.removeEventListener('focus', handler);
    };
    const cleanup = unsubSelection();

    return cleanup;
  }, [onSelectionChange]);

  const handleAthroSelect = (athro: Athro) => {
    const isSelected = selectedAthros.find(a => a.id === athro.id);
    let newSelectedAthros;
    if (isSelected) {
      newSelectedAthros = selectedAthros.filter(a => a.id !== athro.id);
      athroSelectionService.toggleSelection(DASHBOARD_APP_ID, athro.id);
    } else {
      newSelectedAthros = [...selectedAthros, athro];
      athroSelectionService.toggleSelection(DASHBOARD_APP_ID, athro.id);
    }
    setSelectedAthros(newSelectedAthros);
    if (onSelectionChange) onSelectionChange(newSelectedAthros.map(a => a.id));
    
    // 🚀 CRITICAL FIX: Fire event to notify insights component of selection changes
    console.log('🔥 [AthroSelectionSection] Firing athro-selection-changed event for:', athro.id);
    window.dispatchEvent(new CustomEvent('athro-selection-changed', {
      detail: { athroId: athro.id, selected: !isSelected }
    }));
  };

  const handleComplete = () => {
    if (onClose) onClose();
  };

  return (
    <Paper sx={{ mt: 4, p: 3, background: 'rgba(22,34,28,0.95)' }}>
      <Typography variant="h5" color="primary.main" sx={{ mb: 3 }}>
        Please select all subjects that you are studying
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 240px)',
          gap: 3,
          justifyContent: 'center',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          boxSizing: 'border-box',
          minWidth: 0,
          background: 'transparent',
        }}
      >
        {ATHROS.map((athro) => {
          const isSelected = selectedAthros.find(a => a.id === athro.id);
          return (
            <Card
              key={athro.id}
              sx={{
                width: '240px',
                height: '340px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: isSelected ? '3px solid #e4c97e' : '2px solid #b5cbb2',
                boxSizing: 'border-box',
                margin: '0 auto',
                transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                userSelect: 'none',
                background: isSelected ? 'rgba(228, 201, 126, 0.15)' : 'rgba(22,34,28,0.95)',
                color: '#fff',
                position: 'relative',
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.3s ease-in-out',
                },
              }}
              onClick={() => handleAthroSelect(athro)}
            >
              <CardMedia
                component="img"
                height="140"
                image={athro.image}
                alt={athro.name}
                sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '1rem', marginBottom: 2, background: '#eee', flexShrink: 0 }}
              />
              <CardContent sx={{ width: '100%', textAlign: 'center', p: 1 }}>
                <Typography variant="h6" color="#e4c97e" noWrap>
                  {athro.name}
                </Typography>
                <Typography variant="subtitle1" color="#b5cbb2" noWrap>
                  {athro.subject}
                </Typography>
                <Typography variant="body2" color="#b5cbb2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: 40 }}>
                  {athro.description}
                </Typography>
                {isSelected && (
                  <Box sx={{ position: 'absolute', top: 10, right: 10, background: '#e4c97e', color: '#1c2a1e', borderRadius: '50%', padding: '0.3rem 0.5rem', fontWeight: 'bold', zIndex: 2 }}>
                    ✓
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          sx={{ px: 4, py: 1.5, fontWeight: 700, fontSize: '1.1rem', borderRadius: '1rem' }}
          onClick={handleComplete}
          disabled={selectedAthros.length === 0}
        >
          Complete Subject Selection
        </Button>
      </Box>
    </Paper>
  );
}; 