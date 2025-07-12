import React from 'react';
import { StudyNote, NoteType } from '../../../types/study';
import { formatShortDateWithYear, formatDate } from '../../../utils/dateUtils';

interface NotesListProps {
  notes: StudyNote[];
  noteType: NoteType;
  onCreateNew: () => void;
  onView: (note: StudyNote) => void;
  onEdit: (note: StudyNote) => void;
  onDelete: (id: string) => void;
}

// Utility function to strip HTML tags and get clean text
const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const NotesList: React.FC<NotesListProps> = ({
  notes,
  noteType,
  onCreateNew,
  onView,
  onEdit,
  onDelete
}) => {
  
  const renderNote = (note: StudyNote) => {
    // Strip HTML and get a preview of the content (first 100 characters)
    const cleanContent = stripHtml(note.content);
    const contentPreview = cleanContent.length > 100
      ? cleanContent.substring(0, 100) + '...'
      : cleanContent;
      
    // Get review status color
    const getStatusColor = () => {
      switch (note.reviewStatus) {
        case 'MASTERED':
          return '#4fc38a';
        case 'REVIEWED':
          return '#e4c97e';
        case 'NEEDS_REVIEW':
          return '#e77373';
        default:
          return 'rgba(255, 255, 255, 0.5)';
      }
    };

    // Use standard date formatting like Resources (dd/mm/yy format)
    const formatSafeDate = (timestamp: any) => {
      if (!timestamp || timestamp === 0) {
        return 'No date';
      }
      
      try {
        let validTimestamp;
        
        // Handle different timestamp formats
        if (typeof timestamp === 'string') {
          validTimestamp = new Date(timestamp).getTime();
        } else if (typeof timestamp === 'number') {
          // Check if it's in seconds (Unix timestamp) or milliseconds
          // If less than year 2001 in milliseconds, it's probably in seconds
          if (timestamp < 978307200000) {
            validTimestamp = timestamp * 1000;
          } else {
            validTimestamp = timestamp;
          }
        } else {
          return 'No date';
        }
        
        // Check if date is valid
        if (isNaN(validTimestamp)) {
          return 'No date';
        }
        
        // Use the same format as Resources (dd/mm/yy)
        return formatDate(validTimestamp);
      } catch (error) {
        console.error('Date formatting error:', error, 'for timestamp:', timestamp);
        return 'No date';
      }
    };

    return (
      <div 
        key={note.id}
        onClick={() => onView(note)}
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(79, 195, 138, 0.5)',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem',
          cursor: 'pointer',
          transition: 'background 0.2s ease'
        }}
      >
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div 
            style={{ 
              color: '#e4c97e', 
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={() => onView(note)}
          >
            {note.topic || 'Untitled Note'}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          </div>
        </div>
        
        <div 
          style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '0.5rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
          onClick={() => onView(note)}
        >
          {contentPreview}
        </div>
        
        {note.tags.length > 0 && (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.3rem',
            marginBottom: '0.5rem'
          }}>
            {note.tags.map(tag => (
              <span
                key={tag}
                style={{
                  background: 'rgba(79, 195, 138, 0.1)',
                  color: '#4fc38a',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.5rem'
        }}>
          <div style={{ 
            display: 'flex',
            gap: '0.5rem' 
          }}>
            <button
              onClick={() => onEdit(note)}
              style={{
                padding: '0.2rem 0.5rem',
                background: 'rgba(79, 195, 138, 0.1)',
                border: '1px solid #4fc38a',
                borderRadius: '4px',
                color: '#4fc38a',
                cursor: 'pointer',
                fontSize: '0.7rem'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(note.id)}
              style={{
                padding: '0.2rem 0.5rem',
                background: 'rgba(231, 115, 115, 0.1)',
                border: '1px solid #e77373',
                borderRadius: '4px',
                color: '#e77373',
                cursor: 'pointer',
                fontSize: '0.7rem'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  console.log('[NotesList] Rendering with:', {
    noteType,
    notesCount: notes.length,
    notes: notes
  });

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, color: '#e4c97e' }}>{noteType === 'QUICK' ? 'QuickNote' : 'FullNote'}</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => onCreateNew()}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(79, 195, 138, 0.1)',
              border: '1px solid #4fc38a',
              borderRadius: '0.5rem',
              color: '#4fc38a',
              cursor: 'pointer'
            }}
          >
            New Note
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notes.length === 0 ? (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
            fontStyle: 'italic'
          }}>
            No notes created yet.
          </div>
        ) : (
          notes.map(note => renderNote(note))
        )}
      </div>
    </div>
  );
};

export default NotesList;
