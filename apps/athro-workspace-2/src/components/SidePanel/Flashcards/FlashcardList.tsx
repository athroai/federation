import React, { useState, useEffect } from 'react';
import { Flashcard, FlashcardDifficulty } from '../../../types/study';

interface FlashcardListProps {
  flashcards: Flashcard[];
  onCreateNew: () => void;
  onStartReview: (flashcard?: Flashcard) => void;
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (id: string) => void;
}

const FlashcardList: React.FC<FlashcardListProps> = ({
  flashcards,
  onCreateNew,
  onStartReview,
  onEdit,
  onDelete
}) => {
  // Helper function to check if a card needs review (unrated or null/undefined difficulty)
  const needsReview = (card: Flashcard): boolean => {
    return card.difficulty === 'UNRATED' || 
           card.difficulty === null || 
           card.difficulty === undefined || 
           !card.difficulty;
  };
  // Helper function to get background color based on difficulty
  const getBackgroundByDifficulty = (difficulty: FlashcardDifficulty | null | undefined): string => {
    switch (difficulty) {
      case 'EASY':
        return 'rgba(79, 195, 138, 0.2)'; // Green background for easy
      case 'MEDIUM':
        return 'rgba(228, 201, 126, 0.2)'; // Gold/yellow background for medium
      case 'HARD':
        return 'rgba(231, 115, 115, 0.2)'; // Red background for hard
      case 'FINISHED':
        return 'rgba(138, 138, 138, 0.2)'; // Gray background for finished
      case 'UNRATED':
        return 'rgba(0, 0, 0, 0.3)'; // Default dark background for unrated
      case null:
      case undefined:
      default:
        return 'rgba(0, 0, 0, 0.3)'; // Default dark background
    }
  };
  // Helper function to render individual flashcard
  const renderFlashcard = (card: Flashcard) => (
    <div 
      key={card.id}
      style={{
        padding: '0.5rem',
        background: getBackgroundByDifficulty(card.difficulty), // Use difficulty-based background
        border: getBorderByDifficulty(card.difficulty),
        borderRadius: '0.25rem',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <div style={{ color: '#e4c97e', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {card.topic || 'Untitled Topic'}
        </div>
        {/* Always show creation date */}
        <div style={{ 
          fontSize: '0.65rem', 
          color: 'rgba(255, 255, 255, 0.4)' 
        }}>
        </div>
      </div>
      
      <div style={{ 
        fontSize: '0.75rem', 
        color: 'white', 
        marginBottom: '0.25rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {card.front}
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '0.25rem', 
        fontSize: '0.7rem'
      }}>
        <button
          onClick={() => onStartReview(card)}
          style={{
            padding: '0.2rem 0.4rem',
            background: 'rgba(79, 195, 138, 0.2)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontSize: '0.7rem'
          }}
        >
          Review
        </button>
        
        <button
          onClick={() => onEdit(card)}
          style={{
            padding: '0.2rem 0.4rem',
            background: 'rgba(228, 201, 126, 0.2)',
            border: '1px solid #e4c97e',
            borderRadius: '0.25rem',
            color: '#e4c97e',
            cursor: 'pointer',
            fontSize: '0.7rem'
          }}
        >
          Edit
        </button>
        
        <button
          onClick={() => onDelete(card.id)}
          style={{
            padding: '0.2rem 0.4rem',
            background: 'rgba(231, 115, 115, 0.2)',
            border: '1px solid #e77373',
            borderRadius: '0.25rem',
            color: '#e77373',
            cursor: 'pointer',
            fontSize: '0.7rem'
          }}
        >
          Delete
        </button>
      </div>
      
      {/* Show last reviewed date and difficulty if available */}
      {card.lastReviewed && (
        <div style={{ 
          fontSize: '0.65rem', 
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: '0.25rem' 
        }}>
          {card.difficulty && `${card.difficulty}`}
        </div>
      )}
    </div>
  );

  // Helper function to get border color based on difficulty
  const getBorderByDifficulty = (difficulty: FlashcardDifficulty | null | undefined): string => {
    switch (difficulty) {
      case 'EASY':
        return '1px solid rgba(79, 195, 138, 0.5)';
      case 'MEDIUM':
        return '1px solid rgba(228, 201, 126, 0.5)';
      case 'HARD':
        return '1px solid rgba(231, 115, 115, 0.5)';
      case 'FINISHED':
        return '1px solid rgba(138, 138, 138, 0.5)';
      case 'UNRATED':
        return '1px solid rgba(255, 255, 255, 0.3)';
      case null:
      case undefined:
      default:
        // Treat null/undefined as needing review (same as UNRATED)
        return '1px solid rgba(255, 255, 255, 0.3)';
    }
  };

  // Count cards by difficulty
  // Include cards with null/undefined difficulty in unrated count (needs review)
  const unratedCount = flashcards.filter(needsReview).length;
  const hardCount = flashcards.filter(card => card.difficulty === 'HARD').length;
  const mediumCount = flashcards.filter(card => card.difficulty === 'MEDIUM').length;
  const easyCount = flashcards.filter(card => card.difficulty === 'EASY').length;
  const finishedCount = flashcards.filter(card => card.difficulty === 'FINISHED').length;
  
  // Debug logging to help track flashcard filtering
  console.log('🔍 FlashcardList Debug:', {
    totalFlashcards: flashcards.length,
    needsReview: unratedCount,
    hard: hardCount,
    medium: mediumCount,
    easy: easyCount,
    finished: finishedCount,
    flashcardDifficulties: flashcards.map(card => ({ 
      id: card.id, 
      difficulty: card.difficulty, 
      saved: card.saved,
      lastReviewed: card.lastReviewed 
    }))
  });
  
  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <button
          onClick={onCreateNew}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#4fc38a',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#17221c',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}
        >
          + New Card
        </button>
      </div>
      
      {flashcards.length === 0 ? (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          textAlign: 'center'
        }}>
          <p>You don't have any flashcards yet.</p>
          <button
            onClick={onCreateNew}
            style={{
              padding: '0.5rem 1rem',
              background: '#4fc38a',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#17221c',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              marginTop: '1rem'
            }}
          >
            Create Your First Flashcard
          </button>
        </div>
      ) : (
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem'
        }}>
          {/* Unrated/Needs Review section */}
          <div>
            <h3 style={{ color: '#e4c97e', margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Needs Review ({unratedCount})
            </h3>
            {flashcards.filter(needsReview).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {flashcards
                  .filter(needsReview)
                  .map(card => renderFlashcard(card))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontStyle: 'italic', margin: '0' }}>
                No cards need review
              </p>
            )}
          </div>
          
          {/* Hard section */}
          <div>
            <h3 style={{ color: '#e77373', margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Hard ({hardCount})
            </h3>
            {flashcards.filter(card => card.difficulty === 'HARD').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {flashcards
                  .filter(card => card.difficulty === 'HARD')
                  .map(card => renderFlashcard(card))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontStyle: 'italic', margin: '0' }}>
                No hard flashcards
              </p>
            )}
          </div>
          
          {/* Medium section */}
          <div>
            <h3 style={{ color: '#e4c97e', margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Medium ({mediumCount})
            </h3>
            {flashcards.filter(card => card.difficulty === 'MEDIUM').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {flashcards
                  .filter(card => card.difficulty === 'MEDIUM')
                  .map(card => renderFlashcard(card))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontStyle: 'italic', margin: '0' }}>
                No medium flashcards
              </p>
            )}
          </div>
          
          {/* Easy section */}
          <div>
            <h3 style={{ color: '#4fc38a', margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Easy ({easyCount})
            </h3>
            {flashcards.filter(card => card.difficulty === 'EASY').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {flashcards
                  .filter(card => card.difficulty === 'EASY')
                  .map(card => renderFlashcard(card))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontStyle: 'italic', margin: '0' }}>
                No easy flashcards
              </p>
            )}
          </div>
          
          {/* Stored/Finished section */}
          <div>
            <h3 style={{ color: '#8a8a8a', margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Stored ({finishedCount})
            </h3>
            {flashcards.filter(card => card.difficulty === 'FINISHED').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {flashcards
                  .filter(card => card.difficulty === 'FINISHED')
                  .map(card => renderFlashcard(card))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontStyle: 'italic', margin: '0' }}>
                No finished flashcards
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardList;
