import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { NoteAlt, Quiz, Psychology, ChevronRight } from '@mui/icons-material';
import { format } from 'date-fns';

interface Resource {
  id: string;
  type: 'note' | 'flashcard' | 'quiz' | 'mindmap';
  title: string;
  lastModified: Date;
}

interface RecentResourcesProps {
  resources: Resource[];
}

export const RecentResources = ({ resources }: RecentResourcesProps) => {
  const getIcon = (type: Resource['type']) => {
    switch (type) {
      case 'note':
        return <NoteAlt />;
      case 'quiz':
        return <Quiz />;
      case 'mindmap':
        return <Psychology />;
      default:
        return <NoteAlt />;
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
      }}
    >
      <CardContent>
        <Typography variant="h6" color="primary.main" gutterBottom>
          Recent Resources
        </Typography>

        <Box sx={{ mt: 2 }}>
          {resources.map((resource) => (
            <Box
              key={resource.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                mb: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <Box
                sx={{
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  mr: 2,
                }}
              >
                {getIcon(resource.type)}
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  {resource.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {format(resource.lastModified, 'MMM d, h:mm a')}
                </Typography>
              </Box>

              <IconButton
                size="small"
                sx={{ color: 'primary.main' }}
              >
                <ChevronRight />
              </IconButton>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
