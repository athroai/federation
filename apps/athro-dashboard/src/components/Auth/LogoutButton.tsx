import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';

const StyledLogoutButton = styled(Button)(({ theme }) => ({
  position: 'absolute',
  top: '20px',
  right: '20px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '0.875rem',
  fontWeight: 500,
  textTransform: 'none',
  minWidth: 'auto',
  zIndex: 1000,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  '&:active': {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  '& .MuiButton-startIcon': {
    marginRight: '6px',
  },
}));

interface LogoutButtonProps {
  showText?: boolean;
  variant?: 'icon' | 'text' | 'both';
  position?: 'absolute' | 'relative';
  size?: 'small' | 'medium' | 'large';
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  showText = true, 
  variant = 'both',
  position = 'absolute',
  size = 'medium'
}) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out user...');
      
      // Sign out from Supabase
      await signOut();
      
      // Clear user-related data
      localStorage.removeItem('athro-federated-auth');
      localStorage.removeItem('user_preferences');
      localStorage.removeItem('demo_mode_enabled');
      
      // Dispatch cleanup event
      window.dispatchEvent(new CustomEvent('athro-user-cleared', {
        detail: { timestamp: Date.now() }
      }));
      
      console.log('✅ Logout successful');
      
      // Navigate to home page
      navigate('/');
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      
      // Fallback: clear critical data and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    }
  };

  // Don't show logout button if no user is authenticated
  if (!user) {
    return null;
  }

  const ButtonComponent = position === 'absolute' ? StyledLogoutButton : Button;

  const buttonProps = position === 'relative' ? {
    variant: 'outlined' as const,
    color: 'inherit' as const,
    size: size,
    sx: {
      color: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      padding: '10px 20px',
      borderRadius: '25px',
      fontSize: '0.9rem',
      '&:hover': {
        borderColor: '#e4c97e',
        backgroundColor: 'rgba(228, 201, 126, 0.1)',
        color: '#e4c97e',
        transform: 'translateY(-2px)',
        boxShadow: '0 5px 15px rgba(228, 201, 126, 0.2)'
      },
      transition: 'all 0.3s ease'
    }
  } : {};

  return (
    <ButtonComponent
      onClick={handleLogout}
      startIcon={variant !== 'text' ? <LogoutIcon /> : undefined}
      {...buttonProps}
    >
      {variant !== 'icon' && (showText ? 'Logout' : '')}
    </ButtonComponent>
  );
};

export default LogoutButton; 