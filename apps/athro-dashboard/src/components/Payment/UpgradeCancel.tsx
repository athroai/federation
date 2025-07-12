import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  styled
} from '@mui/material';
import {
  ArrowBack,
  Home,
  CreditCard
} from '@mui/icons-material';

const StyledContainer = styled('div')({
  minHeight: '100vh',
  color: '#ffffff',
  backgroundColor: '#0c0c0c',
  backgroundImage: 'url("/world/back3.jpg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  margin: 0,
  padding: 0,
  fontFamily: 'var(--body-font)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
});

const Overlay = styled('div')({
  background: 'rgba(17, 25, 21, 0.95)',
  padding: '40px 0',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
});

const StyledCard = styled(Card)({
  background: 'rgba(17, 25, 21, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(228, 201, 126, 0.2)',
  borderRadius: '16px',
  maxWidth: 600,
  width: '100%',
  margin: '0 20px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
});

const StyledTitle = styled(Typography)({
  color: '#e4c97e',
  fontSize: '2.5rem',
  fontFamily: "'Playfair Display', serif",
  fontWeight: 800,
  textAlign: 'center',
  marginBottom: '1rem',
  textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
  background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundSize: '200% 200%',
  animation: 'gradient 3s ease infinite',
  letterSpacing: '-1px',
  '@keyframes gradient': {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' }
  }
});

const ActionButton = styled(Button)({
  background: '#e4c97e',
  color: '#000',
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: "'Playfair Display', serif",
  padding: '0.875rem 2rem',
  borderRadius: '12px',
  textTransform: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 0 20px rgba(228, 201, 126, 0.3)',
  '&:hover': {
    background: '#4fc38a',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 30px rgba(79, 195, 138, 0.4)',
  },
  '&.secondary': {
    background: 'transparent',
    border: '1px solid rgba(228, 201, 126, 0.5)',
    color: '#e4c97e',
    boxShadow: 'none',
    '&:hover': {
      background: 'rgba(228, 201, 126, 0.1)',
      borderColor: '#e4c97e',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(228, 201, 126, 0.2)',
    },
  }
});

const UpgradeCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate('/', { replace: true }); // Go back to pricing plans
  };

  const handleContinueFree = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <StyledContainer>
      <Overlay>
        <StyledCard>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <ArrowBack sx={{ fontSize: 60, color: '#e4c97e', mb: 2 }} />
            
            <StyledTitle variant="h4">
              Payment Cancelled
            </StyledTitle>
            
            <Typography variant="body1" sx={{ color: '#fff', mb: 3 }}>
              No worries! Your payment was cancelled and you haven't been charged anything.
            </Typography>

            <Box sx={{ 
              backgroundColor: 'rgba(228, 201, 126, 0.1)', 
              border: '1px solid rgba(228, 201, 126, 0.3)',
              borderRadius: '12px',
              p: 3,
              mb: 3
            }}>
              <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
                What would you like to do?
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff' }}>
                You can still explore AthroAi with our free tier, or choose a plan when you're ready.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
              <ActionButton 
                onClick={handleTryAgain}
                startIcon={<CreditCard />}
              >
                View Plans Again
              </ActionButton>
              
              <ActionButton 
                onClick={handleContinueFree}
                className="secondary"
                startIcon={<Home />}
              >
                Continue with Free Plan
              </ActionButton>
            </Box>

            <Typography variant="body2" sx={{ color: '#e4c97e', mt: 3 }}>
              Questions? We're here to help! Contact us anytime.
            </Typography>
          </CardContent>
        </StyledCard>
      </Overlay>
    </StyledContainer>
  );
};

export default UpgradeCancel; 