import { Card, CardContent, Typography, Box, IconButton, Tooltip } from '@mui/material';
import {
  NoteAdd,
  Upload,
  FlashOn,
  Mic,
  Screenshot,
} from '@mui/icons-material';

interface Tool {
  id: string;
  label: string;
  icon: 'note' | 'upload' | 'flashcard' | 'voice' | 'screenshot';
  action: () => void;
}

interface QuickToolsProps {
  tools: Tool[];
}

export const QuickTools = ({ tools }: QuickToolsProps) => {
  const getIcon = (type: Tool['icon']) => {
    switch (type) {
      case 'note':
        return <NoteAdd />;
      case 'upload':
        return <Upload />;
      case 'flashcard':
        return <FlashOn />;
      case 'voice':
        return <Mic />;
      case 'screenshot':
        return <Screenshot />;
      default:
        return <NoteAdd />;
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
          Quick Tools
        </Typography>

        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: 2,
          }}
        >
          {tools.map((tool) => (
            <Tooltip key={tool.id} title={tool.label}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <IconButton
                  onClick={tool.action}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'primary.main',
                    p: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {getIcon(tool.icon)}
                </IconButton>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                  }}
                >
                  {tool.label}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
