/**
 * FEDERATED AUTHENTICATION CONFIGURATION
 * 
 * This file contains the URLs for cross-app authentication.
 * Update these when deploying to production.
 */

export const FEDERATION_CONFIG = {
  // Development URLs
  development: {
    workspace: 'http://localhost:5175',
    dashboard: 'http://localhost:5210'
  },
  
  // Production URLs - UPDATED WITH NEW TIER SYSTEM
  production: {
    workspace: 'https://lite.athro.ai', // Lite tier users go here
    dashboard: 'https://athro.ai'       // Premium tier users access this
  }
};

export const getWorkspaceUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  return FEDERATION_CONFIG[env as keyof typeof FEDERATION_CONFIG]?.workspace || FEDERATION_CONFIG.development.workspace;
};

export const getDashboardUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  return FEDERATION_CONFIG[env as keyof typeof FEDERATION_CONFIG]?.dashboard || FEDERATION_CONFIG.development.dashboard;
}; 