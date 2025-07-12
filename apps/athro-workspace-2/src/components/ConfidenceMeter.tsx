import React, { useState, useEffect } from 'react';
import workspaceService, { ConfidenceLevel } from '../services/WorkspaceService';

const CONFIDENCE_LEVELS = [
  { key: 'HIGH', label: 'High', desc: 'I feel confident in this subject.', color: '#4fc38a' },
  { key: 'MEDIUM', label: 'Medium', desc: 'I feel okay, but could use more practice.', color: '#e4c97e' },
  { key: 'LOW', label: 'Low', desc: 'I find this subject challenging.', color: '#e85a6a' }
];

interface ConfidenceMeterProps {
  athroId: string;
  className?: string;
}

/**
 * ConfidenceMeter Component
 * 
 * This component is the source of truth for confidence levels.
 * When the confidence level changes, it broadcasts the change
 * to all applications through the WorkspaceService.
 * 
 * Following the principle: "Each service owns and protects its domain"
 */
export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  athroId,
  className = ''
}) => {
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('MEDIUM');
  
  // Load initial confidence level from service on mount
  useEffect(() => {
    const savedLevel = workspaceService.getConfidenceLevel(athroId);
    if (savedLevel) {
      setConfidenceLevel(savedLevel);
    }
  }, [athroId]);

  // Update confidence level and broadcast change
  const handleConfidenceChange = (level: ConfidenceLevel) => {
    setConfidenceLevel(level);
    workspaceService.broadcastConfidenceUpdate(athroId, level);
  };
  
  return (
    <div className={`athro-confidence-meter ${className}`}>
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%'
      }}>
        {CONFIDENCE_LEVELS.map((level) => (
          <button
            key={level.key}
            onClick={() => handleConfidenceChange(level.key as ConfidenceLevel)}
            className="glass-btn"
            style={{
              background: confidenceLevel === level.key ? level.color : 'rgba(36,54,38,0.78)',
              color: confidenceLevel === level.key ? '#1c2a1e' : '#e3e8e1',
              border: confidenceLevel === level.key ? `2px solid ${level.color}` : 'none',
              fontWeight: 600,
              borderRadius: '1rem',
              padding: '0.7rem 1.5rem',
              fontFamily: 'Raleway, Arial, sans-serif',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0002',
              transition: 'background 0.13s, color 0.13s',
              minWidth: 120,
            }}
          >
            {level.label}
          </button>
        ))}
      </div>
      {confidenceLevel && (
        <div style={{
          color: CONFIDENCE_LEVELS.find(c => c.key === confidenceLevel)?.color || '#b5cbb2',
          fontSize: '1.1rem',
          fontWeight: 600,
          marginTop: '0.5rem',
          textAlign: 'center'
        }}>
          • {CONFIDENCE_LEVELS.find(c => c.key === confidenceLevel)?.desc}
        </div>
      )}
    </div>
  );
};

export default ConfidenceMeter;
