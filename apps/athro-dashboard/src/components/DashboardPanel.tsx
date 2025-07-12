import React, { useState, useEffect } from 'react';
import { eventBus, EventPayload } from '@athro/shared-services';
import { formatDateTime } from '../utils/dateUtils';

interface ConfidenceLevelPayload {
  level: number;
  source: string;
}

interface DashboardPanelProps {
  title?: string;
  className?: string;
}

/**
 * DashboardPanel Component
 * 
 * This component subscribes to confidence level updates from the workspace
 * application and displays them in the dashboard.
 * 
 * Following the principle: "Shared state is synchronized, not copied"
 */
export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  title = 'Athro Dashboard',
  className = ''
}) => {
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [confidenceTimestamp, setConfidenceTimestamp] = useState<string | null>(null);
  const [confidenceSource, setConfidenceSource] = useState<string | null>(null);
  
  // Subscribe to confidence level updates from the workspace application
  useEffect(() => {
    // Define the subscription handler
    const handleConfidenceUpdate = (event: EventPayload<ConfidenceLevelPayload>) => {
      const { payload, timestamp } = event;
      
      if (import.meta.env.DEV) console.log('Dashboard received confidence update:', payload);
      
      // Update local state with the synchronized data
      setConfidenceLevel(payload.level);
      setConfidenceTimestamp(timestamp);
      setConfidenceSource(payload.source);
    };
    
    // Subscribe to the event using the {source}.{action}.{result} pattern
    const subscriptionId = eventBus.subscribe<ConfidenceLevelPayload>(
      'athro.confidence.updated', 
      handleConfidenceUpdate
    );
    
    // Unsubscribe when the component unmounts
    return () => {
      eventBus.unsubscribe(subscriptionId);
    };
  }, []);
  
  // Render a fallback if no confidence data has been received yet
  if (confidenceLevel === null) {
    return (
      <div className={`athro-dashboard-panel ${className}`}>
        <h2>{title}</h2>
        <div className="athro-dashboard-no-data">
          Waiting for confidence data from workspace...
        </div>
      </div>
    );
  }
  
  // Helper function to format the timestamp
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      return formatDateTime(date.getTime());
    } catch (e) {
      return 'Invalid timestamp';
    }
  };
  
  // Determine the confidence level category
  const getConfidenceCategory = (level: number) => {
    if (level >= 0.8) return 'High';
    if (level >= 0.5) return 'Medium';
    return 'Low';
  };
  
  return (
    <div className={`athro-dashboard-panel ${className}`}>
      <h2>{title}</h2>
      
      <div className="athro-dashboard-card">
        <h3>Current Confidence Level</h3>
        <div className={`athro-confidence-indicator athro-confidence-${getConfidenceCategory(confidenceLevel).toLowerCase()}`}>
          <span className="athro-confidence-value">{Math.round(confidenceLevel * 100)}%</span>
          <span className="athro-confidence-category">({getConfidenceCategory(confidenceLevel)})</span>
        </div>
        
        <div className="athro-dashboard-metadata">
          <p>Last updated: {formatTimestamp(confidenceTimestamp)}</p>
          <p>Source: {confidenceSource || 'Unknown'}</p>
        </div>
      </div>
      
      <div className="athro-dashboard-actions">
        <button className="athro-dashboard-button">
          Export Report
        </button>
      </div>
    </div>
  );
};

export default DashboardPanel;
