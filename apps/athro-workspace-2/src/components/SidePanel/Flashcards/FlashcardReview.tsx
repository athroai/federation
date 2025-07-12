import React, { useState, useEffect, useRef } from 'react';
import { Flashcard, FlashcardDifficulty, ReviewInterval } from '../../../types/study';

interface FlashcardReviewProps {
  flashcards: Flashcard[];
  onComplete: (id: string, difficulty: FlashcardDifficulty, interval?: ReviewInterval, deleted?: boolean, saved?: boolean) => void;
  onFinish: () => void;
}

const FlashcardReview: React.FC<FlashcardReviewProps> = ({ 
  flashcards,
  onComplete, 
  onFinish 
}) => {
  // For debugging
  console.log('FlashcardReview loaded with', flashcards.length, 'cards');
  
  // Helper function to get color by difficulty
  const getDifficultyColor = (difficulty: FlashcardDifficulty | null | undefined): string => {
    switch (difficulty) {
      case 'EASY': return '#4fc38a';
      case 'MEDIUM': return '#e4c97e';
      case 'HARD': return '#e77373';
      case 'UNRATED': return '#ffffff';
      case null:
      case undefined:
      default: return 'rgba(255,255,255,0.7)';
    }
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewingCards, setReviewingCards] = useState<Flashcard[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<FlashcardDifficulty | null>(null);
  const [showNoOptions, setShowNoOptions] = useState(false);
  const hasShuffled = useRef(false);
  
  useEffect(() => {
    if (!hasShuffled.current && reviewingCards.length === 0 && flashcards.length > 0) {
      setReviewingCards([...flashcards]);
      setCurrentIndex(0);
      setFlipped(false);
      hasShuffled.current = true;
    }
  }, [flashcards, reviewingCards.length]);
  
  const handleFlip = () => {
    setFlipped(!flipped);
  };
  
  const handleDifficultySelect = (difficulty: FlashcardDifficulty) => {
    if (currentIndex < reviewingCards.length) {
      setSelectedDifficulty(difficulty);
      setShowNoOptions(true); // Go directly to Save/Delete options
    }
  };

  const handleSaveCard = () => {
    if (currentIndex < reviewingCards.length && selectedDifficulty) {
      const currentCard = reviewingCards[currentIndex];
      console.log('Saving card:', currentCard.id);
      
      // Mark as saved (no review interval, special saved flag)
      onComplete(currentCard.id, selectedDifficulty, undefined, false, true);
      moveToNextCard();
    }
  };

  const handleDeleteCard = () => {
    if (currentIndex < reviewingCards.length && selectedDifficulty) {
      const currentCard = reviewingCards[currentIndex];
      console.log('Deleting card:', currentCard.id);
      
      // Mark as deleted
      onComplete(currentCard.id, selectedDifficulty, undefined, true, false);
      moveToNextCard();
    }
  };
  
  const moveToNextCard = () => {
    // Move to next card or loop back to the first if we're at the end
    if (currentIndex < reviewingCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (reviewingCards.length > 0) {
      // Loop back to start instead of exiting
      setCurrentIndex(0);
    }
    
    // Reset all states for next card
    setFlipped(false);
    setSelectedDifficulty(null);
    setShowNoOptions(false);
  };
  
  if (reviewingCards.length === 0) {
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
        <h4 style={{ color: '#e4c97e', marginBottom: '1rem' }}>No flashcards to review</h4>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
          No flashcards have been created yet. Create some flashcards to start studying.
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
          Back to Flashcards
        </button>
      </div>
    );
  }
  
  const currentCard = reviewingCards[currentIndex];
  const progress = `${currentIndex + 1} / ${reviewingCards.length}`;
  
  return (
    <div style={{ 
      padding: '1rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      <div 
        onClick={handleFlip}
        style={{
          height: '270px',
          width: '95%',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(228, 201, 126, 0.5)',
          borderRadius: '0.5rem',
          padding: '2rem',
          cursor: 'pointer',
          position: 'relative',
          perspective: '1000px'
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s ease',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#e4c97e', marginBottom: '1rem' }}>
              {currentCard.topic || 'Untitled Topic'}
            </div>
            <div style={{ fontSize: '0.824rem', color: 'white', textAlign: 'center' }}>
              {currentCard.front}
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: '1rem', 
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem'
            }}>
              Click to reveal answer
            </div>
          </div>
          
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#e4c97e', marginBottom: '1rem' }}>
              Answer:
            </div>
            <div style={{ fontSize: '0.824rem', color: 'white', textAlign: 'center' }}>
              {currentCard.back}
            </div>
          </div>
        </div>
      </div>
      
      {/* Difficulty selection buttons */}
      {flipped && !showNoOptions && (
        <div style={{ 
          marginTop: '1rem',
          display: 'flex',
          gap: '0.25rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => handleDifficultySelect('HARD')}
            style={{
              padding: '0.4rem 0.6rem',
              background: 'rgba(231, 115, 115, 0.2)',
              border: '1px solid #e77373',
              borderRadius: '0.25rem',
              color: '#e77373',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '80px',
              fontSize: '0.75rem'
            }}
          >
            Hard
          </button>
          
          <button
            onClick={() => handleDifficultySelect('MEDIUM')}
            style={{
              padding: '0.4rem 0.6rem',
              background: 'rgba(228, 201, 126, 0.2)',
              border: '1px solid #e4c97e',
              borderRadius: '0.25rem',
              color: '#e4c97e',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '80px',
              fontSize: '0.75rem'
            }}
          >
            Medium
          </button>
          
          <button
            onClick={() => handleDifficultySelect('EASY')}
            style={{
              padding: '0.4rem 0.6rem',
              background: 'rgba(79, 195, 138, 0.2)',
              border: '1px solid #4fc38a',
              borderRadius: '0.25rem',
              color: '#4fc38a',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '80px',
              fontSize: '0.75rem'
            }}
          >
            Easy
          </button>
          
          <button
            onClick={() => handleDifficultySelect('FINISHED')}
            style={{
              padding: '0.4rem 0.6rem',
              background: 'rgba(138, 138, 138, 0.2)',
              border: '1px solid #8a8a8a',
              borderRadius: '0.25rem',
              color: '#8a8a8a',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '80px',
              fontSize: '0.75rem'
            }}
          >
            Finished
          </button>
        </div>
      )}
      
      {/* Save/Delete options */}
      {showNoOptions && (
        <div style={{ 
          marginTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          
          <div style={{ 
            display: 'flex',
            gap: '0.5rem'
          }}>
            <button
              onClick={handleDeleteCard}
              style={{
                padding: '0.4rem 0.8rem',
                background: 'rgba(231, 115, 115, 0.3)',
                border: '1px solid #e77373',
                borderRadius: '0.25rem',
                color: '#e77373',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }}
            >
              Delete
            </button>
            
            <button
              onClick={handleSaveCard}
              style={{
                padding: '0.4rem 0.8rem',
                background: 'rgba(228, 201, 126, 0.2)',
                border: '1px solid #e4c97e',
                borderRadius: '0.25rem',
                color: '#e4c97e',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardReview;
