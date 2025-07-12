import React, { useState } from 'react';
import Modal from '../common/Modal';

interface SaveStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  defaultTitle?: string;
  athroName: string;
}

const SaveStudyModal: React.FC<SaveStudyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultTitle,
  athroName
}) => {
  const [title, setTitle] = useState(defaultTitle || `Study Session with ${athroName}`);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your study session');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(title.trim());
      onClose();
    } catch (error) {
      console.error('Error saving study session:', error);
      alert('Failed to save study session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Study Session"
      maxWidth="500px"
    >
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="study-title"
            style={{
              display: 'block',
              color: '#e4c97e',
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            Name your study session:
          </label>
          <input
            id="study-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Study Session with ${athroName}`}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(22, 34, 28, 0.7)',
              border: '2px solid #4fc38a',
              borderRadius: '0.5rem',
              color: '#e4c97e',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'flex-end',
          marginTop: '2rem'
        }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid #666',
              borderRadius: '0.5rem',
              color: '#666',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              background: isSaving || !title.trim() ? '#666' : '#4fc38a',
              border: 'none',
              borderRadius: '0.5rem',
              color: isSaving || !title.trim() ? '#999' : '#17221c',
              cursor: isSaving || !title.trim() ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {isSaving ? 'Saving...' : 'Save Session'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveStudyModal; 