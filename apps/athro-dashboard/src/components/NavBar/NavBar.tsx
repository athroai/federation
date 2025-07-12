import React from 'react';
import './NavBar.css';

const NavBar: React.FC = () => {
  const handleWorkspaceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    console.log('🌐 [NavBar] Navigating to embedded workspace in dashboard...');
    
    // Navigate to dashboard with workspace card expanded
    const dashboardUrl = `/dashboard?workspace=open`;
    window.location.href = dashboardUrl;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <img src="/athros/athro.jpg" alt="Athro" className="navbar-logo" />
        </div>
        
        <div className="navbar-links">
          <a href="/onboarding/" className="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          </a>
          
          <a href="/onboarding/calendar" className="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Calendar</span>
          </a>
          
          <button onClick={handleWorkspaceClick} className="nav-item" style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: '0' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>Workspace</span>
          </button>
          
          <a href="/dashboard" className="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Dashboard</span>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
