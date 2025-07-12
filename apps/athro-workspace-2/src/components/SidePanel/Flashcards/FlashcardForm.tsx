import React, { useState, useEffect } from 'react';
import { Flashcard } from '../../../types/study';

interface FlashcardFormProps {
  flashcard?: Flashcard;
  onSubmit: (front: string, back: string, topic: string) => void;
  onCancel: () => void;
}

const FlashcardForm: React.FC<FlashcardFormProps> = ({ 
  flashcard,
  onSubmit,
  onCancel
}) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [topic, setTopic] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  
  // Initialize form if editing an existing flashcard
  useEffect(() => {
    if (flashcard) {
      setFront(flashcard.front);
      setBack(flashcard.back);
      setTopic(flashcard.topic);
    }
  }, [flashcard]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    
    // Check if either field exceeds 200 characters
    if (front.length > 200 || back.length > 200) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    
    onSubmit(front, back, topic);
    resetForm();
  };
  
  const resetForm = () => {
    setFront('');
    setBack('');
    setTopic('');
  };
  
  // Calculate remaining characters
  const frontRemaining = 200 - front.length;
  const backRemaining = 200 - back.length;
  
  // Check if form can be submitted
  const canSubmit = front.trim() && back.trim() && frontRemaining >= 0 && backRemaining >= 0;
  
  return (
    <div style={{
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      height: '100%'
    }}>
      {showWarning && (
        <div style={{
          padding: '0.5rem',
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid #ff0000',
          borderRadius: '0.25rem',
          color: '#ff0000',
          fontSize: '0.75rem'
        }}>
          ⚠️ Character limit exceeded! Please reduce text to 200 characters or less.
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label htmlFor="topic" style={{ display: 'block', color: '#e4c97e', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
            Topic:
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic (e.g., Photosynthesis)"
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(228, 201, 126, 0.5)',
              borderRadius: '0.25rem',
              color: 'white',
              fontSize: '0.85rem'
            }}
          />
        </div>
        
        <div style={{ position: 'relative' }}>
          <label htmlFor="front" style={{ display: 'block', color: '#e4c97e', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
            Front:
          </label>
          <textarea
            id="front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter front of flashcard (e.g., What is photosynthesis?)"
            rows={2}
            style={{
              width: '100%',
              padding: '0.5rem',
              paddingBottom: '1.5rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: frontRemaining < 0 ? '1px solid #ff0000' : '1px solid rgba(228, 201, 126, 0.5)',
              borderRadius: '0.25rem',
              color: 'white',
              resize: 'vertical',
              fontSize: '0.85rem'
            }}
            required
          />
          <div style={{
            position: 'absolute',
            bottom: '0.4rem',
            right: '0.5rem',
            fontSize: '0.7rem',
            color: frontRemaining < 0 ? '#ff0000' : frontRemaining <= 20 ? '#ffaa00' : '#888',
            fontWeight: 'bold'
          }}>
            {frontRemaining}/200
          </div>
        </div>
        
        <div style={{ position: 'relative', marginTop: '-0.25rem' }}>
          <label htmlFor="back" style={{ display: 'block', color: '#e4c97e', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
            Back:
          </label>
          <textarea
            id="back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Enter back of flashcard (e.g., The process by which plants..."
            rows={2}
            style={{
              width: '100%',
              padding: '0.5rem',
              paddingBottom: '1.5rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: backRemaining < 0 ? '1px solid #ff0000' : '1px solid rgba(228, 201, 126, 0.5)',
              borderRadius: '0.25rem',
              color: 'white',
              resize: 'vertical',
              fontSize: '0.85rem'
            }}
            required
          />
          <div style={{
            position: 'absolute',
            bottom: '0.4rem',
            right: '0.5rem',
            fontSize: '0.7rem',
            color: backRemaining < 0 ? '#ff0000' : backRemaining <= 20 ? '#ffaa00' : '#888',
            fontWeight: 'bold'
          }}>
            {backRemaining}/200
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          marginTop: '0.5rem',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #4fc38a',
              borderRadius: '0.25rem',
              color: '#4fc38a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.8rem'
            }}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '0.5rem 1rem',
              background: canSubmit ? '#4fc38a' : '#666',
              border: 'none',
              borderRadius: '0.25rem',
              color: canSubmit ? '#17221c' : '#999',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              fontSize: '0.8rem'
            }}
          >
            {flashcard ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FlashcardForm;
