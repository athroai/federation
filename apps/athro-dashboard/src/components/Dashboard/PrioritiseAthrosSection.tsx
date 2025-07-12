import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Paper, Slider } from '@mui/material';
import { eventBus, EVENTS } from '@athro/shared-services';
import { Athro, ConfidenceLevel } from '@athro/shared-types';

// REMOVED: getPrioritisedAthros function - no longer using localStorage data that contains stale "AthroWelsh"
// Now using fresh ATHROS data from shared package only

function getConfidenceColor(level: ConfidenceLevel) {
  const n = typeof level === 'number' ? level : parseInt(level as any, 10);
  if (n <= 4) return '#e85a6a'; // red
  if (n <= 7) return '#e4c97e'; // yellow
  return '#4fc38a'; // green
}

export const PrioritiseAthrosSection: React.FC = () => {
  // REMOVED: All localStorage functionality - using empty state to prevent stale "AthroWelsh" data
  const [athros, setAthros] = useState<Athro[]>([]);

  // REMOVED: All localStorage-based functionality that contained stale data
  // This component is now disabled to prevent serving "AthroWelsh" instead of "AthroCymraeg"

  return (
    <Paper sx={{ mt: 4, p: 3, background: 'rgba(22,34,28,0.95)' }}>
      <Typography variant="h6" color="primary.main" sx={{ mb: 2 }}>
        Component Disabled
      </Typography>
      <Typography variant="body2" sx={{ color: '#b5cbb2' }}>
        This component has been temporarily disabled to prevent serving stale "AthroWelsh" data. 
        All athro data now comes from Supabase with the updated "AthroCymraeg" name.
      </Typography>
    </Paper>
  );
}; 