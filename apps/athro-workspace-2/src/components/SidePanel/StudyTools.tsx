import React from 'react';

interface StudyToolsProps {
  onOpenFlashcards: () => void;
  onCreateNote: () => void;
  onOpenMindMap: () => void;
  onCreateQuiz: () => void;
  onCreateStudyPlan: () => void;
}

const StudyTools: React.FC<StudyToolsProps> = ({
  onOpenFlashcards,
  onCreateNote,
  onOpenMindMap,
  onCreateQuiz,
  onCreateStudyPlan
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <button
        onClick={onOpenFlashcards}
        style={{
          padding: '0.75rem',
          background: 'rgba(79, 195, 138, 0.1)',
          border: '1px solid #4fc38a',
          borderRadius: '0.5rem',
          color: '#4fc38a',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease'
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Flashcard Stack Icon */}
          <div style={{
            width: '18px',
            height: '18px',
            position: 'relative'
          }}>
            {/* Back card */}
            <div style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '14px',
              height: '10px',
              border: '2px solid currentColor',
              borderRadius: '3px',
              background: 'transparent'
            }} />
            {/* Front card */}
            <div style={{
              position: 'absolute',
              top: '0px',
              left: '0px',
              width: '14px',
              height: '10px',
              border: '2px solid currentColor',
              borderRadius: '3px',
              background: 'transparent'
            }}>
              {/* Card divider line */}
              <div style={{
                position: 'absolute',
                top: '3px',
                left: '2px',
                right: '2px',
                height: '1px',
                background: 'currentColor'
              }} />
            </div>
          </div>
          Flashcards
        </h3>
        <p style={{ margin: 0, color: '#b5cbb2', fontSize: '0.9rem' }}>
          Create and study with digital flashcards
        </p>
      </button>

      <button
        onClick={onCreateNote}
        style={{
          padding: '0.75rem',
          background: 'rgba(79, 195, 138, 0.1)',
          border: '1px solid #4fc38a',
          borderRadius: '0.5rem',
          color: '#4fc38a',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease'
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Note/Paper Icon */}
          <div style={{
            width: '18px',
            height: '18px',
            position: 'relative'
          }}>
            {/* Note paper */}
            <div style={{
              position: 'absolute',
              top: '1px',
              left: '2px',
              width: '12px',
              height: '16px',
              border: '2px solid currentColor',
              borderRadius: '2px',
              background: 'transparent'
            }}>
              {/* Note lines */}
              <div style={{
                position: 'absolute',
                top: '3px',
                left: '2px',
                right: '2px',
                height: '1px',
                background: 'currentColor'
              }} />
              <div style={{
                position: 'absolute',
                top: '6px',
                left: '2px',
                right: '2px',
                height: '1px',
                background: 'currentColor'
              }} />
              <div style={{
                position: 'absolute',
                top: '9px',
                left: '2px',
                right: '2px',
                height: '1px',
                background: 'currentColor'
              }} />
            </div>
            {/* Pen/pencil */}
            <div style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              width: '2px',
              height: '8px',
              background: 'currentColor',
              borderRadius: '1px',
              transform: 'rotate(45deg)',
              transformOrigin: 'bottom'
            }} />
          </div>
          Study Notes
        </h3>
        <p style={{ margin: 0, color: '#b5cbb2', fontSize: '0.9rem' }}>
          Create and organize study notes
        </p>
      </button>

      <button
        onClick={onOpenMindMap}
        style={{
          padding: '0.75rem',
          background: 'rgba(79, 195, 138, 0.1)',
          border: '1px solid #4fc38a',
          borderRadius: '0.5rem',
          color: '#4fc38a',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease'
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Mind Map Network Icon */}
          <div style={{
            width: '18px',
            height: '18px',
            position: 'relative'
          }}>
            {/* Central node */}
            <div style={{
              position: 'absolute',
              top: '7px',
              left: '7px',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'currentColor'
            }} />
            {/* Top node */}
            <div style={{
              position: 'absolute',
              top: '1px',
              left: '7px',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'currentColor'
            }} />
            {/* Bottom node */}
            <div style={{
              position: 'absolute',
              top: '13px',
              left: '7px',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'currentColor'
            }} />
            {/* Left node */}
            <div style={{
              position: 'absolute',
              top: '7px',
              left: '1px',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'currentColor'
            }} />
            {/* Right node */}
            <div style={{
              position: 'absolute',
              top: '7px',
              left: '13px',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'currentColor'
            }} />
            {/* Connection lines */}
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '8.5px',
              width: '1px',
              height: '8px',
              background: 'currentColor'
            }} />
            {/* Horizontal line */}
            <div style={{
              position: 'absolute',
              top: '8.5px',
              left: '5px',
              width: '8px',
              height: '1px',
              background: 'currentColor'
            }} />
          </div>
          Mind Maps
        </h3>
        <p style={{ margin: 0, color: '#b5cbb2', fontSize: '0.9rem' }}>
          Create visual mind maps for learning
        </p>
      </button>
    </div>
  );
};

export default StudyTools;
