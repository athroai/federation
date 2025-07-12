import React, { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

export const TestHarness: React.FC = () => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [testResult, setTestResult] = useState<string>('');

  const runTest = async () => {
    setTestResult('Running test...\n');
    
    // Test 1: Check current state
    setTestResult(prev => prev + `Current user: ${user?.email || 'Not logged in'}\n`);
    setTestResult(prev => prev + `Current preferred_name: ${userProfile?.preferred_name || 'Not set'}\n`);
    
    // Test 2: Force refresh
    setTestResult(prev => prev + 'Forcing profile refresh...\n');
    await refreshUserProfile();
    
    // Test 3: Check after refresh
    setTestResult(prev => prev + `After refresh preferred_name: ${userProfile?.preferred_name || 'Not set'}\n`);
    
    setTestResult(prev => prev + '\nTest complete!');
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        m: 2, 
        backgroundColor: 'rgba(28, 42, 30, 0.95)',
        border: '2px solid #e4c97e',
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 400
      }}
    >
      <Typography variant="h6" sx={{ color: '#e4c97e', mb: 2 }}>
        🧪 State Update Test Harness
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ color: '#b5cbb2', fontSize: '0.9rem' }}>
          <strong>User:</strong> {user?.email || 'Not logged in'}
        </Typography>
        <Typography sx={{ color: '#b5cbb2', fontSize: '0.9rem' }}>
          <strong>Preferred Name:</strong> {userProfile?.preferred_name || 'Not set'}
        </Typography>
        <Typography sx={{ color: '#b5cbb2', fontSize: '0.9rem' }}>
          <strong>Full Name:</strong> {userProfile?.full_name || 'Not set'}
        </Typography>
      </Box>
      
      <Button 
        onClick={runTest}
        variant="contained"
        sx={{
          backgroundColor: '#4fc38a',
          color: '#1c2a1e',
          fontWeight: 'bold',
          mb: 2,
          '&:hover': {
            backgroundColor: 'rgba(79, 195, 138, 0.8)',
          }
        }}
      >
        Run State Test
      </Button>
      
      {testResult && (
        <Box sx={{ 
          backgroundColor: 'rgba(0,0,0,0.3)', 
          p: 1, 
          borderRadius: 1,
          maxHeight: 200,
          overflow: 'auto'
        }}>
          <Typography sx={{ 
            color: '#90EE90', 
            fontSize: '0.8rem', 
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap'
          }}>
            {testResult}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}; 