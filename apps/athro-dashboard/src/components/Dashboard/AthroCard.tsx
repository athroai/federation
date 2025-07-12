import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Athro } from '@athro/shared-types';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import QuizIcon from '@mui/icons-material/Quiz';

interface AthroCardProps {
  athro: Athro;
  selected: boolean;
  onClick: () => void;
  confidenceLevel?: number;
  isPriority: boolean;
  onTogglePriority: () => void;
  onQuizClick?: () => void;
  hideActions?: boolean;
}

const AthroCard: React.FC<AthroCardProps> = ({ 
  athro, 
  selected, 
  onClick, 
  confidenceLevel,
  isPriority,
  onTogglePriority,
  onQuizClick,
  hideActions = false
}) => {
  const getConfidenceColor = (level?: number) => {
    if (!level) return '#b5cbb2';
    if (level >= 8) return '#4fc38a';
    if (level >= 5) return '#e4c97e';
    return '#e85a6a';
  };
  const getConfidenceLabel = (level?: number) => {
    if (!level) return 'Not Started';
    if (level >= 8) return 'High';
    if (level >= 5) return 'Medium';
    return 'Low';
  };
  const getImagePath = (subject: string): string => {
    const mapping: Record<string, string> = {
      'English Language & Literature': 'english',
      'Mathematics & Statistics': 'maths',
      'Biology, Chemistry, Physics': 'science',
      'Geography': 'geography',
      'History & Ancient History': 'history',
      'Religious Studies': 'rs',
      'Languages': 'languages',
      'Design, Engineering & Technology': 'designtech',
      'Drama & Dance': 'drama',
      'Computer Science & ICT': 'it',
      'Business & Economics': 'business',
      'Food & Nutrition': 'cookery',
      'Media & Film Studies': 'media',
      'Psychology, Sociology & Citizenship': 'social',
      'Welsh Language & Literature': 'welsh',
      'Nature & Agriculture': 'nature'
    };
    const imageName = mapping[subject] || 'study';
    return `/athros/athro-${imageName}.jpg`;
  };
  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePriority();
  };
  const handleQuizClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuizClick) onQuizClick();
  };
  return (
    <Box
      onClick={onClick}
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
        border: selected ? '2px solid #e4c97e' : '2px solid transparent',
        transition: 'box-shadow 0.2s, border 0.2s',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
        '&:focus': {
          outline: 'none',
        },
        '&:focus-visible': {
          outline: 'none',
        },
        '&:hover': {
          boxShadow: '0 4px 20px #0008',
          border: '2px solid #e4c97e',
        }
      }}
    >
      {!hideActions && (
        <Box sx={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 2, display: 'flex', gap: 1 }}>
          <Tooltip title={isPriority ? "Remove from priorities" : "Add to priorities"}>
            <IconButton
              onClick={handlePriorityClick}
              sx={{
                color: isPriority ? '#e4c97e' : '#b5cbb2',
                '&:hover': {
                  color: '#e4c97e',
                  backgroundColor: 'rgba(228, 201, 126, 0.1)'
                }
              }}
            >
              {isPriority ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Take a quiz">
            <IconButton
              onClick={handleQuizClick}
              sx={{
                color: '#e4c97e',
                '&:hover': {
                  color: '#e4c97e',
                  backgroundColor: 'rgba(228, 201, 126, 0.1)'
                }
              }}
            >
              <QuizIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <Box
        component="img"
        src={getImagePath(athro.subject)}
        alt={athro.name}
        sx={{
          width: '100%',
          height: '180px',
          borderRadius: '0.8rem',
          objectFit: 'cover'
        }}
      />
      <Typography variant="h6" sx={{ 
        color: selected ? '#e4c97e' : '#e4c97e', 
        fontWeight: 600,
        transition: 'color 0.2s ease-in-out',
        width: '100%',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '1rem',
        mt: 1
      }}>
        {athro.name}
      </Typography>
      <Typography sx={{ 
        color: selected ? '#e4c97e' : '#b5cbb2',
        transition: 'color 0.2s ease-in-out',
        width: '100%',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '0.9rem'
      }}>
        {athro.subject}
      </Typography>
      <Box sx={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        background: getConfidenceColor(confidenceLevel),
        color: confidenceLevel && confidenceLevel < 4 ? '#fff' : '#1c2a1e',
        padding: '0.2rem 0.5rem',
        borderRadius: '0.5rem',
        fontSize: '0.7rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}>
        <Box sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor'
        }} />
        {confidenceLevel ? `${getConfidenceLabel(confidenceLevel)} (${confidenceLevel}/10)` : 'Not Started'}
      </Box>
    </Box>
  );
};

export default AthroCard; 