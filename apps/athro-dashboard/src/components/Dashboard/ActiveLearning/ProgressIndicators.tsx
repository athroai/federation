import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';

interface SubjectProgress {
  subject: string;
  progress: number;
  color: string;
}

interface ProgressIndicatorsProps {
  subjects: SubjectProgress[];
}

export const ProgressIndicators = ({ subjects }: ProgressIndicatorsProps) => {
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
          Subject Progress
        </Typography>

        <Box sx={{ mt: 2 }}>
          {subjects.map((subject) => (
            <Box key={subject.subject} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  {subject.subject}
                </Typography>
                <Typography variant="body2" color="primary.light">
                  {subject.progress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={subject.progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: subject.color,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
