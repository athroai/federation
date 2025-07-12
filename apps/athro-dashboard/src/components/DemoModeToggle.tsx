import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './DemoModeToggle.css';

export function DemoModeToggle() {
  const { enableDemoMode, disableDemoMode, isDemoMode } = useAuth();
  const isDemo = isDemoMode();

  const handleToggle = () => {
    if (isDemo) {
      disableDemoMode();
      window.location.reload(); // Refresh to show real data
    } else {
      enableDemoMode();
      window.location.reload(); // Refresh to show demo data
    }
  };

  return (
    <div className="demo-mode-toggle">
      <div className="demo-toggle-container">
        <span className="demo-toggle-label">
          {isDemo ? '🎭 Demo Mode' : '👤 Live Mode'}
        </span>
        <button 
          onClick={handleToggle}
          className={`demo-toggle-btn ${isDemo ? 'demo-active' : 'live-active'}`}
          title={isDemo ? 'Switch to live data' : 'Switch to demo data'}
        >
          {isDemo ? 'Exit Demo' : 'Try Demo'}
        </button>
      </div>
      {isDemo && (
        <div className="demo-notice">
          <p>🎭 You're viewing demo data as "Alex Thompson" - a Year 11 student with full platform access</p>
        </div>
      )}
    </div>
  );
} 