import React, { useState, useEffect } from 'react';
import { StudyNote, NoteType } from '../../../types/study';
import SupabaseStudyService from '../../../services/SupabaseStudyService';
import NotesList from './NotesList';
import NoteForm from './NoteForm';
import FullNotesEditor from './FullNotesEditor';
import { formatDate, formatShortDateWithYear } from '../../../utils/dateUtils';

// Import the manager type from SidePanel
interface MinimizedNotesManager {
  setMinimizedNote(athroId: string, sessionId: string | null, note: StudyNote | null): void;
  clearMinimizedNote(athroId: string, sessionId: string | null): void;
  getMinimizedNote(athroId: string, sessionId: string | null): any;
  subscribe(callback: (key: string, state: any) => void): () => void;
}

interface NotesModuleProps {
  athroId: string;
  subject: string;
  sessionId?: string | null;
  minimizedNotesManager?: MinimizedNotesManager;
}

export enum NotesView {
  LIST = 'list',
  CREATE = 'create',
  EDIT = 'edit',
  VIEW = 'view',
  FULL_EDITOR = 'full_editor'
}

type NotesMode = 'quick' | 'full';

// Utility function to strip HTML tags and get clean text
const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const NotesModule: React.FC<NotesModuleProps> = ({
  athroId,
  subject,
  sessionId,
  minimizedNotesManager
}) => {
  const [quickNotes, setQuickNotes] = useState<StudyNote[]>([]);
  const [fullNotes, setFullNotes] = useState<StudyNote[]>([]);
  const [currentView, setCurrentView] = useState<NotesView>(NotesView.LIST);
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notesMode, setNotesMode] = useState<NotesMode>('quick');
  const [showFullEditor, setShowFullEditor] = useState(false);
  
  // Use persistent state from manager if available, otherwise fall back to local state
  const [localIsEditorMinimized, setLocalIsEditorMinimized] = useState(false);
  const [managerMinimizedState, setManagerMinimizedState] = useState<any>(null);
  
  const isEditorMinimized = minimizedNotesManager ? 
    !!managerMinimizedState : 
    localIsEditorMinimized;
  
  // Restore minimized state on component mount or when athroId/sessionId changes
  useEffect(() => {
    console.log('[NotesModule] Checking for minimized note to restore...', {
      athroId,
      sessionId,
      hasManager: !!minimizedNotesManager
    });
    
    if (minimizedNotesManager) {
      const minimizedNote = minimizedNotesManager.getMinimizedNote(athroId, sessionId || null);
      console.log('[NotesModule] Retrieved minimized note:', minimizedNote);
      
      // Update the manager state tracker
      setManagerMinimizedState(minimizedNote);
      
      if (minimizedNote && minimizedNote.note) {
        console.log('[NotesModule] Restoring minimized note:', minimizedNote);
        // Restore the selected note and switch to full mode
        setSelectedNote(minimizedNote.note);
        setNotesMode('full');
        setShowFullEditor(false); // Keep editor closed but minimized card visible
      }
    }
  }, [athroId, sessionId, minimizedNotesManager]);
  
  // Subscribe to changes in the minimized notes manager
  useEffect(() => {
    if (minimizedNotesManager) {
      const unsubscribe = minimizedNotesManager.subscribe((key, state) => {
        const currentKey = `${athroId}_${sessionId || 'no-session'}`;
        if (key === currentKey) {
          console.log('[NotesModule] Manager state changed:', { key, state });
          setManagerMinimizedState(state);
        }
      });
      
      return unsubscribe;
    }
  }, [athroId, sessionId, minimizedNotesManager]);
  
  // Get current notes based on mode
  const getCurrentNotes = (): StudyNote[] => {
    const currentNotes = notesMode === 'quick' ? quickNotes : fullNotes;
    console.log('[NotesModule] getCurrentNotes:', {
      notesMode,
      quickNotesCount: quickNotes.length,
      fullNotesCount: fullNotes.length,
      currentNotesCount: currentNotes.length,
      currentNotes: currentNotes
    });
    return currentNotes;
  };
  
  useEffect(() => {
    if (sessionId) {
      loadNotes();
    } else {
      setQuickNotes([]);
      setFullNotes([]);
      setLoading(false);
    }
  }, [sessionId, athroId, subject]);
  
  // Also reload when mode changes
  useEffect(() => {
    if (sessionId) {
      loadNotes();
    }
  }, [notesMode]);
  
  // Listen for session events
  useEffect(() => {
    const handleClearStudyTools = () => {
      console.log('Clearing notes due to session change');
      setQuickNotes([]);
      setFullNotes([]);
      setCurrentView(NotesView.LIST);
      setSelectedNote(null);
    };

    const handleLoadSessionTools = async (e: CustomEvent) => {
      console.log('Loading notes for session:', e.detail);
      const { sessionId: loadSessionId, athroId: loadAthroId, notes: noteIds } = e.detail || {};
      
      if (loadSessionId && loadAthroId === athroId && noteIds && Array.isArray(noteIds)) {
        console.log(`[Notes] Loading ${noteIds.length} notes for session ${loadSessionId}`);
        
        try {
          // Load all notes for this session and filter by the provided IDs
          const [allQuickNotes, allFullNotes] = await Promise.all([
            SupabaseStudyService.getQuickNotes(athroId, loadSessionId),
            SupabaseStudyService.getFullNotes(athroId, loadSessionId)
          ]);
          
          // Filter to only include notes that are in the session's note list
          const filteredQuickNotes = allQuickNotes.filter(note => noteIds.includes(note.id));
          const filteredFullNotes = allFullNotes.filter(note => noteIds.includes(note.id));
          
          console.log(`[Notes] Successfully loaded ${filteredQuickNotes.length} quick notes and ${filteredFullNotes.length} full notes`);
          setQuickNotes(filteredQuickNotes);
          setFullNotes(filteredFullNotes);
          
          // Reset view state
          setCurrentView(NotesView.LIST);
          setSelectedNote(null);
          
        } catch (error) {
          console.error('[Notes] Error loading session notes:', error);
        }
      }
    };

    window.addEventListener('clearStudyTools', handleClearStudyTools);
    window.addEventListener('loadSessionTools', handleLoadSessionTools as unknown as EventListener);

    return () => {
      window.removeEventListener('clearStudyTools', handleClearStudyTools);
      window.removeEventListener('loadSessionTools', handleLoadSessionTools as unknown as EventListener);
    };
  }, [athroId]);
  
  const loadNotes = async () => {
    if (!sessionId) {
      console.log('[NotesModule] No sessionId provided, skipping load');
      return;
    }
    
    try {
      setLoading(true);
      // Use 'temp-session' for pending sessions to load any previously created notes
      const effectiveSessionId = sessionId === 'pending-session' ? 'temp-session' : sessionId;
      
      console.log('[NotesModule] Loading notes for:', {
        sessionId,
        effectiveSessionId,
        athroId,
        subject,
        notesMode
      });
      
      // Load both QuickNotes and FullNotes
      const [fetchedQuickNotes, fetchedFullNotes] = await Promise.all([
        SupabaseStudyService.getQuickNotes(athroId, effectiveSessionId),
        SupabaseStudyService.getFullNotes(athroId, effectiveSessionId)
      ]);
      
      console.log('[NotesModule] Loaded notes:', {
        quickNotes: fetchedQuickNotes.length,
        fullNotes: fetchedFullNotes.length,
        quickNotesData: fetchedQuickNotes,
        fullNotesData: fetchedFullNotes
      });
      
      setQuickNotes(fetchedQuickNotes);
      setFullNotes(fetchedFullNotes);
    } catch (error) {
      console.error('[NotesModule] Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateNote = async (data: { topic: string; content: string; tags: string[] }) => {
    console.log('[NotesModule] handleCreateNote called with:', {
      data,
      sessionId,
      athroId,
      subject,
      noteType: notesMode === 'quick' ? 'QUICK' : 'FULL',
      sessionIdType: typeof sessionId,
      sessionIdLength: sessionId?.length,
      sessionIdValid: sessionId && sessionId.trim() !== ''
    });
    
    if (!sessionId || sessionId === 'pending-session') {
      console.log('[NotesModule] Using temp-session for pending session');
      // Allow note creation with temp-session for pending sessions
    }
    
    if (!athroId || !subject) {
      console.error('[NotesModule] Missing athroId or subject:', { athroId, subject });
      // Silently return - no alert notification
      return;
    }
    
    try {
      console.log('[NotesModule] Creating note with data:', {
        athroId,
        subject,
        topic: data.topic,
        content: data.content,
        tags: data.tags,
        noteType: notesMode === 'quick' ? 'QUICK' : 'FULL',
        sessionId
      });
      
      // Use 'temp-session' for pending sessions to allow note creation
      const effectiveSessionId = (sessionId === 'pending-session' || !sessionId) ? 'temp-session' : sessionId;
      await SupabaseStudyService.createNote({
        athroId,
        subject,
        topic: data.topic,
        content: data.content,
        tags: data.tags,
        noteType: notesMode === 'quick' ? 'QUICK' : 'FULL', // Set noteType based on current mode
        reviewStatus: 'NEEDS_REVIEW' as const
      }, effectiveSessionId);
      
      console.log('[NotesModule] Note created successfully');
      
      await loadNotes();
      setCurrentView(NotesView.LIST);
    } catch (error) {
      console.error('[NotesModule] Error creating note:', error);
      console.error('[NotesModule] Full error object:', JSON.stringify(error, null, 2));
      // Silently log error - no alert notification
    }
  };
  
  const handleUpdateNote = async (id: string, data: { topic: string; content: string; tags: string[] }) => {
    try {
      await SupabaseStudyService.updateNote(id, {
        topic: data.topic,
        content: data.content,
        tags: data.tags
      });
      
      await loadNotes();
      setCurrentView(NotesView.LIST);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };
  
  const handleDeleteNote = async (id: string) => {
    try {
      if (confirm('Are you sure you want to delete this note?')) {
        await SupabaseStudyService.deleteNote(id);
        await loadNotes();
        // Return to list view if we deleted the currently viewed note
        if (selectedNote && selectedNote.id === id) {
          setSelectedNote(null);
          setCurrentView(NotesView.LIST);
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };
  
  const handleEditNote = (note: StudyNote) => {
    setSelectedNote(note);
    if (notesMode === 'full') {
      setShowFullEditor(true);
    } else {
      setCurrentView(NotesView.EDIT);
    }
  };
  
  const handleViewNote = (note: StudyNote) => {
    setSelectedNote(note);
    if (notesMode === 'full') {
      setShowFullEditor(true);
    } else {
      setCurrentView(NotesView.VIEW);
    }
  };
  
  const renderContent = () => {
    if (loading) {
      return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }
    
    switch (currentView) {
      case NotesView.CREATE:
        return (
          <NoteForm
            onSubmit={handleCreateNote}
            onCancel={() => setCurrentView(NotesView.LIST)}
          />
        );
        
      case NotesView.EDIT:
        return selectedNote ? (
          <NoteForm
            initialValues={{
              topic: selectedNote.topic,
              content: selectedNote.content,
              tags: selectedNote.tags || []
            }}
            onSubmit={(data: { topic: string; content: string; tags: string[] }) => handleUpdateNote(selectedNote.id, data)}
            onCancel={() => setCurrentView(NotesView.LIST)}
          />
        ) : null;
        
      case NotesView.VIEW:
        return selectedNote ? (
          <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ color: '#e4c97e', margin: 0 }}>{selectedNote.topic}</h4>
              <div>
                <button
                  onClick={() => handleEditNote(selectedNote)}
                  style={{
                    background: 'rgba(79, 195, 138, 0.1)',
                    border: '1px solid rgba(79, 195, 138, 0.5)',
                    borderRadius: '4px',
                    color: '#4fc38a',
                    cursor: 'pointer',
                    padding: '0.2rem 0.5rem',
                    marginRight: '0.5rem'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setCurrentView(NotesView.LIST)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.2rem 0.5rem'
                  }}
                >
                  Back
                </button>
              </div>
            </div>
            
            <div style={{ 
              flex: 1, 
              background: 'rgba(0, 0, 0, 0.2)', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
              color: 'white',
              lineHeight: '1.5'
            }} 
            dangerouslySetInnerHTML={{ __html: selectedNote.content }}
            />
            
            {selectedNote.tags.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem' }}>Tags:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedNote.tags.map(tag => (
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
            
            <div style={{ 
              marginTop: '1rem',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.8rem',
              textAlign: 'right'
            }}>
            </div>
          </div>
        ) : null;
        
      case NotesView.LIST:
      default:
        return (
          <NotesList
            notes={getCurrentNotes()}
            noteType={notesMode === 'quick' ? 'QUICK' : 'FULL'}
            onCreateNew={() => {
              if (notesMode === 'full') {
                setShowFullEditor(true);
                setSelectedNote(null); // Clear any selected note for new note creation
              } else {
                setCurrentView(NotesView.CREATE);
              }
            }}
            onView={handleViewNote}
            onEdit={handleEditNote}
            onDelete={handleDeleteNote}
          />
        );
    }
  };
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Notes Mode Toggle */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => {
            setNotesMode('quick');
            setCurrentView(NotesView.LIST);
            setSelectedNote(null);
            setShowFullEditor(false);
            // Clear minimized state when switching to quick mode
            if (minimizedNotesManager) {
              minimizedNotesManager.clearMinimizedNote(athroId, sessionId || null);
            } else {
              setLocalIsEditorMinimized(false);
            }
          }}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: notesMode === 'quick' ? '#4fc38a' : 'transparent',
            border: '1px solid #4fc38a',
            borderRadius: '0.5rem',
            color: notesMode === 'quick' ? '#17221c' : '#4fc38a',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}
        >
          QuickNote
        </button>
        
        <button
          onClick={() => {
            setNotesMode('full');
            setCurrentView(NotesView.LIST);
            setShowFullEditor(false);
            // Only clear selectedNote if there's no minimized note to restore
            if (minimizedNotesManager) {
              const minimizedNote = minimizedNotesManager.getMinimizedNote(athroId, sessionId || null);
              if (!minimizedNote) {
                setSelectedNote(null);
              }
            } else {
              setSelectedNote(null);
              setLocalIsEditorMinimized(false);
            }
          }}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: notesMode === 'full' ? '#4fc38a' : 'transparent',
            border: '1px solid #4fc38a',
            borderRadius: '0.5rem',
            color: notesMode === 'full' ? '#17221c' : '#4fc38a',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}
        >
          FullNote
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {notesMode === 'quick' ? (
          renderContent()
        ) : (
          // Full Notes Mode
          (() => {
            console.log('[NotesModule] Full notes mode render check:', {
              showFullEditor,
              isEditorMinimized,
              managerMinimizedState,
              selectedNote: selectedNote?.topic
            });
            return null;
          })(),
          showFullEditor ? (
            // Show Full Notes Editor when requested
            <div>Full Notes Editor will be shown here</div>
          ) : isEditorMinimized ? (
            // Show minimized editor card in sidebar
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}>
              <div 
                onClick={() => {
                  // Clear minimized state and show full editor
                  if (minimizedNotesManager) {
                    minimizedNotesManager.clearMinimizedNote(athroId, sessionId || null);
                  } else {
                    setLocalIsEditorMinimized(false);
                  }
                  setShowFullEditor(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  border: '2px solid #4fc38a',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.5)',
                  width: '100%',
                  textAlign: 'center',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.5)';
                }}
              >
                <div style={{ color: '#e4c97e', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  📄 {selectedNote?.topic || 'Untitled Note'}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                  Click to restore editor
                </div>
                <div style={{ 
                  color: 'rgba(79, 195, 138, 0.8)', 
                  fontSize: '0.8rem', 
                  marginTop: '0.5rem',
                  fontStyle: 'italic'
                }}>
                  Editor is minimized - chat is accessible
                </div>
              </div>
            </div>
          ) : (
            // Show FullNotes list by default in full mode
            renderContent()
          )
        )}
      </div>

      {/* Full Notes Editor Modal */}
      {showFullEditor && (
        <FullNotesEditor
          athroId={athroId}
          subject={subject}
          sessionId={sessionId}
          initialNote={selectedNote}
          onClose={() => {
            setShowFullEditor(false);
            setSelectedNote(null);
            // Clear minimized state when closing
            if (minimizedNotesManager) {
              minimizedNotesManager.clearMinimizedNote(athroId, sessionId || null);
            } else {
              setLocalIsEditorMinimized(false);
            }
            loadNotes(); // Refresh notes list
          }}
          onMinimize={() => {
            setShowFullEditor(false);
            // Set minimized state when minimizing
            if (minimizedNotesManager) {
              minimizedNotesManager.setMinimizedNote(athroId, sessionId || null, selectedNote);
            } else {
              setLocalIsEditorMinimized(true);
            }
          }}
        />
      )}
    </div>
  );
};

export default NotesModule;
