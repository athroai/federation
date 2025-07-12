import { Box, Typography } from '@mui/material';
import { NextSessionCard } from './NextSessionCard';
import { ProgressIndicators } from './ProgressIndicators';
import { RecentResources } from './RecentResources';
import { CountdownTimer } from './CountdownTimer';
import { StudyMetrics } from './StudyMetrics';
import { QuickTools } from './QuickTools';
import { addHours } from 'date-fns';

export const ActiveLearning = () => {
  const nextSession = {
    title: 'Quantum Mechanics: Wave Functions',
    startTime: addHours(new Date(), 2),
    endTime: addHours(new Date(), 3),
    athroName: 'Professor Maxwell',
    subject: 'Physics',
  };

  const subjects = [
    { subject: 'Physics', progress: 75, color: '#4fc38a' },
    { subject: 'Mathematics', progress: 60, color: '#e5c97e' },
    { subject: 'Chemistry', progress: 45, color: '#7e95e5' },
  ];

  const resources = [
    {
      id: '1',
      type: 'note' as const,
      title: 'Wave Functions Introduction',
      lastModified: new Date(),
    },
    {
      id: '2',
      type: 'quiz' as const,
      title: 'Quantum Mechanics Quiz',
      lastModified: new Date(),
    },
    {
      id: '3',
      type: 'mindmap' as const,
      title: 'Physics Concepts Map',
      lastModified: new Date(),
    },
  ];

  const metrics = [
    {
      label: 'Learning Streak',
      value: '7 Days',
      icon: 'streak' as const,
      progress: 70,
    },
    {
      label: 'Subject Mastery',
      value: '3 Topics',
      icon: 'mastery' as const,
      progress: 60,
    },
  ];

  const handleDocumentUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.doc,.docx,.ppt,.pptx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        console.log('Selected documents:', Array.from(files).map(f => f.name));
        // TODO: Implement actual upload logic to workspace
        // For now, show a message about the selected files
        const fileNames = Array.from(files).map(f => f.name).join(', ');
        alert(`Selected documents: ${fileNames}\n\nTo upload documents, please use the workspace directly.`);
      }
    };
    
    input.click();
  };

  const tools = [
    {
      id: 'note',
      label: 'Quick Note',
      icon: 'note' as const,
      action: () => console.log('Create note'),
    },
    {
      id: 'upload',
      label: 'Upload Documents',
      icon: 'upload' as const,
      action: handleDocumentUpload,
    },
    {
      id: 'flashcard',
      label: 'Flashcard',
      icon: 'flashcard' as const,
      action: () => console.log('Create flashcard'),
    },
    {
      id: 'voice',
      label: 'Voice Memo',
      icon: 'voice' as const,
      action: () => console.log('Record voice'),
    },
    {
      id: 'screenshot',
      label: 'Screenshot',
      icon: 'screenshot' as const,
      action: () => console.log('Take screenshot'),
    },
  ];
  


  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" color="primary.main" sx={{ mb: 3, textAlign: 'center' }}>
        Active Learning
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
          width: '100%',
        }}
      >
        <Box sx={{ width: '100%' }}>
          <NextSessionCard session={nextSession} />
        </Box>
        
        <Box
          sx={{
            display: 'grid',
            gridTemplateRows: 'auto auto',
            gap: 3,
            width: '100%',
          }}
        >
          <ProgressIndicators subjects={subjects} />
          <CountdownTimer nextSessionTime={nextSession.startTime} />
        </Box>

        <Box sx={{ width: '100%' }}>
          <RecentResources resources={resources} />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateRows: 'auto auto',
            gap: 3,
            width: '100%',
          }}
        >
          <StudyMetrics metrics={metrics} />
          <QuickTools tools={tools} />
        </Box>
      </Box>
    </Box>
  );
};
