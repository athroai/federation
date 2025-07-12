import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { CalendarMonth, School, Dashboard, Home } from '@mui/icons-material';

export const TopNav = () => {
  return (
    <AppBar position="static" color="transparent" sx={{ borderBottom: 1, borderColor: 'primary.main' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'primary.main' }}>
          Athro
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="primary"
            startIcon={<Dashboard />}
            href="https://bucolic-fenglisu-6ffb84.netlify.app"
          >
            Dashboard
          </Button>
          <Button
            color="primary"
            startIcon={<School />}
            href="http://localhost:5175"
          >
            Workspace
          </Button>
          <Button
            color="primary"
            startIcon={<CalendarMonth />}
            href="http://localhost:5200/onboarding/calendar"
          >
            Calendar
          </Button>
          <Button
            color="primary"
            startIcon={<Home />}
            href="http://localhost:5200/onboarding/"
          >
            Home
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
