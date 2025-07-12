import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
  Zoom,
  Slide,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { Close as CloseIcon, Login as LoginIcon, PersonAdd as RegisterIcon, Star as StarIcon } from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  onExplore: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose, onLogin, onExplore }) => {
  const { signIn } = useAuth();
  const [currentBackground, setCurrentBackground] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number; opacity: number }>>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerSchool, setRegisterSchool] = useState('');
  const [registerYear, setRegisterYear] = useState('');
  const [registerPreferredName, setRegisterPreferredName] = useState('');

  const backgrounds = [
    '/world/background.jpg',
    '/world/back2.jpg',
    '/world/back3.jpg',
    '/world/chat.jpg',
    '/world/clock.jpg'
  ];

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random() * 0.6 + 0.2
    }));
    setParticles(newParticles);
  }, []);

  // Animate particles
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: particle.y - particle.speed,
        opacity: particle.opacity + (Math.random() - 0.5) * 0.1
      })));
    }, 50);

    return () => clearInterval(interval);
  }, [open]);

  // Change background periodically
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      setCurrentBackground(prev => (prev + 1) % backgrounds.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [open]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🔧 WelcomeModal calling AuthContext signIn function...');
      await signIn(loginEmail, loginPassword);

      setSuccess('Login successful!');
      setTimeout(() => {
        onLogin();
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: registerName,
            preferred_name: registerPreferredName,
            school: registerSchool,
            year: registerYear,
          }
        }
      });

      if (authError) throw authError;

      // Insert user data into profiles table
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: registerName,
              preferred_name: registerPreferredName,
              school: registerSchool,
              year: registerYear,
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      setSuccess('Registration successful! Please check your email to verify your account.');
      setTimeout(() => {
        setActiveTab(0); // Switch to login tab
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterSchool('');
    setRegisterYear('');
    setRegisterPreferredName('');
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          background: 'transparent',
          boxShadow: 'none',
          overflow: 'auto',
          borderRadius: '20px',
          maxWidth: '95vw',
          maxHeight: '95vh',
          height: { xs: '95vh', sm: '90vh' }
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden', minHeight: '100%', height: '100%' }}>
        {/* Animated Background with Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${backgrounds[currentBackground]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 2s ease-in-out',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(18, 28, 20, 0.96), rgba(28, 42, 30, 0.93), rgba(79, 195, 138, 0.25), rgba(228, 201, 126, 0.18))',
              zIndex: 1
            }
          }}
        />

        {/* Floating Particles */}
        {particles.map(particle => (
          <Box
            key={particle.id}
            sx={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              background: 'radial-gradient(circle, rgba(228, 201, 126, 0.8), rgba(79, 195, 138, 0.4))',
              borderRadius: '50%',
              opacity: particle.opacity,
              animation: 'float 6s ease-in-out infinite',
              zIndex: 2,
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                '50%': { transform: 'translateY(-20px) rotate(180deg)' }
              }
            }}
          />
        ))}

        {/* Responsive layout - single column on tablet and mobile, two columns on desktop */}
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', lg: 'row' }, 
          alignItems: 'stretch', 
          justifyContent: 'center', 
          overflow: 'auto',
          py: { xs: 2, md: 3 } 
        }}>
          {/* Header section: Athro + intro - always on top for xs/sm/md, left column for lg+ */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: { xs: 2, md: 3, lg: 4 }, pt: { xs: 3, md: 4, lg: 5 }, minWidth: 0 }}>
            <Fade in={open} timeout={1000}>
              <Box sx={{ 
                mb: { xs: 1.5, md: 2, lg: 3 },
                minHeight: { xs: 140, sm: 160, md: 180, lg: 350 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Box
                  component="img"
                  src="/png/athro.png"
                  alt="Athro AI"
                  sx={{
                    width: { xs: 120, sm: 140, md: 160, lg: 320 },
                    height: 'auto',
                    filter: 'drop-shadow(0 0 30px rgba(228, 201, 126, 0.6))',
                    animation: 'pulse 3s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.05)' }
                    }
                  }}
                />
              </Box>
            </Fade>
            <Zoom in={open} timeout={1500}>
              <Typography
                variant="h2"
                sx={{
                  color: '#e4c97e',
                  fontWeight: 800,
                  mb: { xs: 1, lg: 2 },
                  fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.2rem', lg: '4rem' },
                  textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
                  background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundSize: '200% 200%',
                  animation: 'gradient 3s ease infinite',
                  fontFamily: "'Playfair Display', serif",
                  letterSpacing: '-1px',
                  textAlign: 'center',
                  '@keyframes gradient': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' }
                  }
                }}
              >
                Welcome to AthroAi
              </Typography>
            </Zoom>
            <Slide direction="up" in={open} timeout={2000}>
              <Typography
                variant="h5"
                sx={{
                  color: '#fff',
                  mb: { xs: 1.5, lg: 3 },
                  maxWidth: { xs: 280, sm: 350, md: 400, lg: 600 },
                  mx: 'auto',
                  lineHeight: 1.25,
                  textShadow: '0 0 18px #4fc38a, 0 0 8px #e4c97e, 0 0 2px #fff',
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem', lg: '1.5rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  background: 'none',
                  textAlign: 'center',
                }}
              >
                Your AI-powered study companion that adapts to your learning style
              </Typography>
            </Slide>

          </Box>
          {/* Forms section: Login/Register form */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: { xs: 'flex-start', lg: 'center' }, 
            alignItems: 'center', 
            p: { xs: 2, md: 3, lg: 4 }, 
            pt: { xs: 2, md: 3, lg: 6 },
            minWidth: 0,
            minHeight: { xs: 'auto', lg: '600px' }
          }}>
            <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto', background: 'rgba(28, 42, 30, 0.92)', borderRadius: '16px', border: '2px solid #4fc38a', overflow: 'hidden', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{
                  background: 'transparent',
                  minHeight: 48,
                  px: 2,
                  mb: 1,
                  '& .MuiTabs-flexContainer': {
                    gap: 2,
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#e4c97e',
                    height: 3,
                    borderRadius: 2,
                  },
                }}
              >
                <Tab
                  label="Login"
                  sx={{
                    color: activeTab === 0 ? '#e4c97e' : '#4fc38a',
                    fontWeight: 700,
                    fontFamily: 'Raleway, sans-serif',
                    borderRadius: 3,
                    minHeight: 44,
                    px: 3,
                    background: activeTab === 0 ? 'rgba(228,201,126,0.08)' : 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    outline: 'none',
                    '&.Mui-selected': {
                      color: '#e4c97e',
                      background: 'rgba(228,201,126,0.13)',
                    },
                    '&:hover': {
                      background: 'rgba(79,195,138,0.08)',
                      color: '#4fc38a',
                    },
                    transition: 'all 0.2s',
                  }}
                />
                <Tab
                  label="Register"
                  sx={{
                    color: activeTab === 1 ? '#e4c97e' : '#4fc38a',
                    fontWeight: 700,
                    fontFamily: 'Raleway, sans-serif',
                    borderRadius: 3,
                    minHeight: 44,
                    px: 3,
                    background: activeTab === 1 ? 'rgba(228,201,126,0.08)' : 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    outline: 'none',
                    '&.Mui-selected': {
                      color: '#e4c97e',
                      background: 'rgba(228,201,126,0.13)',
                    },
                    '&:hover': {
                      background: 'rgba(79,195,138,0.08)',
                      color: '#4fc38a',
                    },
                    transition: 'all 0.2s',
                  }}
                />
              </Tabs>
              <Box sx={{ p: { xs: 2, md: 3 } }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2, fontFamily: 'Raleway, sans-serif' }}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert severity="success" sx={{ mb: 2, fontFamily: 'Raleway, sans-serif' }}>
                    {success}
                  </Alert>
                )}
                {activeTab === 0 ? (
                  // Login Form
                  <form onSubmit={handleLogin}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          color: '#e4c97e',
                          '& fieldset': { borderColor: '#4fc38a' },
                          '&:hover fieldset': { borderColor: '#e4c97e' },
                          '&.Mui-focused fieldset': { borderColor: '#e4c97e' }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#b5cbb2',
                          fontFamily: 'Raleway, sans-serif'
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          color: '#e4c97e',
                          '& fieldset': { borderColor: '#4fc38a' },
                          '&:hover fieldset': { borderColor: '#e4c97e' },
                          '&.Mui-focused fieldset': { borderColor: '#e4c97e' }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#b5cbb2',
                          fontFamily: 'Raleway, sans-serif'
                        }
                      }}
                    />
                    <Box
                      component="button"
                      type="submit"
                      disabled={loading}
                      sx={{
                        width: '100%',
                        height: '48px',
                        backgroundColor: 'transparent',
                        border: '2px solid #e4c97e',
                        borderRadius: '24px',
                        color: '#e4c97e',
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: 'Raleway, sans-serif',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          backgroundColor: '#e4c97e',
                          color: '#1c2a1e',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(228, 201, 126, 0.3)'
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                          boxShadow: '0 4px 15px rgba(228, 201, 126, 0.2)'
                        },
                        '&:disabled': {
                          opacity: 0.6,
                          cursor: 'not-allowed',
                          transform: 'none',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={20} sx={{ color: 'inherit' }} />
                      ) : (
                        <LoginIcon />
                      )}
                      {loading ? 'Logging in...' : 'Login'}
                    </Box>
                  </form>
                ) : (
                  // Registration Form
                  <form onSubmit={handleRegister}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          color: '#e4c97e',
                          '& fieldset': { borderColor: '#4fc38a' },
                          '&:hover fieldset': { borderColor: '#e4c97e' },
                          '&.Mui-focused fieldset': { borderColor: '#e4c97e' }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#b5cbb2',
                          fontFamily: 'Raleway, sans-serif'
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Preferred Name"
                      value={registerPreferredName}
                      onChange={(e) => setRegisterPreferredName(e.target.value)}
                      required
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          color: '#e4c97e',
                          '& fieldset': { borderColor: '#4fc38a' },
                          '&:hover fieldset': { borderColor: '#e4c97e' },
                          '&.Mui-focused fieldset': { borderColor: '#e4c97e' }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#b5cbb2',
                          fontFamily: 'Raleway, sans-serif'
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      label="School Name"
                      value={registerSchool}
                      onChange={(e) => setRegisterSchool(e.target.value)}
                      required
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          color: '#e4c97e',
                          '& fieldset': { borderColor: '#4fc38a' },
                          '&:hover fieldset': { borderColor: '#e4c97e' },
                          '&.Mui-focused fieldset': { borderColor: '#e4c97e' }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#b5cbb2',
                          fontFamily: 'Raleway, sans-serif'
                        }
                      }}
                    />
                    <FormControl fullWidth sx={{ mb: 1.5 }}>
                      <InputLabel sx={{ color: '#b5cbb2', fontFamily: 'Raleway, sans-serif' }}>Year Group</InputLabel>
                      <Select
                        value={registerYear}
                        onChange={(e) => setRegisterYear(e.target.value)}
                        required
                        sx={{
                          color: '#e4c97e',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4fc38a' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#e4c97e' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#e4c97e' },
                          fontFamily: 'Raleway, sans-serif'
                        }}
                      >
                        {[7, 8, 9, 10, 11, 12, 13].map(year => (
                          <MenuItem key={year} value={year} sx={{ fontFamily: 'Raleway, sans-serif' }}>
                            Year {year}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          color: '#e4c97e',
                          '& fieldset': { borderColor: '#4fc38a' },
                          '&:hover fieldset': { borderColor: '#e4c97e' },
                          '&.Mui-focused fieldset': { borderColor: '#e4c97e' }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#b5cbb2',
                          fontFamily: 'Raleway, sans-serif'
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          color: '#e4c97e',
                          '& fieldset': { borderColor: '#4fc38a' },
                          '&:hover fieldset': { borderColor: '#e4c97e' },
                          '&.Mui-focused fieldset': { borderColor: '#e4c97e' }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#b5cbb2',
                          fontFamily: 'Raleway, sans-serif'
                        }
                      }}
                    />
                    <Box
                      component="button"
                      type="submit"
                      disabled={loading}
                      sx={{
                        width: '100%',
                        height: '48px',
                        backgroundColor: 'transparent',
                        border: '2px solid #e4c97e',
                        borderRadius: '24px',
                        color: '#e4c97e',
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: 'Raleway, sans-serif',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          backgroundColor: '#e4c97e',
                          color: '#1c2a1e',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(228, 201, 126, 0.3)'
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                          boxShadow: '0 4px 15px rgba(228, 201, 126, 0.2)'
                        },
                        '&:disabled': {
                          opacity: 0.6,
                          cursor: 'not-allowed',
                          transform: 'none',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={20} sx={{ color: 'inherit' }} />
                      ) : (
                        <RegisterIcon />
                      )}
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Box>
                  </form>
                )}
              </Box>
            </Box>
            {/* Explore Button */}
            <Fade in={open} timeout={3000}>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onExplore}
                  sx={{
                    border: '2px solid #4fc38a',
                    color: '#4fc38a',
                    fontWeight: 700,
                    fontSize: '1rem',
                    px: 4,
                    py: 1.5,
                    borderRadius: '25px',
                    background: 'rgba(79, 195, 138, 0.1)',
                    backdropFilter: 'blur(10px)',
                    fontFamily: 'Raleway, sans-serif',
                    '&:hover': {
                      background: 'rgba(79, 195, 138, 0.2)',
                      borderColor: '#e4c97e',
                      color: '#e4c97e',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Explore Without Signing In
                </Button>
              </Box>
            </Fade>
          </Box>
        </Box>
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            color: '#e4c97e',
            backgroundColor: 'rgba(28, 42, 30, 0.8)',
            border: '2px solid #4fc38a',
            zIndex: 10,
            '&:hover': {
              backgroundColor: 'rgba(79, 195, 138, 0.2)',
              transform: 'scale(1.1)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal; 