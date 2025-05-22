import React, { useState, useEffect } from 'react';
import { simpleEventBus as eventBus } from '@athro/shared-services';

export interface AthroCardProps {
  title: string;
  content: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  athroId?: string; // Add ID to associate with specific Athro
}

/**
 * AthroCard component - a shared card component used across all Athro applications
 * Now with confidence level display
 */
export const AthroCard: React.FC<AthroCardProps> = ({
  title,
  content,
  footer,
  onClick,
  className = '',
  athroId
}) => {
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);

  // Subscribe to confidence level updates
  useEffect(() => {
    if (!athroId) return; // Only subscribe if we have an athroId
    
    const subscriptionId = eventBus.subscribe('athro.confidence.updated', (event) => {
      // Check if this event is relevant for this specific Athro
      // You might need to modify your event structure to include athroId
      if (event.payload.athroId === athroId || !event.payload.athroId) {
        setConfidenceLevel(event.payload.level);
      }
    });
    
    return () => {
      eventBus.unsubscribe(subscriptionId);
    };
  }, [athroId]);

  // Render the confidence indicator if we have a confidence level
  const renderConfidenceIndicator = () => {
    if (confidenceLevel === null) return null;
    
    // Determine color based on confidence level
    const getColor = () => {
      if (confidenceLevel >= 0.7) return '#4caf50'; // Green
      if (confidenceLevel >= 0.4) return '#ff9800'; // Orange
      return '#f44336'; // Red
    };
    
    return (
      <div className="athro-confidence-indicator">
        <div 
          className="athro-confidence-bar"
          style={{
            width: `${confidenceLevel * 100}%`,
            backgroundColor: getColor(),
            height: '5px',
            borderRadius: '2px'
          }}
        />
        <span className="athro-confidence-label">
          {Math.round(confidenceLevel * 100)}%
        </span>
      </div>
    );
  };

  return (
    <div 
      className={`athro-card ${className} ${onClick ? 'athro-card-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="athro-card-header">
        <h3 className="athro-card-title">{title}</h3>
        {renderConfidenceIndicator()}
      </div>
      <div className="athro-card-content">
        {content}
      </div>
      {footer && (
        <div className="athro-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};
