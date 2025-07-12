import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import { CalendarToday, AccessTime } from '@mui/icons-material';
import { format, isToday, isTomorrow } from 'date-fns';

interface NextSessionProps {
  session: {
    title: string;
    startTime: Date;
    endTime: Date;
    athroName: string;
    subject: string;
  };
}

export const NextSessionCard = ({ session }: NextSessionProps) => {
  const getDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  return (
    <Card
      sx={{
        height: '100%',
        backgroundColor: 'rgba(22, 34, 28, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: 'primary.main',
      }}
    >
      <CardContent>
        <Typography variant="h6" color="primary.main" gutterBottom>
          Next Study Session
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday color="primary" />
          <Typography>
            {getDateDisplay(session.startTime)}
          </Typography>
        </Box>
        
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime color="primary" />
          <Typography>
            {format(session.startTime, 'h:mm a')} - {format(session.endTime, 'h:mm a')}
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" color="primary.light">
            {session.title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            with {session.athroName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {session.subject}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          fullWidth
          sx={{ mt: 3 }}
        >
          Join Session
        </Button>
      </CardContent>
    </Card>
  );
};
