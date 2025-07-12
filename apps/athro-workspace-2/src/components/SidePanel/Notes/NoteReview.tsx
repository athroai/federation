import React, { useState, useEffect } from 'react';
import { StudyNote, ReviewInterval, NoteReviewStatus } from '../../../types/study';

interface NoteReviewProps {
  notes: StudyNote[];
  onComplete: (id: string, reviewStatus: NoteReviewStatus, interval?: ReviewInterval, deleted?: boolean) => void;
  onFinish: () => void;
}

const NoteReview: React.FC<NoteReviewProps> = ({
  notes,
  onComplete,
  onFinish
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealContent, setRevealContent] = useState(false);
  const [reviewingNotes, setReviewingNotes] = useState<StudyNote[]>([]);
  const [showIntervalSelect, setShowIntervalSelect] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<NoteReviewStatus | null>(null);

  useEffect(() => {
    // Set up the notes for review
    const notesToReview = [...notes];
    setReviewingNotes(notesToReview);
    setCurrentIndex(0);
    setRevealContent(false);
  }, [notes]);

  const currentNote = reviewingNotes[currentIndex] || { 
    id: '', topic: '', content: '', tags: [], createdAt: 0, updatedAt: 0, 
    reviewStatus: 'NEEDS_REVIEW', athroId: '', subject: '' 
  };

  const progress = reviewingNotes.length > 0 
    ? `${currentIndex + 1} / ${reviewingNotes.length}` 
    : '0 / 0';

  const handleReveal = () => {
    setRevealContent(true);
  };

  const handleStatusSelect = (status: NoteReviewStatus) => {
    if (currentIndex < reviewingNotes.length) {
      setSelectedStatus(status);
      setShowIntervalSelect(true);
    }
  };

  const handleIntervalSelect = (interval?: ReviewInterval, deleted: boolean = false) => {
    if (currentIndex < reviewingNotes.length && (selectedStatus || deleted)) {
      const currentNote = reviewingNotes[currentIndex];
      
      console.log('Handling interval selection:', {
        noteId: currentNote.id,
        status: selectedStatus || currentNote.reviewStatus,
        interval,
        deleted
      });
      
      // Complete the review with the selected status and interval
      onComplete(
        currentNote.id, 
        selectedStatus || currentNote.reviewStatus, 
        interval,
        deleted
      );
      
      moveToNextNote();
    } else {
      console.error('Cannot handle interval selection', {
        currentIndex,
        reviewingNotesLength: reviewingNotes.length,
        selectedStatus
      });
    }
  };
  
  const moveToNextNote = () => {
    // Move to next note or loop back to the first if we're at the end
    if (currentIndex < reviewingNotes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (reviewingNotes.length > 0) {
      // Loop back to start instead of exiting
      setCurrentIndex(0);
    }
    
    // Reset states for next note
    setRevealContent(false);
    setShowIntervalSelect(false);
    setSelectedStatus(null);
  };

  if (reviewingNotes.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h4 style={{ color: '#e4c97e', marginBottom: '1rem' }}>No notes to review</h4>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
          All caught up! There are no notes that need review right now.
        </p>
        <button
          onClick={onFinish}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#4fc38a',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#17221c',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Return to Notes
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1rem', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h4 style={{ color: '#e4c97e', margin: 0, textAlign: 'center', marginBottom: '1rem' }}>Review Notes</h4>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Note {progress}</div>
        <div style={{ fontSize: '0.9rem', color: '#e4c97e' }}>
          {currentNote.reviewStatus === 'NEEDS_REVIEW' ? 'Needs Review' : 
           currentNote.reviewStatus === 'REVIEWED' ? 'Reviewed' : 
           currentNote.reviewStatus === 'MASTERED' ? 'Mastered' : ''}
        </div>
      </div>
      
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(228, 201, 126, 0.5)',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        marginBottom: '1rem',
        position: 'relative',
      }}>
        <h3 style={{ color: '#e4c97e', margin: '0 0 1rem 0' }}>
          {currentNote.topic}
        </h3>
        
        {!revealContent ? (
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer'
          }} onClick={handleReveal}>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '1rem'
            }}>
              Click to reveal content
            </div>
            <button
              style={{
                padding: '0.5rem 1.5rem',
                background: 'rgba(79, 195, 138, 0.2)',
                border: '1px solid #4fc38a',
                borderRadius: '0.5rem',
                color: '#4fc38a',
                cursor: 'pointer'
              }}
            >
              Show Content
            </button>
          </div>
        ) : (
          <div style={{ 
            flex: 1,
            color: 'white',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            lineHeight: '1.5'
          }}>
            {currentNote.content}
          </div>
        )}
        
        {currentNote.tags.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {currentNote.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    background: 'rgba(79, 195, 138, 0.1)',
                    color: '#4fc38a',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Status selection buttons */}
      {revealContent && !showIntervalSelect && (
        <div style={{ 
          marginTop: '1rem',
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => handleStatusSelect('NEEDS_REVIEW')}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(231, 115, 115, 0.2)',
              border: '1px solid #e77373',
              borderRadius: '0.5rem',
              color: '#e77373',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '150px'
            }}
          >
            Need More Review
          </button>
          
          <button
            onClick={() => handleStatusSelect('REVIEWED')}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(228, 201, 126, 0.2)',
              border: '1px solid #e4c97e',
              borderRadius: '0.5rem',
              color: '#e4c97e',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '150px'
            }}
          >
            Reviewed
          </button>
          
          <button
            onClick={() => handleStatusSelect('MASTERED')}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(79, 195, 138, 0.2)',
              border: '1px solid #4fc38a',
              borderRadius: '0.5rem',
              color: '#4fc38a',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '150px'
            }}
          >
            Mastered
          </button>
        </div>
      )}
      
      {/* Interval selection */}
      {showIntervalSelect && (
        <div style={{ 
          marginTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ 
            textAlign: 'center', 
            color: selectedStatus === 'MASTERED' ? '#4fc38a' : 
                  selectedStatus === 'REVIEWED' ? '#e4c97e' : 
                  selectedStatus === 'NEEDS_REVIEW' ? '#e77373' : '#ffffff',
            marginBottom: '0.5rem',
            fontSize: '1rem'
          }}>
            When do you want to review this note again?
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem'
          }}>
            <button
              onClick={() => handleIntervalSelect('1_DAY')}
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.5rem',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Tomorrow
            </button>
            
            <button
              onClick={() => handleIntervalSelect('2_DAYS')}
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.5rem',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              In 2 Days
            </button>
            
            <button
              onClick={() => handleIntervalSelect('1_WEEK')}
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.5rem',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Next Week
            </button>
            
            <button
              onClick={() => handleIntervalSelect('1_MONTH')}
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.5rem',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Next Month
            </button>
            
            <button
              onClick={() => {
                // Mark as deleted but maintain in history
                if (confirm('Are you sure you want to DELETE this note? It will be permanently removed.')) {
                  const currentNote = reviewingNotes[currentIndex];
                  console.log('Deleting note:', currentNote);
                  // Set the last parameter to true to indicate deletion
                  onComplete(currentNote.id, currentNote.reviewStatus, undefined, true);
                }
              }}
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(231, 115, 115, 0.3)',
                border: '2px solid #e77373',
                borderRadius: '0.5rem',
                color: '#e77373',
                cursor: 'pointer',
                gridColumn: '1 / span 2',
                fontWeight: 'bold',
                marginTop: '0.5rem'
              }}
            >
              DELETE THIS NOTE
            </button>
          </div>
        </div>
      )}
      
      <button
        onClick={onFinish}
        style={{
          marginTop: '1rem',
          padding: '0.5rem',
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '0.5rem',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Exit Review
      </button>
    </div>
  );
};

export default NoteReview;
