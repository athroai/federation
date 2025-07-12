import React, { useState } from 'react';
import { Box, Typography, Paper, Button, IconButton, Snackbar } from '@mui/material';
import { ContentCopy, Visibility, VisibilityOff } from '@mui/icons-material';
import { demoDataService } from '../services/DemoDataService';

export function DemoLoginInfo() {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const credentials = demoDataService.getDemoLoginCredentials();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 2, 
        background: 'linear-gradient(135deg, #1e3a32, #2d5a47)',
        border: '1px solid #4fc38a',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" sx={{ color: '#4fc38a', mb: 2, fontWeight: 600 }}>
        🎭 Demo Login Credentials
      </Typography>
      
      <Typography variant="body2" sx={{ color: '#b5cbb2', mb: 2 }}>
        Use these credentials to log in as Alex Thompson (Year 11 student with full platform access):
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Email */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: '#e4c97e', minWidth: 80, fontWeight: 500 }}>
            Email:
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#fff', 
              fontFamily: 'monospace', 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              px: 1, 
              py: 0.5, 
              borderRadius: 1,
              flex: 1
            }}
          >
            {credentials.email}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => copyToClipboard(credentials.email, 'email')}
            sx={{ color: '#4fc38a' }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Box>

        {/* Password */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: '#e4c97e', minWidth: 80, fontWeight: 500 }}>
            Password:
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#fff', 
              fontFamily: 'monospace', 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              px: 1, 
              py: 0.5, 
              borderRadius: 1,
              flex: 1
            }}
          >
            {showPassword ? credentials.password : '••••••••••••'}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => setShowPassword(!showPassword)}
            sx={{ color: '#4fc38a' }}
          >
            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => copyToClipboard(credentials.password, 'password')}
            sx={{ color: '#4fc38a' }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: '#b5cbb2', mt: 2, fontStyle: 'italic' }}>
        💡 Tip: You can also click the "Try Demo" button in the top-right corner for instant access!
      </Typography>

      <Snackbar
        open={!!copied}
        autoHideDuration={2000}
        message={`${copied === 'email' ? 'Email' : 'Password'} copied to clipboard!`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
} 