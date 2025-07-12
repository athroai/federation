import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(79, 195, 138, 0.1)' : 'none',
        border: 'none',
        color: active ? '#4fc38a' : '#b5cbb2',
        padding: '0.5rem 1rem',
        borderRadius: '0.25rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: active ? 'bold' : 'normal',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(79, 195, 138, 0.05)';
        }
      }}
      onMouseOut={e => {
        if (!active) {
          e.currentTarget.style.background = 'none';
        }
      }}
    >
      {label}
    </button>
  );
};

export default TabButton;
