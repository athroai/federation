import React from 'react';
import { Box, Typography } from '@mui/material';

interface CalendarEventData {
  title: string;
  athro?: string;
  length: number;
  subject: string;
  confidenceLevel?: number;
  isPriority?: boolean;
}

interface CalendarEventProps {
  event: CalendarEventData;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({ event }) => {
  const getConfidenceColor = (level?: number) => {
    if (!level) return '#b5cbb2';
    if (level >= 8) return '#4fc38a';  // Green (HIGH)
    if (level >= 5) return '#e4c97e';  // Yellow (MEDIUM)
    return '#e85a6a';                  // Red (LOW)
  };

  return (
    <Box sx={{ 
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 0.5,
      padding: '4px'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '100%', 
        alignItems: 'center' 
      }}>
        <Typography sx={{ 
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#e4c97e'
        }}>
          {event.subject}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {event.isPriority && (
            <Typography sx={{ 
              fontSize: '0.75rem',
              color: '#4fc38a',
              backgroundColor: 'rgba(79, 195, 138, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              Priority
            </Typography>
          )}
          <Typography sx={{ 
            fontSize: '0.75rem',
            fontWeight: 600,
            color: getConfidenceColor(event.confidenceLevel),
            backgroundColor: 'rgba(28, 42, 30, 0.6)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {event.length}min
          </Typography>
        </Box>
      </Box>
      {event.athro && (
        <Typography sx={{ 
          fontSize: '0.85rem',
          color: '#b5cbb2',
        }}>
          {event.athro}
        </Typography>
      )}
    </Box>
  );
};

export default CalendarEvent; 