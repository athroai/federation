import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { Schedule, EmojiEvents, Psychology } from '@mui/icons-material';

interface StudyMetric {
  label: string;
  value: string;
  icon: 'streak' | 'time' | 'mastery';
  progress?: number;
}

interface StudyMetricsProps {
  metrics: StudyMetric[];
}

export const StudyMetrics = ({ metrics }: StudyMetricsProps) => {
  const getIcon = (type: StudyMetric['icon']) => {
    switch (type) {
      case 'streak':
        return <EmojiEvents />;
      case 'time':
        return <Schedule />;
      case 'mastery':
        return <Psychology />;
      default:
        return <EmojiEvents />;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        backgroundColor: 'rgba(22, 34, 28, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: 'primary.main',
        backgroundImage: 'url(/athros/athro-metrics.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(22, 34, 28, 0.85)',
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="h6" color="primary.main" gutterBottom>
          Study Metrics
        </Typography>

        <Box sx={{ mt: 2 }}>
          {metrics.map((metric) => (
            <Box
              key={metric.label}
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ color: 'primary.main', mr: 1 }}>
                  {getIcon(metric.icon)}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metric.label}
                </Typography>
              </Box>
              
              <Typography variant="h5" color="primary.light">
                {metric.value}
              </Typography>

              {metric.progress !== undefined && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={metric.progress}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'primary.main',
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
