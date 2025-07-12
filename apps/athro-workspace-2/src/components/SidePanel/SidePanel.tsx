import React, { useState, useEffect } from 'react';
import StudyTools from './StudyTools';
import Resources from './Resources';
import FlashcardModule from './Flashcards/FlashcardModule';
import NotesModule from './Notes/NotesModule';
import MindMapList from '../MindMap/MindMapList';
import Modal from '../common/Modal';
import FinalMindMap from '../MindMap/FinalMindMap';
import SupabaseStudyService from '../../services/SupabaseStudyService';
import LanguageDropdown from './LanguageDropdown';
import TimerCard from './TimerCard';
import { useTranslation } from '../../contexts/TranslationContext';
import { StudyNote } from '../../types/study';

// Global state for minimized notes that persists across navigation
interface MinimizedNoteState {
  isMinimized: boolean;
  note: StudyNote | null;
  sessionId: string | null;
  athroId: string;
}

// Global state management for minimized notes
class MinimizedNotesManager {
  private static instance: MinimizedNotesManager;
  private listeners: Set<(key: string, state: MinimizedNoteState | null) => void> = new Set();
  private readonly STORAGE_PREFIX = 'athro_minimized_notes_';

  static getInstance(): MinimizedNotesManager {
    if (!MinimizedNotesManager.instance) {
      MinimizedNotesManager.instance = new MinimizedNotesManager();
    }
    return MinimizedNotesManager.instance;
  }

  private getKey(athroId: string, sessionId: string | null): string {
    return `${athroId}_${sessionId || 'no-session'}`;
  }

  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  setMinimizedNote(athroId: string, sessionId: string | null, note: StudyNote | null): void {
    const key = this.getKey(athroId, sessionId);
    const state: MinimizedNoteState = {
      isMinimized: true,
      note,
      sessionId,
      athroId
    };
    
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(state));
      this.notifyListeners(key, state);
    } catch (error) {
      console.error('Failed to save minimized note to localStorage:', error);
    }
  }

  clearMinimizedNote(athroId: string, sessionId: string | null): void {
    const key = this.getKey(athroId, sessionId);
    
    try {
      localStorage.removeItem(this.getStorageKey(key));
      this.notifyListeners(key, null);
    } catch (error) {
      console.error('Failed to remove minimized note from localStorage:', error);
    }
  }

  getMinimizedNote(athroId: string, sessionId: string | null): MinimizedNoteState | null {
    const key = this.getKey(athroId, sessionId);
    
    try {
      const storedData = localStorage.getItem(this.getStorageKey(key));
      if (storedData) {
        return JSON.parse(storedData) as MinimizedNoteState;
      }
    } catch (error) {
      console.error('Failed to retrieve minimized note from localStorage:', error);
    }
    
    return null;
  }

  subscribe(callback: (key: string, state: MinimizedNoteState | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(key: string, state: MinimizedNoteState | null): void {
    this.listeners.forEach(listener => listener(key, state));
  }
}

interface SidePanelProps {
  athroId: string;
  subject: string;
  sessionId?: string | null;
  isCreatingSession?: boolean;
  onUploadResource?: (file: File) => void;
  onSelectResource: (resourceId: string) => void;
  onInjectText?: (text: string) => void;
  onSendMessage?: (message: string) => void;
  onSaveSession?: () => void;
  onDeleteSession?: () => void;
  onViewHistory?: () => void;
  triggerToolOpen?: {tool: string, timestamp: number} | null;
}

const SidePanel: React.FC<SidePanelProps> = ({
  athroId,
  subject,
  sessionId,
  isCreatingSession,
  onUploadResource,
  onSelectResource,
  onInjectText,
  onSendMessage,
  onSaveSession,
  onDeleteSession,
  onViewHistory,
  triggerToolOpen,
}) => {
  const { t } = useTranslation();
  
  // Check if we're in standalone mode (port 5175)
  const isStandalone = window.location.port === '5175' && (!window.parent || window.parent === window);
  
  const [activeTab, setActiveTab] = useState<'tools' | 'resources'>(isStandalone ? 'resources' : 'tools');
  const [activeStudyTool, setActiveStudyTool] = useState<'flashcards' | 'notes' | 'mindmap' | 'resources' | null>(null);
  const [mindMapModalOpen, setMindMapModalOpen] = useState(false);
  const [selectedMindMap, setSelectedMindMap] = useState<any>(null);
  const [selectedMindMapId, setSelectedMindMapId] = useState<string | null>(null);
  const [mindMapMode, setMindMapMode] = useState<'create' | 'edit' | 'view'>('create');
  const [forceRefresh, setForceRefresh] = useState(0); // Used to force re-renders
  const [sessionOptionsOpen, setSessionOptionsOpen] = useState(false); // Track if session options are expanded - start closed by default

  // Global notes manager for passing to NotesModule
  const notesManager = MinimizedNotesManager.getInstance();
  
  // State for tracking minimized notes in the UI
  const [minimizedNoteState, setMinimizedNoteState] = useState<MinimizedNoteState | null>(null);

  // Subscribe to minimized notes changes and restore state on mount
  useEffect(() => {
    // Check if there's already a minimized note for this athro/session combination
    const currentMinimizedNote = notesManager.getMinimizedNote(athroId, sessionId || null);
    if (currentMinimizedNote) {
      setMinimizedNoteState(currentMinimizedNote);
    }

    // Subscribe to future changes
    const unsubscribe = notesManager.subscribe((key, state) => {
      const currentKey = `${athroId}_${sessionId || 'no-session'}`;
      
      if (key === currentKey) {
        setMinimizedNoteState(state);
      }
    });

    return unsubscribe;
  }, [athroId, sessionId, notesManager]);

  // Listen for mind map updates
  useEffect(() => {
    const handleMindMapSaved = () => {
      setForceRefresh(prev => prev + 1);
      
      // If we're in the mind map section, force a refresh
      if (activeStudyTool === 'mindmap') {
        window.dispatchEvent(new CustomEvent('refresh_mindmaplist', { detail: { time: Date.now() } }));
      }
    };
    
    window.addEventListener('mindmap_saved', handleMindMapSaved);
    return () => {
      window.removeEventListener('mindmap_saved', handleMindMapSaved);
    };
  }, [activeStudyTool]);

  // 🧰 TOOL OPENER: Handle tool opening requests from chat cards
  useEffect(() => {
    if (triggerToolOpen) {
      console.log(`[SidePanel] Tool opening triggered: ${triggerToolOpen.tool}`);
      
      // Always switch to tools tab first
      setActiveTab('tools');
      
      // Map tool names to internal tool types
      const toolMapping: Record<string, 'flashcards' | 'notes' | 'mindmap'> = {
        'Notes': 'notes',
        'Flashcards': 'flashcards',
        'Mind Map': 'mindmap'
      };
      
      const targetTool = toolMapping[triggerToolOpen.tool];
      if (targetTool) {
        setActiveStudyTool(targetTool);
        
        // For mind map, open the creation modal directly
        if (targetTool === 'mindmap') {
          setMindMapModalOpen(true);
          setMindMapMode('create');
        }
      }
    }
  }, [triggerToolOpen]);

  // Handler for restoring minimized note
  const handleRestoreMinimizedNote = () => {
    if (minimizedNoteState) {
      // Switch to tools tab and notes section
      setActiveTab('tools');
      setActiveStudyTool('notes');
    }
  };

  // Handler for closing minimized note
  const handleCloseMinimizedNote = () => {
    notesManager.clearMinimizedNote(athroId, sessionId || null);
  };

  // If standalone mode, only show Resources
  if (isStandalone) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '1rem'
        }}>
          <Resources
            athroId={athroId}
            subject={subject}
            sessionId={sessionId || null}
            onSelectResource={onSelectResource}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden' // Prevent the container itself from scrolling
    }}>
      {/* Main Content Area - Scrollable */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Session Management Section - Matching study tool card style */}
        <div style={{
          flexShrink: 0
        }}>
        {/* Session Options Header - Styled like study tool cards */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => setSessionOptionsOpen(!sessionOptionsOpen)}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: sessionOptionsOpen ? '#4fc38a' : 'transparent',
              border: '1px solid #4fc38a',
              borderRadius: '0.5rem',
              color: sessionOptionsOpen ? '#17221c' : '#4fc38a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            title="Click to reveal session management options"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                border: '2px solid currentColor',
                background: 'transparent',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  right: '2px',
                  height: '2px',
                  background: 'currentColor',
                  borderRadius: '1px'
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
              Save Session Options
            </span>
                          <div style={{ 
                transform: sessionOptionsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                width: '12px',
                height: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '0',
                  height: '0',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '6px solid currentColor'
                }} />
              </div>
          </button>
        </div>

        {/* Session Management Buttons - Collapsible content */}
        {sessionOptionsOpen && (
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '1rem',
            borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
            background: 'rgba(22, 34, 28, 0.3)'
      }}>
        <button
          onClick={onSaveSession}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: '#4fc38a',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#17221c',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s ease'
          }}
          title="Save current session and start a new one"
        >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid currentColor',
                  borderRadius: '2px',
                  background: 'transparent',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    left: '1px',
                    right: '1px',
                    bottom: '1px',
                    border: '1px solid currentColor',
                    borderRadius: '1px'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '4px',
                    height: '6px',
                    border: '2px solid currentColor',
                    borderTop: 'none',
                    borderRadius: '0 0 2px 2px'
                  }} />
                </div>
                Save
              </div>
        </button>
        
        <button
          onClick={() => {
            console.log('[SidePanel] Delete session button clicked');
            if (onDeleteSession) {
              console.log('[SidePanel] Calling onDeleteSession callback');
              onDeleteSession();
            } else {
              console.warn('[SidePanel] onDeleteSession callback not provided');
            }
          }}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: '#e74c3c',
            border: 'none',
            borderRadius: '0.5rem',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s ease'
          }}
          title="Delete current session and start a new one"
        >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: '14px',
                  height: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    right: '2px',
                    bottom: '0px',
                    border: '2px solid currentColor',
                    borderTop: 'none',
                    borderRadius: '0 0 3px 3px'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '0px',
                    left: '0px',
                    right: '0px',
                    height: '2px',
                    background: 'currentColor',
                    borderRadius: '1px'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '5px',
                    width: '1px',
                    height: '6px',
                    background: 'currentColor'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '5px',
                    width: '1px',
                    height: '6px',
                    background: 'currentColor'
                  }} />
                </div>
                Delete
              </div>
        </button>
        
        <button
          onClick={() => {
            if (onViewHistory) {
              onViewHistory();
            }
          }}
          style={{
            padding: '0.5rem',
            background: 'rgba(228, 201, 126, 0.2)',
            border: '1px solid #e4c97e',
            borderRadius: '0.5rem',
            color: '#e4c97e',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          title="View study history"
        >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: '14px',
                  height: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    right: '2px',
                    bottom: '0px',
                    border: '2px solid currentColor',
                    borderRadius: '2px',
                    background: 'transparent'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '4px',
                    right: '4px',
                    height: '1px',
                    background: 'currentColor'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '9px',
                    left: '4px',
                    right: '4px',
                    height: '1px',
                    background: 'currentColor'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '4px',
                    right: '4px',
                    height: '1px',
                    background: 'currentColor'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '0px',
                    left: '5px',
                    width: '4px',
                    height: '2px',
                    background: 'currentColor',
                    borderRadius: '1px 1px 0 0'
                  }} />
                </div>
                History
              </div>
        </button>
          </div>
        )}
      </div>
      
      {/* Study Tools and Resources Section - Fixed position like session options */}
      <div style={{
        flexShrink: 0,
        borderBottom: '1px solid rgba(228, 201, 126, 0.2)'
      }}>
        {/* Study Tools and Resources Buttons - Side by side */}
        <div style={{
          padding: '1rem',
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(22, 34, 28, 0.95)', // Semi-transparent background for better visibility
          borderBottom: '1px solid rgba(228, 201, 126, 0.2)'
        }}>
          <button
            onClick={() => {
              // If we're inside a study tool, return to the tool selection
              // Otherwise, just select the tools tab
              if (activeStudyTool) {
                setActiveStudyTool(null);
              } else {
                setActiveTab('tools');
              }
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: activeTab === 'tools' ? '#4fc38a' : 'transparent',
              border: '1px solid #4fc38a',
              borderRadius: '0.5rem',
              color: activeTab === 'tools' ? '#17221c' : '#4fc38a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            {activeStudyTool ? 'Study Tools' : 'Study Tools'}
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: activeTab === 'resources' ? '#4fc38a' : 'transparent',
              border: '1px solid #4fc38a',
              borderRadius: '0.5rem',
              color: activeTab === 'resources' ? '#17221c' : '#4fc38a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            Resources
          </button>
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0
      }}>


        {/* Study Tools and Resources Section */}
        <div style={{
          flexShrink: 0
        }}>



          {/* Study Tools Content - Directly beneath the buttons */}
          {activeTab === 'tools' && (
            <div style={{
              padding: activeStudyTool ? '0' : '1rem'
            }}>
              {activeStudyTool === 'flashcards' ? (
                <FlashcardModule
                  athroId={athroId}
                  subject={subject}
                  sessionId={sessionId || null}
                />
              ) : activeStudyTool === 'notes' ? (
                <NotesModule
                  athroId={athroId}
                  subject={subject}
                  sessionId={sessionId || null}
                  minimizedNotesManager={notesManager}
                />
              ) : activeStudyTool === 'mindmap' ? (
                <div style={{ padding: '1rem' }}>
                  <h4 style={{ color: '#e4c97e', marginBottom: '1rem' }}>Mind Maps</h4>
                  
                  <MindMapList
                    key={`mindmap-list-${forceRefresh}`} // Force remount on save
                    athroId={athroId}
                    subject={subject}
                    sessionId={sessionId || null}
                    onCreateNew={() => {
                      console.log('Creating new mind map');
                      setMindMapModalOpen(true);
                      setMindMapMode('create');
                      setSelectedMindMap(null);
                      setSelectedMindMapId(null);
                    }}
                    onView={(mindMap) => {
                      console.log('Opening mind map for viewing:', mindMap);
                      setSelectedMindMapId(mindMap.id);
                      setMindMapModalOpen(true);
                      setMindMapMode('view');
                      setSelectedMindMap(mindMap);
                    }}
                    onEdit={(mindMap) => {
                      console.log('Opening mind map for editing:', mindMap);
                      setSelectedMindMapId(mindMap.id);
                      setMindMapModalOpen(true);
                      setMindMapMode('edit');
                      setSelectedMindMap(mindMap);
                    }}
                    onDelete={(id) => {
                      if (confirm('Are you sure you want to delete this mind map?')) {
                        SupabaseStudyService.deleteMindMap(id);
                      }
                    }}
                  />
                </div>
              ) : (
                <StudyTools
                  onOpenFlashcards={() => setActiveStudyTool('flashcards')}
                  onCreateNote={() => setActiveStudyTool('notes')}
                  onOpenMindMap={() => setActiveStudyTool('mindmap')}
                  onCreateQuiz={() => {}}
                  onCreateStudyPlan={() => {}}
                />
              )}
            </div>
          )}

          {/* Resources Content - Directly beneath the buttons */}
          {activeTab === 'resources' && (
            <div style={{ padding: '1rem' }}>
              <Resources
                athroId={athroId}
                subject={subject}
                sessionId={sessionId || null}
                onSelectResource={onSelectResource}
              />
            </div>
          )}
        </div>
        </div>
        </div>

      {/* Fixed Bottom Section - Language and Timer */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Language Dropdown */}
        {onInjectText && (
          <div>
            <LanguageDropdown onInjectText={onInjectText} onSendMessage={onSendMessage} />
          </div>
        )}

        {/* Timer Card - At the bottom */}
        <div style={{ 
          position: 'relative',
          zIndex: 10,
          minHeight: 'fit-content'
        }}> 
          <TimerCard />
        </div>
      </div>

      {/* Mind Map Modal */}
      <Modal
        isOpen={mindMapModalOpen}
        onClose={() => setMindMapModalOpen(false)}
        title={mindMapMode === 'create' ? 'Create New Mind Map' : mindMapMode === 'edit' ? 'Edit Mind Map' : 'View Mind Map'}
        maxWidth="95vw"
      >
        <div style={{ height: '80vh', width: '100%' }}>
          {sessionId ? (
            <FinalMindMap 
              athroId={athroId} 
              subject={subject} 
              sessionId={sessionId}
              editMindMapId={selectedMindMapId || undefined}
              onSaved={() => {
                // Close the modal when mind map is saved
                setMindMapModalOpen(false);
                setSelectedMindMapId(null);
                
                // Force a refresh of the mind maps list
                const event = new CustomEvent('refresh_mindmaplist', { 
                  detail: { time: Date.now() } 
                });
                window.dispatchEvent(event);
                
                // If we're in the mind map section, make sure it shows the updated list
                if (activeStudyTool === 'mindmap') {
                  // Small timeout to ensure React has time to process
                  setTimeout(() => {
                    const refreshEvent = new Event('mindmap_list_refresh');
                    window.dispatchEvent(refreshEvent);
                  }, 100);
                }
              }}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🟡</div>
              <h3 style={{ color: '#e4c97e', marginBottom: '1rem' }}>No Active Session</h3>
              <p style={{ color: '#b5cbb2', marginBottom: '2rem' }}>
                You need an active study session to create or edit mind maps.
              </p>
              <button
                onClick={() => {
                  setMindMapModalOpen(false);
                  if (onSaveSession) {
                    onSaveSession();
                  }
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#4fc38a',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#17221c',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Start Session
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SidePanel;
