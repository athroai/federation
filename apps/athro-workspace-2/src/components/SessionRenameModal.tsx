import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogActions,
  Typography, 
  TextField, 
  Button, 
  Box,
  IconButton,
  Fade
} from '@mui/material';
import { Close as CloseIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';

interface SessionRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveWithName: (sessionName: string) => void;
  onDeleteFromHistory: () => void;
  athroName: string;
  defaultSessionName?: string;
  messageCount: number;
  resourceCount: number;
  flashcardCount: number;
  noteCount: number;
  mindMapCount: number;
}

const SessionRenameModal: React.FC<SessionRenameModalProps> = ({
  isOpen,
  onClose,
  onSaveWithName,
  onDeleteFromHistory,
  athroName,
  defaultSessionName,
  messageCount,
  resourceCount,
  flashcardCount,
  noteCount,
  mindMapCount
}) => {
  const [sessionName, setSessionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate default session name
  const fallbackSessionName = defaultSessionName || `${athroName} Session - ${new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  useEffect(() => {
    if (isOpen) {
      setSessionName(fallbackSessionName);
    }
  }, [isOpen, fallbackSessionName]);

  const handleSave = async () => {
    if (!sessionName.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSaveWithName(sessionName.trim());
      onClose();
      setSessionName('');
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    onDeleteFromHistory();
    onClose();
    setSessionName('');
  };

  const handleCancel = () => {
    onClose();
    setSessionName('');
  };

  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1c2a1e',
          borderRadius: '1rem',
          border: '2px solid rgba(228, 201, 126, 0.3)',
          overflow: 'hidden',
          position: 'relative'
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)'
        }
      }}
    >
      {/* Close Button */}
      <IconButton
        onClick={handleCancel}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: '#e4c97e',
          backgroundColor: 'rgba(228, 201, 126, 0.1)',
          border: '1px solid rgba(228, 201, 126, 0.3)',
          zIndex: 10,
          '&:hover': {
            backgroundColor: 'rgba(228, 201, 126, 0.2)',
            borderColor: '#e4c97e'
          },
          transition: 'all 0.2s ease'
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: 4, pt: 5 }}>
        <Fade in={isOpen} timeout={300}>
          <Box>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: '#e4c97e',
                  fontWeight: 700,
                  fontSize: '2rem',
                  fontFamily: "'Playfair Display', serif"
                }}
              >
                {athroName} Study Session
              </Typography>
            </Box>

            {/* Session Stats */}
            <Box sx={{ 
              backgroundColor: 'rgba(79, 195, 138, 0.1)',
              border: '1px solid rgba(79, 195, 138, 0.3)',
              borderRadius: '0.75rem',
              p: 2.5,
              mb: 3,
              textAlign: 'center'
            }}>
              <Typography 
                sx={{ 
                  color: '#4fc38a',
                  fontWeight: 600,
                  mb: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                📊 Session Summary
              </Typography>
              <Typography 
                sx={{ 
                  color: '#e4c97e',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                💬 {messageCount} messages shared
              </Typography>
            </Box>

            {/* Session Name Input */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                sx={{ 
                  color: '#e4c97e',
                  fontWeight: 600,
                  mb: 1,
                  fontSize: '1rem'
                }}
              >
                Study Session Name
              </Typography>
              <TextField
                fullWidth
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter a memorable name for this session..."
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    '& fieldset': {
                      borderColor: 'rgba(228, 201, 126, 0.3)',
                      borderWidth: '2px'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(228, 201, 126, 0.6)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#e4c97e'
                    }
                  },
                  '& .MuiInputBase-input': {
                    padding: '1rem'
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                    opacity: 1
                  }
                }}
              />
            </Box>
          </Box>
        </Fade>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        pt: 0,
        gap: 1.5,
        justifyContent: 'center'
      }}>
        {/* Delete Button */}
        <Button
          onClick={handleDelete}
          variant="outlined"
          startIcon={<DeleteIcon />}
          sx={{
            borderColor: '#e74c3c',
            color: '#e74c3c',
            fontWeight: 600,
            px: 2.5,
            py: 1,
            borderRadius: '0.75rem',
            fontSize: '0.95rem',
            border: '2px solid #e74c3c',
            '&:hover': {
              backgroundColor: '#e74c3c',
              color: '#ffffff',
              borderColor: '#e74c3c'
            },
            transition: 'all 0.2s ease'
          }}
        >
          Delete
        </Button>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isLoading || !sessionName.trim()}
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{
            backgroundColor: '#4fc38a',
            color: '#1c2a1e',
            fontWeight: 700,
            px: 3,
            py: 1,
            borderRadius: '0.75rem',
            fontSize: '0.95rem',
            border: '2px solid #4fc38a',
            '&:hover': {
              backgroundColor: '#3da970',
              borderColor: '#3da970'
            },
            '&:disabled': {
              backgroundColor: 'rgba(79, 195, 138, 0.3)',
              color: 'rgba(28, 42, 30, 0.5)',
              borderColor: 'rgba(79, 195, 138, 0.3)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? 'Saving...' : 'Save Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionRenameModal; 