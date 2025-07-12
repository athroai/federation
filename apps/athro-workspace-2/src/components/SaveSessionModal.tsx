import React, { useState } from 'react';
import Modal from './common/Modal';

interface SaveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionName: string) => void;
  athroName: string;
  messageCount: number;
  resourceCount: number;
  flashcardCount: number;
  noteCount: number;
  mindMapCount: number;
}

const SaveSessionModal: React.FC<SaveSessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  athroName,
  messageCount,
  resourceCount,
  flashcardCount,
  noteCount,
  mindMapCount
}) => {
  const [sessionName, setSessionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate default session name
  const defaultSessionName = `${athroName} Session - ${new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  React.useEffect(() => {
    if (isOpen) {
      setSessionName(defaultSessionName);
    }
  }, [isOpen, defaultSessionName]);

  const handleSave = async () => {
    if (!sessionName.trim()) {
      alert('Please enter a session name.');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(sessionName.trim());
      onClose();
      setSessionName('');
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setSessionName('');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Save Session">
      <div style={{
        background: 'rgba(0, 0, 0, 0.9)',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        border: '2px solid rgba(79, 195, 138, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            color: '#4fc38a',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            margin: '0 0 0.5rem 0'
          }}>
            💾 Save Session
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Give your study session a memorable name
          </p>
        </div>

        {/* Session Summary */}
        <div style={{
          background: 'rgba(79, 195, 138, 0.1)',
          border: '1px solid rgba(79, 195, 138, 0.3)',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            color: '#4fc38a',
            fontSize: '1rem',
            margin: '0 0 0.75rem 0'
          }}>
            Session Contents:
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            <div>💬 {messageCount} messages</div>
            <div>📁 {resourceCount} resources</div>
            <div>🗂️ {flashcardCount} flashcards</div>
            <div>📝 {noteCount} notes</div>
            <div>🧠 {mindMapCount} mind maps</div>
          </div>
        </div>

        {/* Session Name Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            color: '#4fc38a',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            Session Name:
          </label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter a name for this session..."
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '2px solid rgba(79, 195, 138, 0.3)',
              background: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4fc38a';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(79, 195, 138, 0.3)';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={isLoading || !sessionName.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '2px solid #4fc38a',
              background: '#4fc38a',
              color: 'black',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              cursor: (isLoading || !sessionName.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (isLoading || !sessionName.trim()) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading && sessionName.trim()) {
                e.currentTarget.style.background = '#45b37a';
                e.currentTarget.style.borderColor = '#45b37a';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && sessionName.trim()) {
                e.currentTarget.style.background = '#4fc38a';
                e.currentTarget.style.borderColor = '#4fc38a';
              }
            }}
          >
            {isLoading ? 'Saving...' : 'Save Session'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveSessionModal; 