import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  SelectChangeEvent,
  Grid,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { Athro } from '@athro/shared-types';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { format } from 'date-fns';
import AthroCard from './AthroCard';

import { useAuth } from '../../contexts/AuthContext';

interface SessionForm {
  id?: string;
  length: number;
  athroId: string;
  subject: string;
  start: Date;
  end: Date;
  title: string;
}

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: SessionForm) => void;
  onDelete?: (id: string) => void;
  session?: SessionForm;
  edit: boolean;
  athros: Athro[];
  subjectConf: Record<string, number>;
  priorities: Set<string>;
  onTogglePriority: (athroId: string) => void;
  onLaunchNow: (session: SessionForm) => void;
}

const SESSION_LENGTHS = [20, 40, 60, 80, 100, 120];

const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  session,
  edit,
  athros,
  subjectConf,
  priorities,
  onTogglePriority,
  onLaunchNow
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<SessionForm>({
    length: 20,
    athroId: '',
    subject: '',
    start: new Date(),
    end: new Date(),
    title: ''
  });

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (session) {
      setFormData(session);
    } else {
      setFormData({
        length: 20,
        athroId: '',
        subject: '',
        start: new Date(),
        end: new Date(),
        title: ''
      });
    }
  }, [session]);

  const handleChange = (field: string, value: string | number | Date) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If length changes, immediately update the end time
      if (field === 'length') {
        const newEnd = new Date(updated.start);
        newEnd.setMinutes(newEnd.getMinutes() + (value as number));
        updated.end = newEnd;
      }
      
      // If start time changes, also update end time based on current length
      if (field === 'start') {
        const newEnd = new Date(value as Date);
        newEnd.setMinutes(newEnd.getMinutes() + updated.length);
        updated.end = newEnd;
      }
      
      return updated;
    });
  };

  const handleSave = () => {
    if (!formData.athroId) {
      return;
    }

    const selectedAthro = athros.find(a => a.id === formData.athroId);
    if (!selectedAthro) return;

    // Calculate end time based on start time and length
    const end = new Date(formData.start);
    end.setMinutes(end.getMinutes() + formData.length);

    const updatedFormData = {
      ...formData,
      end,
      title: `${selectedAthro.subject} with ${selectedAthro.name}`,
      subject: selectedAthro.subject
    };

    onSave(updatedFormData);
  };

  const handleDelete = () => {
    if (onDelete && session?.id) {
      onDelete(session.id);
    }
  };

  const handleLaunchNow = () => {
    if (!formData.athroId) {
      return;
    }
    
    const selectedAthro = athros.find(a => a.id === formData.athroId);
    if (!selectedAthro) return;

    // Calculate end time based on start time and length
    const end = new Date(formData.start);
    end.setMinutes(end.getMinutes() + formData.length);

    const updatedFormData = {
      ...formData,
      end,
      title: `${selectedAthro.subject} with ${selectedAthro.name}`,
      subject: selectedAthro.subject
    };

    onLaunchNow(updatedFormData);
  };

  const priorityAthros = useMemo(() => {
    return athros.filter(athro => priorities.has(athro.id));
  }, [athros, priorities]);

  const myAthros = useMemo(() => {
    return athros.filter(athro => !athro.isSystem);
  }, [athros]);

  const hasPriorityAthros = priorityAthros.length > 0;
  const displayAthros = hasPriorityAthros && activeTab === 0 ? priorityAthros : myAthros;

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          height: '125%',
          maxHeight: '90vh',
          backgroundColor: '#1c2a1e',
          color: '#e4c97e',
          border: '1px solid rgba(228, 201, 126, 0.2)',
          '& .MuiDialogContent-root': {
            backgroundColor: '#1c2a1e',
          },
          '& .MuiDialogActions-root': {
            backgroundColor: '#1c2a1e',
            borderTop: '1px solid rgba(228, 201, 126, 0.2)',
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        '& .MuiTypography-root': {
          color: '#e4c97e'
        }
      }}>
        {edit ? 'Edit Session' : 'New Session'}
        {formData.athroId && (
          <Typography component="span" sx={{ color: '#4fc38a', fontWeight: 400, fontSize: '1rem', ml: 2 }}>
            • {athros.find(a => a.id === formData.athroId)?.name}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <Typography variant="body1" sx={{ color: '#b5cbb2', fontWeight: 400 }}>
            {format(formData.start, 'EEEE, MMMM d, yyyy')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#b5cbb2', fontWeight: 400, mb: 1 }}>
            {format(formData.start, 'h:mm a')} - {format(formData.end, 'h:mm a')} ({formData.length} min)
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Compact row with Session Length and Launch Button side by side */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {/* Session Length - Half width */}
            <Box sx={{ flex: 0.5 }}>
              <Typography variant="subtitle2" sx={{ color: '#e4c97e', mb: 1, fontSize: '0.9rem' }}>
                Session Length
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.length}
                  onChange={(e) => handleChange('length', e.target.value)}
                  sx={{
                    color: '#e4c97e',
                    height: '40px', // Reduced height
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(228, 201, 126, 0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(228, 201, 126, 0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e4c97e',
                    },
                    '& .MuiSelect-icon': {
                      color: '#e4c97e',
                    }
                  }}
                >
                  {SESSION_LENGTHS.map(length => (
                    <MenuItem 
                      key={length} 
                      value={length}
                      sx={{
                        color: '#e4c97e',
                        '&:hover': {
                          backgroundColor: 'rgba(228, 201, 126, 0.1)',
                        },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(228, 201, 126, 0.2)',
                          '&:hover': {
                            backgroundColor: 'rgba(228, 201, 126, 0.3)',
                          },
                        },
                      }}
                    >
                      {length} minutes
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Launch Button - Half width */}
            <Box sx={{ flex: 0.5 }}>
              <Button
                onClick={handleLaunchNow}
                variant="contained"
                fullWidth
                disabled={!formData.athroId}
                sx={{
                  backgroundColor: formData.athroId ? '#4fc38a' : 'rgba(228, 201, 126, 0.3)',
                  color: formData.athroId ? '#1c2a1e' : 'rgba(28, 42, 30, 0.5)',
                  fontSize: '0.85rem',
                  padding: '0.6rem 1rem',
                  height: '40px', // Match the select height
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: formData.athroId ? '#3da970' : 'rgba(228, 201, 126, 0.3)',
                    transform: formData.athroId ? 'translateY(-1px)' : 'none',
                    boxShadow: formData.athroId ? '0 4px 12px rgba(79, 195, 138, 0.3)' : 'none',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'rgba(228, 201, 126, 0.3)',
                    color: 'rgba(28, 42, 30, 0.5)',
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {formData.athroId 
                  ? `LAUNCH ${athros.find(a => a.id === formData.athroId)?.name || 'Session'} (${formData.length}min)`
                  : 'Select Athro to Launch'
                }
              </Button>
            </Box>
          </Box>

          {/* Athro Selection */}
          <Box sx={{ flex: 1, minHeight: '400px' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: '#e4c97e' }}>
              {hasPriorityAthros ? 'Select Athro' : 'Select Your Athro'}
            </Typography>
            {hasPriorityAthros && (
            <ToggleButtonGroup
              value={activeTab}
              exclusive
              onChange={(_, newValue) => setActiveTab(newValue)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: '#e4c97e',
                  borderColor: '#e4c97e',
                  '&.Mui-selected': {
                    backgroundColor: '#e4c97e',
                    color: '#1c2a1e',
                    '&:hover': {
                      backgroundColor: '#e4c97e',
                    }
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(228, 201, 126, 0.1)',
                  }
                }
              }}
            >
              <ToggleButton value={0}>Priority Athros</ToggleButton>
              <ToggleButton value={1}>My Athros</ToggleButton>
            </ToggleButtonGroup>
            )}
            {!user ? (
              <Box sx={{ textAlign: 'center', mt: 4, py: 4 }}>
                <Typography sx={{ color: '#b5cbb2', mb: 2, fontWeight: 700, fontSize: '1.2rem' }}>
                  This area is for signed-in users only
                </Typography>
                <Typography sx={{ color: '#b5cbb2', mb: 3, fontSize: '1rem' }}>
                  Sign in or create an account to schedule study sessions with your Athros
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      // Dispatch a custom event to open settings and set auth mode to signin
                      window.dispatchEvent(new CustomEvent('athro-open-signin'));
                    }
                    onClose();
                  }}
                  sx={{
                    backgroundColor: '#4fc38a',
                    color: '#1c2a1e',
                    fontWeight: 700,
                    '&:hover': {
                      backgroundColor: 'rgba(79, 195, 138, 0.8)',
                    },
                  }}
                >
                  Go to Settings to Sign In
                </Button>
              </Box>
            ) : displayAthros.length === 0 ? (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography sx={{ color: '#b5cbb2', mb: 2 }}>
                  No Athros found.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('athro-open-settings'));
                    }
                    onClose();
                  }}
                  sx={{
                    backgroundColor: '#e4c97e',
                    color: '#1c2a1e',
                    fontWeight: 700,
                    '&:hover': {
                      backgroundColor: 'rgba(228, 201, 126, 0.8)',
                    },
                  }}
                >
                  Go to Settings to select Athros
                </Button>
              </Box>
            ) : (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 2,
                width: '100%',
                mt: 1,
                mb: 2,
                minHeight: '400px',
                flex: 1
              }}>
                {displayAthros.map(athro => (
                  <AthroCard
                    key={athro.id}
                    athro={athro}
                    selected={formData.athroId === athro.id}
                    onClick={() => handleChange('athroId', athro.id)}
                    confidenceLevel={subjectConf[athro.id]}
                    isPriority={priorities.has(athro.id)}
                    onTogglePriority={() => onTogglePriority(athro.id)}
                    hideActions={true}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        {edit && (
          <Button
            onClick={handleDelete}
            color="error"
            variant="outlined"
            sx={{
              color: '#e4c97e',
              borderColor: '#e4c97e',
              '&:hover': {
                borderColor: '#e4c97e',
                backgroundColor: 'rgba(228, 201, 126, 0.1)',
              }
            }}
          >
            Delete
          </Button>
        )}
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#e4c97e',
            borderColor: '#e4c97e',
            '&:hover': {
              borderColor: '#e4c97e',
              backgroundColor: 'rgba(228, 201, 126, 0.1)',
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.athroId}
          sx={{
            backgroundColor: '#e4c97e',
            color: '#1c2a1e',
            '&:hover': {
              backgroundColor: 'rgba(228, 201, 126, 0.8)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(228, 201, 126, 0.3)',
              color: 'rgba(28, 42, 30, 0.5)',
            }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionModal; 