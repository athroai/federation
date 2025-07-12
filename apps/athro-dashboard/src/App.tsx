import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './styles/theme';
import Dashboard from './components/Dashboard/Dashboard';
import UpgradeSuccess from './components/Payment/UpgradeSuccess';
import UpgradeCancel from './components/Payment/UpgradeCancel';
import TokenPurchaseSuccess from './components/Payment/TokenPurchaseSuccess';
import { ATHROS } from '@athro/shared-athros';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SplashScreen } from './components/Auth/SplashScreen';
import { RegisterScreen } from './components/Auth/RegisterScreen';
import { LoginScreen } from './components/Auth/LoginScreen';
import { EmailConfirmed } from './components/Auth/EmailConfirmed';
import { NotificationService } from '@athro/shared-services';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

// Smart root redirect component
const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  // Show splash screen immediately if no user, don't wait for loading
  if (!user) {
    return <SplashScreen />;
  }
  
  // If user is logged in, go to dashboard
  return <Navigate to="/dashboard" replace />;
};

function App() {
  // Mock data for testing
  const mockConfidence = ATHROS.reduce((acc, athro) => {
    acc[athro.id] = Math.floor(Math.random() * 10);
    return acc;
  }, {} as Record<string, number>);

  const mockPriorities = new Set<string>();

  // Initialize notification service for backend functionality (no invasive UI)
  React.useEffect(() => {
    const notificationService = NotificationService.getInstance();
    console.log('🔔 Notification service initialized');
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Icon size fix */}
        <style>{`
          /* Fix for massive icons - enforce reasonable maximum sizes */
          svg:not([width]):not([height]) {
            max-width: 48px;
            max-height: 48px;
          }
          
          /* Ensure Material-UI icons don't get too large */
          .MuiSvgIcon-root {
            max-width: 48px !important;
            max-height: 48px !important;
          }
          
          /* Specific fixes for common icon sizes */
          .MuiSvgIcon-fontSizeSmall {
            font-size: 1.25rem !important;
            max-width: 20px !important;
            max-height: 20px !important;
          }
          
          .MuiSvgIcon-fontSizeMedium {
            font-size: 1.5rem !important;
            max-width: 24px !important;
            max-height: 24px !important;
          }
          
          .MuiSvgIcon-fontSizeLarge {
            font-size: 2rem !important;
            max-width: 32px !important;
            max-height: 32px !important;
          }
        `}</style>
        <Router>
          {/* Add NotificationCenter as a global overlay */}
          {/* <NotificationCenter position="top-right" maxNotifications={5} /> */}
          
          <Routes>
            {/* Smart root redirect - goes to dashboard if logged in, splash if not */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* CRITICAL: Dedicated splash screen route for plan selection */}
            <Route path="/plans" element={<SplashScreen />} />
            
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />
            <Route path="/upgrade-success" element={<UpgradeSuccess />} />
            <Route path="/upgrade-cancelled" element={<UpgradeCancel />} />
            <Route path="/token-purchase-success" element={<TokenPurchaseSuccess />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
          <Box
            sx={{
              minHeight: '100vh',
              backgroundColor: '#0a1612',
              color: '#fff',
              backgroundImage: 'url(/world/world-bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }}
          >
            <Box
              sx={{
                backgroundColor: 'rgba(22, 34, 28, 0.85)',
                minHeight: '100vh',
                width: '100%',
                maxWidth: '100vw',
                margin: '0 auto',
                px: { xs: 2, sm: 4, md: 6 },
                py: { xs: 3, sm: 4 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  maxWidth: '1920px',
                  margin: '0 auto',
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                        <Dashboard
                          athros={ATHROS}
                          confidence={mockConfidence}
                          priorities={mockPriorities}
                        />
                </Box>
              </Box>
            </Box>
          </Box>
                </ProtectedRoute>
              }
            />

            {/* Catch all redirect to splash screen */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
