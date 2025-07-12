import React, { useState, useEffect } from 'react';
import SupabaseStudyService from '../../../services/SupabaseStudyService';
import { Flashcard, FlashcardDifficulty, ReviewInterval } from '../../../types/study';

// Import components using dynamic imports to avoid TypeScript errors
import FlashcardForm from './FlashcardForm';
import FlashcardList from './FlashcardList';
import FlashcardReview from './FlashcardReview';

interface FlashcardModuleProps {
  athroId: string;
  subject: string;
  sessionId?: string | null;
}

enum FlashcardView {
  LIST = 'LIST',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  REVIEW = 'REVIEW',
  SAVED = 'SAVED'
}

// For debugging purposes
const DEBUG_ENABLED = true;

const FlashcardModule: React.FC<FlashcardModuleProps> = ({ athroId, subject, sessionId }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [savedFlashcards, setSavedFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<FlashcardView>(FlashcardView.LIST);
  const [selectedFlashcard, setSelectedFlashcard] = useState<Flashcard | null>(null);
  const [reviewOptions, setReviewOptions] = useState<{
    startWithCard?: Flashcard;
    filterByDifficulty?: FlashcardDifficulty;
  }>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const setCurrentViewWithLogging = (view: FlashcardView) => {
    if (DEBUG_ENABLED) {
      console.log('📚 [FlashcardModule] View changing to:', view);
    }
    setCurrentView(view);
  };

  useEffect(() => {
    if (athroId && subject) {
      loadFlashcards();
      loadSavedFlashcards();
    }
  }, [athroId, subject]);

  // Listen for session events
  useEffect(() => {
    const handleClearStudyTools = () => {
      console.log('Clearing flashcards due to session change');
      setFlashcards([]);
      setSavedFlashcards([]);
      setCurrentView(FlashcardView.LIST);
      setSelectedFlashcard(null);
    };

    const handleLoadSessionTools = async (e: CustomEvent) => {
      console.log('Loading flashcards for session:', e.detail);
      const { sessionId: loadSessionId, athroId: loadAthroId, flashcards: flashcardIds } = e.detail || {};
      
      if (loadSessionId && loadAthroId === athroId && flashcardIds && Array.isArray(flashcardIds)) {
        console.log(`[Flashcards] Loading ${flashcardIds.length} flashcards for session ${loadSessionId}`);
        
        try {
          // Load all flashcards for this session and filter by the provided IDs
          const allCards = await SupabaseStudyService.getFlashcards(athroId, loadSessionId);
          
          // Filter to only include flashcards that are in the session's flashcard list
          const filteredCards = allCards.filter(card => flashcardIds.includes(card.id));
          
          // Separate into regular and saved flashcards
          const regularCards = filteredCards.filter(card => !card.saved);
          const savedCards = filteredCards.filter(card => card.saved);
          
          console.log(`[Flashcards] Successfully loaded ${regularCards.length} regular flashcards and ${savedCards.length} saved flashcards`);
          setFlashcards(regularCards);
          setSavedFlashcards(savedCards);
          
          // Reset view state
          setCurrentView(FlashcardView.LIST);
          setSelectedFlashcard(null);
          
        } catch (error) {
          console.error('[Flashcards] Error loading session flashcards:', error);
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

  const loadFlashcards = async () => {
    try {
      // Use same session ID logic as in creation
      const effectiveSessionId = (sessionId === 'pending-session' || !sessionId) ? 'temp-session' : sessionId;
      console.log('🔍 [FlashcardModule] Loading flashcards with:', { athroId, sessionId, effectiveSessionId });
      
      const cards = await SupabaseStudyService.getFlashcards(athroId, effectiveSessionId);
      console.log('🔍 [FlashcardModule] Loaded cards:', cards);
      
      // Filter out saved cards from regular flashcards
      const regularCards = cards.filter(card => !card.saved);
      console.log('🔍 [FlashcardModule] Regular cards with difficulties:', regularCards.map(card => ({ 
        id: card.id, 
        difficulty: card.difficulty, 
        saved: card.saved,
        front: card.front?.substring(0, 20) + '...'
      })));
      
      setFlashcards(regularCards);
      setLoading(false);
    } catch (error) {
      console.error('Error loading flashcards:', error);
      setLoading(false);
    }
  };

  const loadSavedFlashcards = async () => {
    try {
      // Use same session ID logic as in creation
      const effectiveSessionId = (sessionId === 'pending-session' || !sessionId) ? 'temp-session' : sessionId;
      const cards = await SupabaseStudyService.getFlashcards(athroId, effectiveSessionId);
      // Get only saved cards
      const savedCards = cards.filter(card => card.saved);
      setSavedFlashcards(savedCards);
    } catch (error) {
      console.error('Error loading saved flashcards:', error);
    }
  };

  const handleCreateFlashcard = async (front: string, back: string, topic: string) => {
    if (!athroId || !subject) {
      console.error('[FlashcardModule] Missing athroId or subject:', { athroId, subject });
      return;
    }

    try {
      console.log('[FlashcardModule] Creating flashcard with data:', {
        athroId,
        subject,
        front,
        back,
        topic,
        sessionId
      });
      
      // Use 'temp-session' for pending sessions
      const effectiveSessionId = (sessionId === 'pending-session' || !sessionId) ? 'temp-session' : sessionId;
      await SupabaseStudyService.createFlashcard({
        athroId,
        subject,
        front,
        back,
        topic,
        difficulty: 'UNRATED'
      }, effectiveSessionId);
      
      await loadFlashcards();
      setCurrentView(FlashcardView.LIST);
      
      // Show save confirmation
      setSaveMessage('✅ Flashcard created successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setSaveMessage('❌ Failed to create flashcard');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleUpdateFlashcard = async (id: string, updates: Partial<Flashcard>, returnToList: boolean = true) => {
    try {
      console.log('🔄 [FlashcardModule] Updating flashcard:', { id, updates });
      const updatedCard = await SupabaseStudyService.updateFlashcard(id, updates);
      console.log('🔄 [FlashcardModule] Updated flashcard result:', updatedCard);
      
      await loadFlashcards();
      await loadSavedFlashcards(); // Reload saved cards too in case of moves between sections
      if (returnToList) {
        setCurrentView(FlashcardView.LIST);
      }
      
      // Show save confirmation
      setSaveMessage('✅ Flashcard updated successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error updating flashcard:', error);
      setSaveMessage('❌ Failed to update flashcard');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleDeleteFlashcard = async (id: string) => {
    try {
      console.log('Deleting flashcard:', id);
      await SupabaseStudyService.deleteFlashcard(id);
      // Reload both regular and saved flashcards
      await loadFlashcards();
      await loadSavedFlashcards();
      // After deleting a flashcard during review, return to list view
      setCurrentView(FlashcardView.LIST);
      
      // Show delete confirmation
      setSaveMessage('✅ Flashcard deleted successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      setSaveMessage('❌ Failed to delete flashcard');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleSaveFlashcard = async (flashcard: Flashcard, difficulty: FlashcardDifficulty) => {
    try {
      console.log('💾 [FlashcardModule] Saving flashcard with difficulty:', { 
        id: flashcard.id, 
        difficulty, 
        currentDifficulty: flashcard.difficulty 
      });
      
      // Mark card as saved - try updating just difficulty first to test
      await handleUpdateFlashcard(flashcard.id, {
        difficulty,
        lastReviewed: Date.now()
      }, false); // Don't automatically return to list view

      await loadFlashcards();
      await loadSavedFlashcards();
    } catch (error) {
      console.error('Error saving flashcard:', error);
    }
  };

  const handleReviewComplete = async (flashcard: Flashcard, difficulty: FlashcardDifficulty, interval: ReviewInterval) => {
    try {
      // Ensure repetitionCount has a default value of 0 to prevent NaN
      const repetitionCount = (flashcard.repetitionCount || 0) + 1;
      let nextReview = null;
      
      // Calculate next review date based on the selected interval
      if (interval) {
        nextReview = SupabaseStudyService.calculateNextReview(difficulty, repetitionCount, interval);
      }
      
      await handleUpdateFlashcard(flashcard.id, {
        difficulty,
        lastReviewed: Date.now(),
        nextReview,
        repetitionCount,
        reviewInterval: interval,
        saved: false // Ensure it's not marked as saved
      }, false); // Don't automatically return to list view

      await loadFlashcards();
    } catch (error) {
      console.error('Error updating flashcard review:', error);
    }
  };

  const handleEditFlashcard = (flashcard: Flashcard) => {
    setSelectedFlashcard(flashcard);
    setCurrentView(FlashcardView.EDIT);
  };

  const handleStartReviewForCard = (flashcard: Flashcard) => {
    console.log('📚 [FlashcardModule] Starting review for specific card:', flashcard.id);
    setReviewOptions({ startWithCard: flashcard });
    setCurrentViewWithLogging(FlashcardView.REVIEW);
  };
  
  const handleStartReviewByDifficulty = (difficulty?: FlashcardDifficulty) => {
    console.log('📚 [FlashcardModule] Starting review by difficulty:', difficulty);
    setReviewOptions({ filterByDifficulty: difficulty });
    setCurrentViewWithLogging(FlashcardView.REVIEW);
  };

  const handleUnsaveFlashcard = async (id: string) => {
    try {
      console.log('Unsaving flashcard:', id);
      const card = savedFlashcards.find(c => c.id === id);
      if (card) {
        await handleUpdateFlashcard(id, {
          saved: false,
          // Reset to default review schedule
          nextReview: SupabaseStudyService.calculateNextReview(card.difficulty || 'UNRATED', 0, '1_DAY')
        }, false); // Don't automatically return to list view since we're in saved view
      }
    } catch (error) {
      console.error('Error unsaving flashcard:', error);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div style={{ padding: '2rem', textAlign: 'center', color: '#e4c97e' }}>Loading flashcards...</div>;
    }

    switch (currentView) {
      case FlashcardView.CREATE:
        return (
          <FlashcardForm
            onSubmit={handleCreateFlashcard}
            onCancel={() => setCurrentView(FlashcardView.LIST)}
          />
        );
      
      case FlashcardView.EDIT:
        return selectedFlashcard ? (
          <FlashcardForm
            flashcard={selectedFlashcard}
            onSubmit={(front: string, back: string, topic: string) => {
              handleUpdateFlashcard(selectedFlashcard.id, { front, back, topic });
            }}
            onCancel={() => {
              setSelectedFlashcard(null);
              setCurrentView(FlashcardView.LIST);
            }}
          />
        ) : null;
      
      case FlashcardView.REVIEW:
        let cardsToReview = [...flashcards];
        
        // If we have a specific starting card, put it at the beginning
        if (reviewOptions.startWithCard) {
          cardsToReview = [
            reviewOptions.startWithCard,
            ...cardsToReview.filter(card => card.id !== reviewOptions.startWithCard?.id)
          ];
        }
        
        // If filtering by difficulty is specified
        if (reviewOptions.filterByDifficulty) {
          cardsToReview = cardsToReview.filter(card => 
            card.difficulty === reviewOptions.filterByDifficulty
          );
        }
        
        return (
          <FlashcardReview
            flashcards={cardsToReview}
            onComplete={(id, difficulty, interval, deleted, saved) => {
              const card = flashcards.find(c => c.id === id);
              if (card) {
                if (deleted) {
                  // Mark card as deleted but preserve in history
                  handleDeleteFlashcard(id);
                  // Return to flashcard list view immediately after deletion
                  setReviewOptions({});
                  setCurrentView(FlashcardView.LIST);
                } else if (saved) {
                  // Handle saving the flashcard
                  console.log('💾 [FlashcardModule] Review completed - saving card:', { id, difficulty, saved });
                  handleSaveFlashcard(card, difficulty);
                  // Return to flashcard list view immediately after saving
                  setReviewOptions({});
                  setCurrentView(FlashcardView.LIST);
                } else if (interval) {
                  // Process card review with the selected interval
                  handleReviewComplete(card, difficulty, interval as ReviewInterval);
                } else {
                  // Handle case where no interval was selected
                  console.log('No interval selected, using default');
                  handleReviewComplete(card, difficulty, '1_DAY'); // Default to 1 day
                }
              }
            }}
            onFinish={() => {
              setReviewOptions({});
              setCurrentView(FlashcardView.LIST);
            }}
          />
        );

      case FlashcardView.SAVED:
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <div style={{ 
              padding: '1rem',
              borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h4 style={{ color: '#e4c97e', margin: 0 }}>Saved Flashcards</h4>
              <button
                onClick={() => setCurrentView(FlashcardView.LIST)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#4fc38a',
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: '#17221c',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                Back to Active Cards
              </button>
            </div>
            
            {savedFlashcards.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center',
                color: 'rgba(255,255,255,0.7)'
              }}>
                <p>No saved flashcards yet.</p>
                <p>Cards you choose to "Save" during review will appear here.</p>
              </div>
            ) : (
              <div style={{ padding: '1rem' }}>
                {savedFlashcards.map(card => (
                  <div key={card.id} style={{
                    background: 'rgba(228, 201, 126, 0.1)',
                    border: '1px solid rgba(228, 201, 126, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#e4c97e', fontSize: '0.9rem' }}>
                        {card.topic || 'Untitled'}
                      </div>
                      <div style={{ color: 'white', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        {card.front}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {card.back}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      fontSize: '0.7rem'
                    }}>
                      <button
                        onClick={() => handleUnsaveFlashcard(card.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(79, 195, 138, 0.2)',
                          border: '1px solid #4fc38a',
                          borderRadius: '0.25rem',
                          color: '#4fc38a',
                          cursor: 'pointer',
                          fontSize: '0.7rem'
                        }}
                      >
                        Move to Active
                      </button>
                      
                      <button
                        onClick={() => handleEditFlashcard(card)}
                        style={{
                          padding: '0.25rem 0.5rem',
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
                        onClick={() => handleDeleteFlashcard(card.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
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
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case FlashcardView.LIST:
      default:
        return (
          <div style={{ width: '100%', height: '100%' }}>
            {/* Add saved flashcards button */}
            {savedFlashcards.length > 0 && (
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => setCurrentView(FlashcardView.SAVED)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(228, 201, 126, 0.2)',
                    border: '1px solid #e4c97e',
                    borderRadius: '0.25rem',
                    color: '#e4c97e',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}
                >
                  Saved Cards ({savedFlashcards.length})
                </button>
              </div>
            )}
            
            <FlashcardList
              flashcards={flashcards}
              onCreateNew={() => setCurrentView(FlashcardView.CREATE)}
              onStartReview={(card?: Flashcard) => {
                if (card) {
                  handleStartReviewForCard(card);
                } else {
                  handleStartReviewByDifficulty('UNRATED');
                }
              }}
              onEdit={handleEditFlashcard}
              onDelete={handleDeleteFlashcard}
            />
          </div>
        );
    }
  };
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Save Message Notification */}
      {saveMessage && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: saveMessage.includes('✅') ? 'rgba(79, 195, 138, 0.9)' : 'rgba(231, 115, 115, 0.9)',
          color: '#17221c',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {saveMessage}
        </div>
      )}
      
      {renderContent()}
      
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default FlashcardModule;
