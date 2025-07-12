import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent,
  Typography, 
  Button, 
  Box,
  IconButton,
  Fade,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon, Delete as DeleteIcon, History as HistoryIcon } from '@mui/icons-material';
import SupabaseStudyService from '../../services/SupabaseStudyService';
import { StudyHistorySummary } from '../../types/history';
import { formatDateTime } from '../../utils/dateUtils';

interface StudyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  athroId: string;
  onLoadStudy: (historyId: string) => void;
}

const StudyHistoryModal: React.FC<StudyHistoryModalProps> = React.memo(({
  isOpen,
  onClose,
  athroId,
  onLoadStudy
}) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<StudyHistorySummary[]>([]);

  // Debug logging removed to prevent console spam

  useEffect(() => {
    // Load history when modal is opened
    if (isOpen) {
      console.log('[StudyHistoryModal] Modal opened, loading history for athroId:', athroId);
      loadHistory();
    }
  }, [isOpen, athroId]);

  const loadHistory = async () => {
    console.log('[StudyHistoryModal] loadHistory called for athroId:', athroId);
    setLoading(true);
    try {
      const sessions = await SupabaseStudyService.getStudySessions(athroId);
      console.log('[StudyHistoryModal] Retrieved sessions:', sessions);
      
      // Map the session data to StudyHistorySummary format
      const studyHistory: StudyHistorySummary[] = sessions.map(session => ({
        id: session.id,
        title: session.title || 'Untitled Session',
        athroId: session.athro_id,
        createdAt: new Date(session.created_at).getTime(),
        updatedAt: new Date(session.updated_at || session.created_at).getTime(),
        messageCount: session.messages?.length || 0,
        resourceCount: session.resources?.length || 0,
        toolsCount: (session.flashcards?.length || 0) + 
                   (session.notes?.length || 0) + 
                   (session.mind_maps?.length || 0)
      }));
      
      // Sort by creation date, newest first
      studyHistory.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('[StudyHistoryModal] Mapped study history:', studyHistory);
      setHistory(studyHistory);
    } catch (error) {
      console.error('[StudyHistoryModal] Error loading study history:', error);
    }
    setLoading(false);
    console.log('[StudyHistoryModal] Loading complete, loading state:', false);
  };

  const handleLoadStudy = (historyId: string) => {
    onLoadStudy(historyId);
    onClose();
  };

  const handleDeleteStudy = async (historyId: string) => {
    try {
      await SupabaseStudyService.deleteStudyHistory(historyId);
      setHistory(prev => prev.filter(session => session.id !== historyId));
    } catch (error) {
      console.error('Error deleting study history:', error);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1c2a1e',
          borderRadius: '1rem',
          border: '2px solid rgba(228, 201, 126, 0.3)',
          overflow: 'hidden',
          position: 'relative',
          maxHeight: '85vh'
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
        onClick={onClose}
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
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: '#e4c97e',
                  fontWeight: 700,
                  fontSize: '2rem',
                  fontFamily: "'Playfair Display', serif",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1
                }}
              >
                <HistoryIcon sx={{ fontSize: '2rem' }} />
                Study History
              </Typography>
            </Box>

            {/* Content */}
            {loading ? (
              <Box sx={{ 
                textAlign: 'center', 
                py: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <CircularProgress 
                  sx={{ 
                    color: '#4fc38a',
                    mb: 2
                  }} 
                />
                <Typography sx={{ 
                  color: '#e4c97e',
                  fontSize: '1.1rem',
                  fontFamily: "'Raleway', sans-serif"
                }}>
                  Loading study history...
                </Typography>
              </Box>
            ) : history.length === 0 ? (
              <Box sx={{ 
                textAlign: 'center', 
                py: 6,
                backgroundColor: 'rgba(79, 195, 138, 0.1)',
                border: '1px solid rgba(79, 195, 138, 0.3)',
                borderRadius: '0.75rem',
                p: 4
              }}>
                <Typography sx={{ 
                  color: '#e4c97e',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  mb: 1
                }}>
                  📚 No Study Sessions Yet
                </Typography>
                <Typography sx={{ 
                  color: '#b5cbb2',
                  fontSize: '1rem',
                  fontFamily: "'Raleway', sans-serif"
                }}>
                  Start a conversation and save your first study session!
                </Typography>
              </Box>
                         ) : (
               <Box sx={{ 
                 maxHeight: '60vh', 
                 overflowY: 'visible',
                 paddingRight: '8px',
                 marginTop: '20px'
               }}>
                                 {history.map((session, index) => (
                   <Box 
                     key={session.id}
                     sx={{
                       mb: 3,
                       mx: 2, // Add horizontal margin for glow effect
                       backgroundColor: 'rgba(79, 195, 138, 0.1)',
                       border: '2px solid rgba(79, 195, 138, 0.3)',
                       borderRadius: '0.75rem',
                       p: 2,
                       cursor: 'pointer',
                       transition: 'all 0.2s ease',
                       position: 'relative',
                       '&:hover': {
                         borderColor: '#4fc38a',
                         backgroundColor: 'rgba(79, 195, 138, 0.15)',
                         transform: 'translateY(-2px)',
                         boxShadow: '0 8px 24px rgba(79, 195, 138, 0.3)'
                       }
                     }}
                     onClick={() => handleLoadStudy(session.id)}
                   >
                     {/* Session Title */}
                     <Typography 
                       sx={{ 
                         color: '#e4c97e',
                         fontSize: '1.1rem',
                         fontWeight: 600,
                         mb: 0.8,
                         pr: 4, // Leave space for delete button
                         wordBreak: 'break-word',
                         fontFamily: "'Inter', sans-serif"
                       }}
                     >
                       {session.title}
                     </Typography>

                     {/* Session Info */}
                     <Box sx={{ 
                       display: 'flex', 
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       flexWrap: 'wrap',
                       gap: 1
                     }}>
                       <Typography sx={{ 
                         color: '#b5cbb2',
                         fontSize: '0.85rem',
                         fontFamily: "'Raleway', sans-serif"
                       }}>
                         {formatDateTime(session.createdAt)}
                       </Typography>
                       
                       <Box sx={{ 
                         display: 'flex', 
                         alignItems: 'center', 
                         gap: 0.5,
                         color: '#4fc38a',
                         fontSize: '0.85rem',
                         fontWeight: 600
                       }}>
                         💬 {session.messageCount}
                       </Box>
                     </Box>

                     {/* Delete Button */}
                     <IconButton
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         handleDeleteStudy(session.id); 
                       }}
                       sx={{
                         position: 'absolute',
                         top: 8,
                         right: 8,
                         color: '#e74c3c',
                         backgroundColor: 'rgba(231, 76, 60, 0.1)',
                         border: '1px solid rgba(231, 76, 60, 0.3)',
                         width: '32px',
                         height: '32px',
                         '&:hover': {
                           backgroundColor: '#e74c3c',
                           color: '#ffffff',
                           borderColor: '#e74c3c',
                           transform: 'scale(1.1)'
                         },
                         transition: 'all 0.2s ease'
                       }}
                     >
                       <DeleteIcon fontSize="small" />
                     </IconButton>
                   </Box>
                 ))}
              </Box>
            )}
          </Box>
        </Fade>
      </DialogContent>
    </Dialog>
  );
});

export default StudyHistoryModal;
