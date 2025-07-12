import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import WorkPage from './pages/WorkPage'

import { AuthProvider } from './contexts/AuthContext'
import { ATHRO_PERSONALITIES } from './data/athroPersonalities'
import { Athro } from './types/athro'
import athroMascotImage from '/png/athro.png'
import AuthWrapper from './components/AuthWrapper'

// Check if this is standalone mode (direct access to port 5175)
const isStandalone = !window.parent || window.parent === window;

// Create full Athro objects from athro personalities for standalone mode
const allAthros: Athro[] = Object.entries(ATHRO_PERSONALITIES).map(([id, personality]) => ({
  id,
  name: personality.subject,
  subject: personality.subject,
  description: `${personality.level} ${personality.subject} specialist with ${personality.teachingStyle.toLowerCase()}`,
  image: `/athros/${id}.jpg`,
  isPriority: false, // All athros available but none prioritized by default
  confidenceLevel: 'MEDIUM' as const
}));

// Default props for standalone full-screen mode (when accessed directly on port 5175)
const defaultProps = {
  selectedAthros: allAthros, // Load ALL available Athros automatically
  confidenceLevels: {}, // Will load from user preferences
  prioritySubjects: new Set<string>() // Will load from user preferences
};

// Standalone Workspace Component - Direct Access with Authentication
const StandaloneWorkspace = () => {
  return (
    <AuthProvider>
      <AuthWrapper>
        <div 
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1c2a1e 0%, #2d4a32 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <WorkPage {...defaultProps} />
        </div>
      </AuthWrapper>
    </AuthProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isStandalone ? (
      <StandaloneWorkspace />
    ) : (
      <App {...defaultProps} />
    )}
  </StrictMode>,
)
