import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Box, Fade, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { styled } from '@mui/material/styles';
import LogoutButton from './LogoutButton';

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
});

const Overlay = styled('div')({
  background: 'rgba(17, 25, 21, 0.95)', // Darker green overlay
  padding: '40px 0', // Reduced top padding to pull content up
  minHeight: '100vh',
});

const Section = styled('section')({
  maxWidth: '1300px',
  margin: '0 auto',
  padding: '80px 30px',
  textAlign: 'center',
  '& h1, & h2, & h3, & h4': {
    fontFamily: "'Playfair Display', serif",
    textTransform: 'uppercase',
    marginBottom: '30px',
    color: '#e4c97e',
    fontWeight: 800,
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
  },
  '& h1': {
    fontSize: '4rem',
    '@media (max-width: 768px)': {
      fontSize: '2.5rem',
    }
  },
  '& h2': {
    fontSize: '2.5rem',
    '@media (max-width: 768px)': {
      fontSize: '2rem',
    }
  },
  '& p': {
    lineHeight: 1.8,
    fontSize: '1.2rem',
    marginBottom: '20px',
    '@media (max-width: 768px)': {
      fontSize: '1.1rem',
    }
  }
});

const FeatureGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '30px',
  marginTop: '40px',
});

const FeatureBox = styled('div')({
  background: 'rgba(255,255,255,0.05)',
  padding: '25px',
  borderRadius: '10px',
  height: '100%',
  textAlign: 'left',
  '& h3': {
    color: '#e5c97e', // Theme gold
    marginBottom: '15px',
    fontSize: '1.4rem',
  }
});

const PricingSection = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '30px',
  justifyContent: 'center',
  marginTop: '60px',
});

const PricingCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isHighlighted',
})<{ $isHighlighted?: boolean }>(({ $isHighlighted = false }) => ({
  background: 'rgba(17, 25, 21, 0.95)', // Match overlay color for consistency
  borderRadius: '16px',
  padding: '30px 20px',
  minWidth: '300px',
  maxWidth: '350px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: '0 0 15px rgba(0,0,0,0.4)',
  transform: $isHighlighted ? 'scale(1.08)' : 'none',
  border: $isHighlighted ? '2px solid #e5c97e' : 'none', // Theme gold
}));

const CTAButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== '$buttonType',
})<{ $buttonType?: 'free' | 'lite' | 'premium' }>(({ $buttonType = 'free' }) => {
  const getBackground = () => {
    switch ($buttonType) {
      case 'free': return '#6fcf9f'; // Theme light green
      case 'lite': return '#3da970'; // Theme dark green
      case 'premium': return '#e5c97e'; // Theme gold
      default: return '#6fcf9f';
    }
  };

  return {
    display: 'inline-block',
    padding: '16px 32px',
    borderRadius: '6px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textDecoration: 'none',
    marginTop: '30px',
    backgroundColor: getBackground(),
    color: '#000',
    width: '100%',
    boxShadow: $buttonType === 'premium' ? '0 0 20px rgba(255,215,0,0.7)' : 'none',
    '&:hover': {
      backgroundColor: getBackground(),
      transform: 'translateY(-2px)',
    }
  };
});

const FeatureList = styled('ul')({
  listStyle: 'none',
  padding: 0,
  margin: '0 0 20px 0',
  '& li': {
    marginBottom: '8px',
    paddingLeft: '20px',
    position: 'relative',
    '&::before': {
      content: '"✓"',
      position: 'absolute',
      left: 0,
      color: '#00FFC6',
      fontWeight: 'bold',
    }
  }
});

const ComparisonTable = styled(TableContainer)({
  marginTop: '60px',
  '& .MuiTableCell-root': {
    color: '#ffffff',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    padding: '12px 10px',
  },
  '& .MuiTableCell-head': {
    textTransform: 'uppercase',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  '& .feature-label': {
    textAlign: 'left',
    fontWeight: 'bold',
  },
  '& .yes': {
    color: '#00FFC6',
    fontWeight: 'bold',
  },
  '& .no': {
    color: '#FF6666',
    fontWeight: 'bold',
  }
});

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, userTier } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authDetected, setAuthDetected] = useState(false);

  // Check for force logout parameter
  const urlParams = new URLSearchParams(window.location.search);
  const forceLogout = urlParams.get('force-logout') === 'true';
  
  // If force logout, clear everything and reset URL
  useEffect(() => {
    if (forceLogout) {
      console.log('💥💥💥 NUCLEAR FORCE LOGOUT DETECTED ON SPLASH!!!');
      
      // NUCLEAR CLEAR EVERYTHING
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Force clear any auth state
      window.dispatchEvent(new CustomEvent('athro-user-cleared', {
        detail: { timestamp: Date.now(), nuclear: true }
      }));
      
      // Reset URL
      window.history.replaceState({}, '', '/');
      
      // Force page reload to completely reset React state
      setTimeout(() => {
        console.log('💥 FORCING COMPLETE PAGE RELOAD TO BREAK AUTH CYCLE');
        window.location.reload();
      }, 100);
    }
  }, [forceLogout]);

  useEffect(() => {
    setShowContent(true);
  }, []);

  // 🔥 Cross-device auth detection for splash screen - DISABLED FOR NUCLEAR LOGOUT
  useEffect(() => {
    console.log('🔍 Auth state check:', { user: !!user, userTier, forceLogout });
    
    // COMPLETELY DISABLE AUTO-REDIRECT IF FORCE LOGOUT OR ANY USER STATE
    if (forceLogout) {
      console.log('💥 FORCE LOGOUT ACTIVE - BLOCKING ALL AUTO-REDIRECTS');
      return;
    }
    
    // TEMPORARILY DISABLE ALL AUTH DETECTION
    console.log('🚫 AUTH DETECTION TEMPORARILY DISABLED');
    return;
    
    // OLD CODE DISABLED:
    // if (!user && !userTier && !forceLogout) {
    //   console.log('✅ Cross-device auth detected on splash screen! Redirecting...');
    //   setAuthDetected(true);
    //   
    //   // Wait a moment for user to see the message, then redirect
    //   setTimeout(() => {
    //     navigate('/login');
    //   }, 2000);
    // }
  }, [user, userTier, navigate, forceLogout]);

  const handleSignUp = (tier: string) => {
    navigate('/register', { state: { selectedTier: tier } });
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // If user is logged in and has a tier, show option to go to dashboard
  const showDashboardOption = user && (userTier === 'free' || userTier === 'lite' || userTier === 'full');

  return (
    <StyledContainer>
      <Overlay>
        {/* Enhanced Header with Proper Button Layout */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Logo */}
          <Typography sx={{ 
            fontFamily: "'Playfair Display', serif",
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#e4c97e',
            textShadow: '0 0 10px #e4c97e'
          }}>
            AthroAi
          </Typography>
          
          {/* Right Side Button Group */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'center' 
          }}>
            {/* Show appropriate buttons based on user state */}
            {showDashboardOption ? (
              // Logged-in user: Show Dashboard button and Logout
              <>
                <Button
                  variant="contained"
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    backgroundColor: '#e4c97e',
                    color: '#1c2a1e',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    '&:hover': {
                      backgroundColor: 'rgba(228, 201, 126, 0.8)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 5px 15px rgba(228, 201, 126, 0.4)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Dashboard
                </Button>
                <LogoutButton position="relative" size="medium" />
              </>
            ) : (
              // Not logged in: Show Login button only
              <Button
                onClick={handleLogin}
                sx={{
                  backgroundColor: 'transparent',
                  border: '2px solid #e4c97e',
                  color: '#e4c97e',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  padding: '10px 25px',
                  borderRadius: '25px',
                  fontSize: '0.9rem',
                  '&:hover': {
                    backgroundColor: '#e4c97e',
                    color: '#000',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 5px 15px rgba(228, 201, 126, 0.4)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Log in to AthroAi
              </Button>
            )}
          </Box>
        </Box>

        {/* 🔥 Cross-device auth detection alert */}
        {authDetected && (
          <Box sx={{ 
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: '90%',
            maxWidth: '500px'
          }}>
            <Alert 
              severity="success"
              sx={{ 
                backgroundColor: 'rgba(79, 195, 138, 0.95)',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                '& .MuiAlert-icon': { color: '#000' }
              }}
            >
              ✅ Already signed in! Redirecting to dashboard...
            </Alert>
          </Box>
        )}
        
        <Fade in={showContent} timeout={1000}>
          <Section sx={{ paddingTop: '120px' }}>
            <Typography variant="h1" sx={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800,
              fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
              textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
              background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%',
              animation: 'gradient 3s ease infinite',
              letterSpacing: '-1px',
              textAlign: 'center',
              '@keyframes gradient': {
                '0%, 100%': { backgroundPosition: '0% 50%' },
                '50%': { backgroundPosition: '100% 50%' }
              }
            }}>
              AthroAi
            </Typography>
            <Typography variant="h2" gutterBottom sx={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800,
              textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
              background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%',
              animation: 'gradient 3s ease infinite',
              letterSpacing: '-1px',
            }}>
              The Only Study Tool In The World That Matters
            </Typography>
            <Typography sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 2 }}>
              This isn't another revision app. This is the breakthrough.
            </Typography>
            <Typography sx={{ mb: 4 }}>
              For every student who's ever felt lost, unheard, or left behind—AthroAi meets you where you are.<br />
              Your notes. Your language. Your learning style. No judgement. No assumptions. Just real answers, in your words, at your pace.
            </Typography>

            {/* Video Placeholder */}
            <Box sx={{ 
              width: '80%', 
              maxWidth: '1000px', 
              height: '500px', 
              margin: '40px auto',
              backgroundColor: 'rgba(17, 25, 21, 0.95)',
              border: '2px solid rgba(228, 201, 126, 0.3)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="h3" sx={{ 
                color: 'rgba(228, 201, 126, 0.3)',
                fontFamily: "'Playfair Display', serif" 
              }}>
                Video Coming Soon
              </Typography>
            </Box>

            <Typography variant="h2" sx={{ 
              textAlign: 'center',
              mt: 4,
              mb: 4,
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800,
              textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
              background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%',
              animation: 'gradient 3s ease infinite',
              letterSpacing: '-1px',
            }}>
              This Changes Everything
            </Typography>

            <Typography sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 4, textAlign: 'center' }}>
              The world just opened up. And for the first time, you're invited in!
            </Typography>

            <PricingSection>
              {/* Free Tier */}
              <PricingCard>
                <Box>
                  <img src="/png/tiers/free.png" alt="Free Tier" style={{ width: '100%', borderRadius: '10px', marginBottom: '20px' }} />
                  <Typography variant="h3" sx={{ 
                    fontSize: '1.8rem', 
                    mb: 1,
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 800,
                    textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
                    background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% 200%',
                    animation: 'gradient 3s ease infinite',
                    letterSpacing: '-1px',
                  }}>
                    FREE
                  </Typography>
                  <Typography className="price-tag" sx={{ fontSize: '1.4rem', fontWeight: 'bold', mb: 2 }}>£0 / month</Typography>
                  <FeatureList>
                    <li>Workspace Access</li>
                    <li>Document Upload + Tools Preview</li>
                  </FeatureList>
                  <Typography sx={{ mb: 2 }}>
                    Test everything—mindmaps, flashcards, notes. Nothing saves. Explore before you commit.
                  </Typography>
                </Box>
                <CTAButton 
                  variant="contained"
                  $buttonType="free" 
                  onClick={() => handleSignUp('free')}
                >
                  Try Free
                </CTAButton>
              </PricingCard>

              {/* Premium Tier */}
              <PricingCard $isHighlighted>
                <Box>
                  <img src="/png/tiers/pro.png" alt="AthroAi Full" style={{ width: '100%', borderRadius: '10px', marginBottom: '20px' }} />
                  <Typography variant="h3" sx={{ 
                    fontSize: '1.8rem', 
                    mb: 1,
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 800,
                    textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
                    background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% 200%',
                    animation: 'gradient 3s ease infinite',
                    letterSpacing: '-1px',
                  }}>
                    AthroAi
                  </Typography>
                  <Typography className="price-tag" sx={{ fontSize: '1.4rem', fontWeight: 'bold', mb: 2 }}>£14.99 / month</Typography>
                  <FeatureList>
                    <li>Unlimited AI Access</li>
                    <li>Custom Study Calendar</li>
                    <li>Confidence Tracking + Insights</li>
                    <li>Mindmaps, Flashcards, Notes</li>
                    <li>Wellbeing and Mindfulness Tools for Resilience</li>
                    <li>GPT-4o + AI Mode Control</li>
                  </FeatureList>
                  <Typography sx={{ mb: 2 }}>
                    The full breakthrough. Total control over your study journey—built around you.
                  </Typography>
                </Box>
                <CTAButton 
                  variant="contained"
                  $buttonType="premium" 
                  onClick={() => handleSignUp('pro')}
                >
                  Unlock Everything
                </CTAButton>
              </PricingCard>

              {/* Lite Tier */}
              <PricingCard>
                <Box>
                  <img src="/png/tiers/lite.png" alt="Lite Tier" style={{ width: '100%', borderRadius: '10px', marginBottom: '20px' }} />
                  <Typography variant="h3" sx={{ 
                    fontSize: '1.8rem', 
                    mb: 1,
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 800,
                    textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
                    background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% 200%',
                    animation: 'gradient 3s ease infinite',
                    letterSpacing: '-1px',
                  }}>
                    AthroAi LITE
                  </Typography>
                  <Typography className="price-tag" sx={{ fontSize: '1.4rem', fontWeight: 'bold', mb: 2 }}>£7.99 / month</Typography>
                  <FeatureList>
                    <li>Full Workspace Access</li>
                    <li>Save Uploads + Notes</li>
                    <li>All Study Tools (Time-Limited)</li>
                    <li>Your Study Library Stays</li>
                  </FeatureList>
                  <Typography sx={{ mb: 2 }}>
                    Save your uploads, build your history, and access tools for a set time each month.
                  </Typography>
                </Box>
                <CTAButton 
                  variant="contained"
                  $buttonType="lite" 
                  onClick={() => handleSignUp('lite')}
                >
                  Go Lite
                </CTAButton>
              </PricingCard>
            </PricingSection>
          </Section>
        </Fade>

        <Fade in={showContent} timeout={1000} style={{ transitionDelay: '250ms' }}>
          <Section>
            <Typography variant="h2" gutterBottom>Built Around You. Literally.</Typography>
            
            <Typography sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 4, textAlign: 'center' }}>
              Whether you're aiming for your first pass… or pushing for the top grades… this is the next step.<br />
              No cheating... just learning in a way you never thought possible.
            </Typography>
            
            <FeatureGrid>
              <FeatureBox>
                <Typography variant="h3">Your Notes. Your Words.</Typography>
                <Typography>Upload your teacher feedback, class notes, and study materials. AthroAi learns your language.</Typography>
              </FeatureBox>
              <FeatureBox>
                <Typography variant="h3">Every Subject. Every Language.</Typography>
                <Typography>Welsh. English. Polish. Arabic. French. German. Ukrainian… side by side. Fully bilingual. Fully yours.</Typography>
              </FeatureBox>
              <FeatureBox>
                <Typography variant="h3">Your Personal Study Calendar</Typography>
                <Typography>20, 40, 60-minute sessions. Based on your confidence, mood, and priorities. Your schedule. Your rules.</Typography>
              </FeatureBox>
              <FeatureBox>
                <Typography variant="h3">Real AI. Real Understanding.</Typography>
                <Typography>Not a past paper generator. Not a quiz app. Real answers. Real learning. Built for you.</Typography>
              </FeatureBox>
              <FeatureBox>
                <Typography variant="h3">Mindmaps. Flashcards. Full & Quick Notes.</Typography>
                <Typography>All built automatically from your documents and conversations. Study how you learn best.</Typography>
              </FeatureBox>
              <FeatureBox>
                <Typography variant="h3">Confidence Tracking + Insights</Typography>
                <Typography>See where you're strong. Know where to focus next. Track your growth in every subject.</Typography>
              </FeatureBox>
              <FeatureBox>
                <Typography variant="h3">Wellbeing and Mindfulness Tools for Resilience</Typography>
                <Typography>Mood check-ins. Breathing exercises. Journaling space. Because how you feel matters.</Typography>
              </FeatureBox>
              <FeatureBox>
                <Typography variant="h3">AI Mode Control. Your Power, Your Choice</Typography>
                <Typography>Switch between GPT-3.5 and GPT-4o. More time or more power—you decide. Full control over how your AI works for you.</Typography>
              </FeatureBox>
            </FeatureGrid>
          </Section>
        </Fade>

        <Fade in={showContent} timeout={1000} style={{ transitionDelay: '500ms' }}>
          <Section sx={{ paddingTop: '20px' }}>
            <Typography variant="h2" gutterBottom sx={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800,
              textShadow: '0 0 32px #e4c97e, 0 0 12px #4fc38a, 0 0 2px #fff',
              background: 'linear-gradient(45deg, #e4c97e, #4fc38a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%',
              animation: 'gradient 3s ease infinite',
              letterSpacing: '-1px',
              textAlign: 'center',
              mb: 4
            }}>
              Choose the right plan for you
            </Typography>

            <Typography sx={{ color: '#e4c97e', fontWeight: 'bold', mb: 4, textAlign: 'center' }}>
              Trained on UK curriculum standards… using Welsh and English curriculum resources… this is study support like never before.<br />
              No shortcuts… just learning that actually works.
            </Typography>
            
            <ComparisonTable>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell align="center">FREE</TableCell>
                    <TableCell align="center">AthroAi LITE</TableCell>
                    <TableCell align="center">AthroAi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell className="feature-label">Workspace Access</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">Document Upload</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">Save Uploads + Notes</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">Study Tools</TableCell>
                    <TableCell align="center">✅ Preview Only</TableCell>
                    <TableCell align="center" className="yes">✅ Time-Limited</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">Custom Study Calendar</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">Confidence Tracking + Insights</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">Document Playlist Folders</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">Wellbeing and Mindfulness Tools</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="feature-label">AI Mode Control</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="no">❌</TableCell>
                    <TableCell align="center" className="yes">✅</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ComparisonTable>

            <Box sx={{ textAlign: 'center', mt: 8 }}>
              <Typography variant="h2" gutterBottom>
                This is the key
              </Typography>
              <Typography sx={{ mb: 4, maxWidth: '1040px', margin: '0 auto 32px auto', textAlign: 'center', lineHeight: 1.8 }}>
                Maybe you've always been on top of things. Maybe you've been winging it and hoping for the best. Maybe you've spent years thinking you're just not "one of those students."
                <br /><br />
                None of that matters now. Because this… this changes the game for everyone:
                <br /><br />
                The students aiming for their first pass. The ones pushing for straight A*s and 9s. The ones quietly working late at night, hoping it'll all click. The ones who never thought study could actually feel like this.
                <br /><br />
                Different backgrounds. Different abilities. Different attention spans. Different languages. Different worlds…
                <br /><br />
                This isn't guesswork. This isn't hype. This is the result of years spent standing in front of thousands of students… Watching how they learn. Listening to how they think. Understanding the blocks, the barriers, and the moments where everything finally makes sense.
                <br /><br />
                But one thing always stood out: Every student has a key.
                <br /><br />
                The thing that unlocks it all.
                <br /><br />
                And for the first time ever—here it is.
                <br /><br />
                This isn't about being "good enough." This is about progress—on your terms.
                <br /><br />
                Whatever your goal… Whatever your starting point… This is your key.
              </Typography>
              <Typography variant="h2" gutterBottom sx={{ mb: 4 }}>
                This Is Your Time
              </Typography>
              <CTAButton
                variant="contained"
                $buttonType="premium"
                onClick={() => handleSignUp('pro')}
                sx={{ maxWidth: '300px' }}
              >
                Start Now
              </CTAButton>
            </Box>
          </Section>
        </Fade>
      </Overlay>
    </StyledContainer>
  );
}; 