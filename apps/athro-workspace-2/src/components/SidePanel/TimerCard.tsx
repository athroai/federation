import React from 'react';
import { useTimer } from '../../contexts/TimerContext';

const TimerCard = React.memo(() => {
  const { 
    timeLeft, 
    isRunning, 
    isCompleted, 
    selectedTime,
    handleStart, 
    handlePause, 
    handleComplete,
    handleTimeChange,
    formatTime
  } = useTimer();

  // Calculate progress percentage (how much has been completed)
  const progressPercentage = selectedTime > 0 ? ((selectedTime * 60 - timeLeft) / (selectedTime * 60)) * 100 : 0;
  
  // Calculate the stroke-dasharray for the progress circle (50% bigger)
  const radius = 52; // Increased from 35 to 52 (50% bigger)
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div 
      style={{ 
        backgroundColor: 'rgba(79, 195, 138, 0.1)',
        border: '1px solid rgba(79, 195, 138, 0.3)',
        borderRadius: '0.5rem',
        padding: '0.5rem',
        marginTop: '1rem',
        marginBottom: '0.75rem',
        marginLeft: 'auto',
        marginRight: 'auto',
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
        gap: '0.75rem'
      }}
    >
      {/* Clock */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="36"
            cy="36"
            r="31"
            stroke="rgba(79, 195, 138, 0.2)"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="36"
            cy="36"
            r="31"
            stroke="#4fc38a"
            strokeWidth="3"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 31}`}
            strokeDashoffset={`${2 * Math.PI * 31 * (1 - progressPercentage / 100)}`}
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
          />
        </svg>
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'monospace',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#4fc38a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
        <select
          value={selectedTime}
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
          <option value={40}>40 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>

        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button
            onClick={isRunning ? handlePause : handleStart}
            style={{
              flex: 1,
              padding: '0.3rem 0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid rgba(79, 195, 138, 0.3)',
              borderRadius: '0.25rem',
              color: '#4fc38a',
              fontSize: '0.7rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(79, 195, 138, 0.1)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>

          <button
            onClick={handleComplete}
            style={{
              flex: 1,
              padding: '0.3rem 0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid rgba(79, 195, 138, 0.3)',
              borderRadius: '0.25rem',
              color: '#4fc38a',
              fontSize: '0.7rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(79, 195, 138, 0.1)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
});

export default TimerCard; 