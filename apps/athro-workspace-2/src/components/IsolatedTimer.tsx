import React, { useState, useEffect, useRef } from 'react';

interface IsolatedTimerProps {
  initialMinutes?: number;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Isolated Timer Component
 * 
 * This timer is completely self-contained and doesn't use React Context.
 * It won't trigger re-renders in parent components or interfere with ChatInterface.
 * Uses local state and setInterval for timer functionality.
 */
export const IsolatedTimer: React.FC<IsolatedTimerProps> = ({ 
  initialMinutes = 20,
  onComplete,
  className,
  style 
}) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect - completely isolated
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  const handleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(selectedMinutes * 60);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedMinutes * 60);
  };

  const handleTimeChange = (minutes: number) => {
    setSelectedMinutes(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = selectedMinutes > 0 ? 
    ((selectedMinutes * 60 - timeLeft) / (selectedMinutes * 60)) * 100 : 0;

  return (
    <div 
      className={className}
      style={{ 
        backgroundColor: 'rgba(79, 195, 138, 0.1)',
        border: '1px solid rgba(79, 195, 138, 0.3)',
        borderRadius: '0.5rem',
        padding: '0.5rem',
        minWidth: '280px',
        maxWidth: '280px',
        width: '280px',
        minHeight: '84px',
        maxHeight: '84px',
        height: '84px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.75rem',
        ...style
      }}
    >
      {/* Clock Circle */}
      <div style={{ 
        width: '50px', 
        height: '50px', 
        position: 'relative',
        flexShrink: 0
      }}>
        <svg 
          width="50" 
          height="50" 
          viewBox="0 0 50 50"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="rgba(79, 195, 138, 0.2)"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="#4fc38a"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercentage / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#4fc38a',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
        <select
          value={selectedMinutes}
          onChange={(e) => handleTimeChange(Number(e.target.value))}
          style={{
            padding: '0.3rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid rgba(79, 195, 138, 0.3)',
            backgroundColor: 'rgba(79, 195, 138, 0.05)',
            color: '#4fc38a',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
          disabled={isRunning}
        >
          <option value={5}>5 minutes</option>
          <option value={10}>10 minutes</option>
          <option value={15}>15 minutes</option>
          <option value={20}>20 minutes</option>
          <option value={25}>25 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {!isRunning ? (
            <button
              onClick={handleStart}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid rgba(79, 195, 138, 0.3)',
                backgroundColor: 'rgba(79, 195, 138, 0.1)',
                color: '#4fc38a',
                fontSize: '0.7rem',
                cursor: 'pointer',
                flex: 1
              }}
            >
              Start
            </button>
          ) : (
            <button
              onClick={handlePause}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid rgba(79, 195, 138, 0.3)',
                backgroundColor: 'rgba(79, 195, 138, 0.1)',
                color: '#4fc38a',
                fontSize: '0.7rem',
                cursor: 'pointer',
                flex: 1
              }}
            >
              Pause
            </button>
          )}
          
          <button
            onClick={handleReset}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid rgba(79, 195, 138, 0.3)',
              backgroundColor: 'rgba(79, 195, 138, 0.1)',
              color: '#4fc38a',
              fontSize: '0.7rem',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default IsolatedTimer; 