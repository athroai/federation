import { Card, CardContent, Typography, Box } from '@mui/material';

interface FeatureCardProps {
  title: string;
  description: string;
  imagePath: string;
}

export const FeatureCard = ({ title, description, imagePath }: FeatureCardProps) => {
  return (
    <Card
      sx={{
        height: '300px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        '&:hover': {
          transform: 'scale(1.02)',
          transition: 'transform 0.3s ease-in-out',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${imagePath})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(22, 34, 28, 0.7)',
          },
        }}
      />
      <CardContent
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: 3,
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            mb: 1,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'white',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};
