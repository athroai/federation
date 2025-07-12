import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { differenceInSeconds } from 'date-fns';

interface CountdownTimerProps {
  nextSessionTime: Date;
}

export const CountdownTimer = ({ nextSessionTime }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const totalSeconds = differenceInSeconds(nextSessionTime, new Date());
      if (totalSeconds <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return { days, hours, minutes, seconds };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [nextSessionTime]);

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 0.5,
        minWidth: 48,
        backgroundColor: 'rgba(228, 201, 126, 0.1)',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'rgba(228, 201, 126, 0.2)',
      }}
    >
      <Typography variant="h6" sx={{ color: '#e4c97e', fontWeight: 600 }}>
        {value.toString().padStart(2, '0')}
      </Typography>
      <Typography variant="caption" sx={{ color: '#b5cbb2', fontSize: '0.65rem' }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Card
      sx={{
        height: 'auto',
        backgroundColor: '#1c2a1e',
        border: '1px solid',
        borderColor: 'rgba(228, 201, 126, 0.2)',
      }}
    >
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: '#e4c97e', 
            mb: 1,
            fontSize: '0.7rem',
            fontWeight: 500,
            textAlign: 'center'
          }}
        >
          Time Until This Session
        </Typography>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 0.5,
          }}
        >
          <TimeUnit value={timeLeft.days} label="days" />
          <TimeUnit value={timeLeft.hours} label="hours" />
          <TimeUnit value={timeLeft.minutes} label="min" />
          <TimeUnit value={timeLeft.seconds} label="sec" />
        </Box>
      </CardContent>
    </Card>
  );
};
