import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#e5c97e', // Gold from existing projects
      light: '#f0d894',
      dark: '#ccb06e',
      contrastText: '#17221c',
    },
    secondary: {
      main: '#4fc38a', // Green from existing projects
      light: '#6fcf9f',
      dark: '#3da970',
      contrastText: '#ffffff',
    },
    background: {
      default: '#17221c',
      paper: 'rgba(22, 34, 28, 0.95)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#e5c97e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: '#e5c97e',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#e5c97e',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#e5c97e',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          padding: '0.75rem 1.5rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(22, 34, 28, 0.95)',
          borderRadius: '1rem',
          border: '1px solid #4fc38a',
        },
      },
    },
  },
});
