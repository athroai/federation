import { Flashcard, StudyNote, MindMap, FlashcardDifficulty, ReviewInterval, NoteReviewStatus } from '../types/study';
import { Resource } from '../types/resources';
import { v4 as uuidv4 } from 'uuid';
import { StudyHistory, StudyHistorySummary } from '../types/history';
import { ChatMessage } from '../services/openai';
import { SupabaseDocumentService } from '../services/SupabaseDocumentService';

/**
 * Service for managing study tools data including flashcards, notes, and mind maps
 */
export class StudyService {
  private storagePrefix = 'athro_workspace_';
  
  private documentService = new SupabaseDocumentService();
  
  // Flashcard methods
  async getFlashcards(athroId?: string, subject?: string, topic?: string, includeDeleted: boolean = false): Promise<Flashcard[]> {
    const flashcardsJSON = localStorage.getItem(`${this.storagePrefix}flashcards`) || '[]';
    let flashcards: Flashcard[] = JSON.parse(flashcardsJSON);
    
    // Filter by criteria if provided
    if (athroId) {
      flashcards = flashcards.filter(card => card.athroId === athroId);
    }
    if (subject) {
      flashcards = flashcards.filter(card => card.subject === subject);
    }
    if (topic) {
      flashcards = flashcards.filter(card => card.topic === topic);
    }
    
    // Filter out deleted cards unless specifically requested
    if (!includeDeleted) {
      flashcards = flashcards.filter(card => !card.deleted);
    }
    
    return flashcards;
  }
  
  // Get flashcard history (including deleted cards)
  async getFlashcardHistory(athroId?: string): Promise<Flashcard[]> {
    return this.getFlashcards(athroId, undefined, undefined, true);
  }
  
  async createFlashcard(data: Omit<Flashcard, 'id' | 'repetitionCount' | 'difficulty'>): Promise<Flashcard> {
    const flashcardsJSON = localStorage.getItem(`${this.storagePrefix}flashcards`) || '[]';
    const flashcards: Flashcard[] = JSON.parse(flashcardsJSON);
    
    const newFlashcard: Flashcard = {
      ...data,
      id: uuidv4(),
      repetitionCount: 0,
      difficulty: 'UNRATED', // Default to UNRATED instead of MEDIUM
      deleted: false
    };
    
    flashcards.push(newFlashcard);
    localStorage.setItem(`${this.storagePrefix}flashcards`, JSON.stringify(flashcards));
    
    return newFlashcard;
  }
  
  async updateFlashcard(id: string, data: Partial<Omit<Flashcard, 'id'>>): Promise<Flashcard> {
    const flashcardsJSON = localStorage.getItem(`${this.storagePrefix}flashcards`) || '[]';
    const flashcards: Flashcard[] = JSON.parse(flashcardsJSON);
    
    const index = flashcards.findIndex(card => card.id === id);
    if (index === -1) {
      throw new Error(`Flashcard with id ${id} not found`);
    }
    
    const updatedFlashcard = {
      ...flashcards[index],
      ...data
    };
    
    flashcards[index] = updatedFlashcard;
    localStorage.setItem(`${this.storagePrefix}flashcards`, JSON.stringify(flashcards));
    
    return updatedFlashcard;
  }
  
  async deleteFlashcard(id: string): Promise<void> {
    const flashcardsJSON = localStorage.getItem(`${this.storagePrefix}flashcards`) || '[]';
    const flashcards: Flashcard[] = JSON.parse(flashcardsJSON);
    
    // Find the card to mark as deleted instead of removing it
    const index = flashcards.findIndex(card => card.id === id);
    if (index !== -1) {
      flashcards[index] = {
        ...flashcards[index],
        deleted: true,
        deletedAt: Date.now()
      };
      localStorage.setItem(`${this.storagePrefix}flashcards`, JSON.stringify(flashcards));
    }
  }
  
  // Calculates the next review date based on spaced repetition algorithm or custom interval
  calculateNextReview(difficulty: FlashcardDifficulty | null | undefined, repetitionCount: number, customInterval?: ReviewInterval): number {
    const now = Date.now();
    let daysToAdd = 1;
    
    // If a custom interval is specified, use that instead of the algorithm
    if (customInterval) {
      switch (customInterval) {
        case '1_DAY':
          daysToAdd = 1;
          break;
        case '2_DAYS':
          daysToAdd = 2;
          break;
        case '1_WEEK':
          daysToAdd = 7;
          break;
        case '1_MONTH':
          daysToAdd = 30;
          break;
      }
    } else {
      // Simple spaced repetition algorithm
      switch (difficulty) {
        case 'EASY':
          daysToAdd = Math.pow(2, repetitionCount) * 2; // Longer intervals for easy cards
          break;
        case 'MEDIUM':
          daysToAdd = Math.pow(2, repetitionCount); // Standard interval
          break;
        case 'HARD':
          daysToAdd = Math.max(1, Math.pow(2, repetitionCount) / 2); // Shorter intervals for hard cards
          break;
        case 'FINISHED':
          daysToAdd = 365; // Finished cards don't need review for a year
          break;
        case 'UNRATED':
          daysToAdd = 1; // Review unrated cards the next day
          break;
        case null:
        case undefined:
        default:
          daysToAdd = 1; // Treat null/undefined as needing immediate review
          break;
      }
      
      // Cap at 60 days
      daysToAdd = Math.min(daysToAdd, 60);
    }
    
    return now + (daysToAdd * 24 * 60 * 60 * 1000);
  }
  
  // Study Notes methods
  async getNotes(athroId?: string, subject?: string, topic?: string): Promise<StudyNote[]> {
    const notesJSON = localStorage.getItem(`${this.storagePrefix}notes`) || '[]';
    let notes: StudyNote[] = JSON.parse(notesJSON);
    
    if (athroId) {
      notes = notes.filter(note => note.athroId === athroId);
    }
    if (subject) {
      notes = notes.filter(note => note.subject === subject);
    }
    if (topic) {
      notes = notes.filter(note => note.topic === topic);
    }
    
    // Sort notes by last updated (most recent first)
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  async createNote(data: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus'>): Promise<StudyNote> {
    const notesJSON = localStorage.getItem(`${this.storagePrefix}notes`) || '[]';
    const notes: StudyNote[] = JSON.parse(notesJSON);
    
    const now = Date.now();
    const newNote: StudyNote = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      reviewStatus: 'REVIEWED', // Default to regular status, not needing review
      lastReviewed: null,
      nextReview: null
    };
    
    notes.push(newNote);
    localStorage.setItem(`${this.storagePrefix}notes`, JSON.stringify(notes));
    
    return newNote;
  }
  
  async updateNote(id: string, data: Partial<Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>>): Promise<StudyNote> {
    const notesJSON = localStorage.getItem(`${this.storagePrefix}notes`) || '[]';
    const notes: StudyNote[] = JSON.parse(notesJSON);
    
    const index = notes.findIndex(note => note.id === id);
    if (index === -1) {
      throw new Error(`Note with id ${id} not found`);
    }
    
    const updatedNote = {
      ...notes[index],
      ...data,
      updatedAt: Date.now()
    };
    
    notes[index] = updatedNote;
    localStorage.setItem(`${this.storagePrefix}notes`, JSON.stringify(notes));
    
    return updatedNote;
  }
  
  // New methods for handling note reviews
  async reviewNote(id: string, reviewStatus: NoteReviewStatus, interval?: ReviewInterval): Promise<StudyNote> {
    const notesJSON = localStorage.getItem(`${this.storagePrefix}notes`) || '[]';
    const notes: StudyNote[] = JSON.parse(notesJSON);
    
    const index = notes.findIndex(note => note.id === id);
    if (index === -1) {
      throw new Error(`Note with id ${id} not found`);
    }
    
    const now = Date.now();
    let nextReview = null;
    
    // Calculate next review date based on the selected interval if provided
    if (interval) {
      nextReview = this.calculateNextReview(reviewStatus === 'MASTERED' ? 'EASY' : 
                                           reviewStatus === 'REVIEWED' ? 'MEDIUM' : 'HARD', 
                                           1, interval);
    }
    
    const updatedNote = {
      ...notes[index],
      lastReviewed: now,
      nextReview,
      reviewInterval: interval,
      reviewStatus,
      updatedAt: now
    };
    
    notes[index] = updatedNote;
    localStorage.setItem(`${this.storagePrefix}notes`, JSON.stringify(notes));
    
    return updatedNote;
  }
  
  // Get notes that need review
  async getNotesForReview(athroId?: string, subject?: string): Promise<StudyNote[]> {
    const notes = await this.getNotes(athroId, subject);
    const now = Date.now();
    
    return notes.filter(note => 
      // Include notes that either need review or are due for review based on nextReview date
      note.reviewStatus === 'NEEDS_REVIEW' || 
      (note.nextReview && note.nextReview <= now)
    );
  }
  
  async deleteNote(id: string): Promise<void> {
    const notesJSON = localStorage.getItem(`${this.storagePrefix}notes`) || '[]';
    const notes: StudyNote[] = JSON.parse(notesJSON);
    
    const updatedNotes = notes.filter(note => note.id !== id);
    localStorage.setItem(`${this.storagePrefix}notes`, JSON.stringify(updatedNotes));
  }
  
  // Mind Maps methods
  async getMindMaps(athroId?: string, subject?: string): Promise<MindMap[]> {
    const mapsJSON = localStorage.getItem(`${this.storagePrefix}mindmaps`) || '[]';
    let maps: MindMap[] = JSON.parse(mapsJSON);
    
    if (athroId) {
      maps = maps.filter(map => map.athroId === athroId);
    }
    if (subject) {
      maps = maps.filter(map => map.subject === subject);
    }
    
    // Sort by most recently updated
    return maps.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getMindMapById(id: string): Promise<MindMap | null> {
    const mapsJSON = localStorage.getItem(`${this.storagePrefix}mindmaps`) || '[]';
    const maps: MindMap[] = JSON.parse(mapsJSON);
    
    const map = maps.find(map => map.id === id);
    return map || null;
  }
  
  async createMindMap(data: Omit<MindMap, 'id' | 'createdAt' | 'updatedAt'>): Promise<MindMap> {
    const mapsJSON = localStorage.getItem(`${this.storagePrefix}mindmaps`) || '[]';
    const maps: MindMap[] = JSON.parse(mapsJSON);
    
    const now = Date.now();
    const newMap: MindMap = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    
    maps.push(newMap);
    localStorage.setItem(`${this.storagePrefix}mindmaps`, JSON.stringify(maps));
    
    return newMap;
  }
  
  async updateMindMap(id: string, data: Partial<Omit<MindMap, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MindMap> {
    const mapsJSON = localStorage.getItem(`${this.storagePrefix}mindmaps`) || '[]';
    const maps: MindMap[] = JSON.parse(mapsJSON);
    
    const index = maps.findIndex(map => map.id === id);
    if (index === -1) {
      throw new Error(`Mind map with id ${id} not found`);
    }
    
    const updatedMap = {
      ...maps[index],
      ...data,
      updatedAt: Date.now()
    };
    
    maps[index] = updatedMap;
    localStorage.setItem(`${this.storagePrefix}mindmaps`, JSON.stringify(maps));
    
    return updatedMap;
  }
  
  async deleteMindMap(id: string): Promise<void> {
    const mapsJSON = localStorage.getItem(`${this.storagePrefix}mindmaps`) || '[]';
    const maps: MindMap[] = JSON.parse(mapsJSON);
    
    const updatedMaps = maps.filter(map => map.id !== id);
    
    if (maps.length === updatedMaps.length) {
      throw new Error(`Mind map with id ${id} not found`);
    }
    
    localStorage.setItem(`${this.storagePrefix}mindmaps`, JSON.stringify(updatedMaps));
  }
  
  /**
   * Get all resources or filter by athroId
   */
  async getResources(athroId?: string): Promise<Resource[]> {
    console.log('Getting resources for athroId:', athroId);
    try {
      // Try to get resources from IndexedDB first
      const db = await this.openDatabase();
      
      // Get all resources from the resources store
      const resources = await new Promise<Resource[]>((resolve, reject) => {
        const transaction = db.transaction(['resources'], 'readonly');
        const store = transaction.objectStore('resources');
        const request = store.getAll();
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            resolve([]);
          }
        };
        
        request.onerror = (e) => {
          console.error('Error retrieving resources from IndexedDB:', e);
          reject(new Error('Failed to retrieve resources'));
        };
      });
      
      // Filter by athroId if provided
      let filteredResources = resources;
      if (athroId) {
        filteredResources = resources.filter(resource => resource.athroId === athroId);
      }
      
      // Sort by latest created first
      return filteredResources.sort((a, b) => b.createdAt - a.createdAt);
      
    } catch (dbError) {
      console.error('Database error in getResources:', dbError);
      
      // Fall back to localStorage as last resort
      console.log('Falling back to localStorage due to IndexedDB error');
      const resourcesJSON = localStorage.getItem(`${this.storagePrefix}resources`) || '[]';
      console.log('Resources from localStorage:', resourcesJSON);
      
      try {
        let resources: Resource[] = JSON.parse(resourcesJSON);
        
        // Filter by athroId if provided
        if (athroId) {
          resources = resources.filter(resource => resource.athroId === athroId);
        }
        
        // Sort by latest created first
        return resources.sort((a, b) => b.createdAt - a.createdAt);
      } catch (parseError) {
        console.error('Error parsing localStorage resources:', parseError);
        return [];
      }
    }
  }
  
  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string): Promise<Resource | null> {
    try {
      if (!id) {
        console.error('Invalid resource ID provided:', id);
        return null;
      }

      console.log('Getting resource with ID:', id);
      
      try {
        // Open the IndexedDB database
        const db = await this.openDatabase();
        
        // Get resource metadata
        const resource = await new Promise<Resource | null>((resolve, reject) => {
          const transaction = db.transaction(['resources'], 'readonly');
          const store = transaction.objectStore('resources');
          const request = store.get(id);
          
          request.onsuccess = () => {
            if (request.result) {
              resolve(request.result);
            } else {
              resolve(null);
            }
          };
          
          request.onerror = (e) => {
            console.error('Error retrieving resource from IndexedDB:', e);
            reject(new Error('Failed to retrieve resource'));
          };
        });
        
        if (!resource) {
          // Fall back to localStorage for backward compatibility
          console.log('Resource not found in IndexedDB, checking localStorage...');
          const resourcesJSON = localStorage.getItem(`${this.storagePrefix}resources`) || '[]';
          
          if (resourcesJSON && resourcesJSON !== '[]') {
            try {
              const resources = JSON.parse(resourcesJSON);
              if (Array.isArray(resources)) {
                const legacyResource = resources.find(r => r.id === id);
                if (legacyResource) {
                  console.log('Found resource in localStorage:', legacyResource);
                  return legacyResource;
                }
              }
            } catch (parseError) {
              console.error('Error parsing localStorage resources:', parseError);
            }
          }
          
          console.log('Resource not found with ID:', id);
          return null;
        }
        
        // If resource has content stored in IndexedDB
        if (resource.content && typeof resource.content === 'string' && resource.content.startsWith('idb:')) {
          const contentId = resource.content.split(':')[1];
          console.log('Content is stored in IndexedDB, retrieving with ID:', contentId);
          
          try {
            // Get the content from IndexedDB
            const content = await new Promise<string | null>((resolveContent, rejectContent) => {
              const contentTransaction = db.transaction(['resourceContents'], 'readonly');
              const contentStore = contentTransaction.objectStore('resourceContents');
              const contentRequest = contentStore.get(contentId);
              
              contentRequest.onsuccess = () => {
                if (contentRequest.result && contentRequest.result.content) {
                  resolveContent(contentRequest.result.content);
                } else {
                  resolveContent(null);
                }
              };
              
              contentRequest.onerror = (e) => {
                console.error('Error retrieving content from IndexedDB:', e);
                rejectContent(new Error('Failed to retrieve resource content'));
              };
            });
            
            if (content) {
              // Replace the reference with the actual content
              resource.content = content;
              console.log('Successfully retrieved content from IndexedDB');
            } else {
              console.error('Content not found in IndexedDB');
            }
          } catch (contentError) {
            console.error('Error retrieving content from IndexedDB:', contentError);
          }
        }
        // For backward compatibility - check for localStorage content
        else if (resource.content && typeof resource.content === 'string' && 
                 resource.content.startsWith('storage:')) {
          const contentId = resource.content.split(':')[1];
          console.log('This is stored with the old method. Retrieving from localStorage with ID:', contentId);
          
          try {
            // Get the full content from its separate storage location
            const fullContent = localStorage.getItem(`${this.storagePrefix}resource_content_${contentId}`);
            
            if (fullContent) {
              // Replace the reference with the actual content
              resource.content = fullContent;
              console.log('Successfully retrieved content from localStorage');
            } else {
              console.error('Content not found in localStorage');
            }
          } catch (contentError) {
            console.error('Error retrieving content from localStorage:', contentError);
          }
        }
        
        // Update last accessed timestamp
        resource.lastAccessedAt = Date.now();
        try {
          await this.updateResource(resource);
        } catch (updateError) {
          console.warn('Could not update last accessed timestamp:', updateError);
          // Non-critical error, still return the resource
        }
        
        return resource;
        
      } catch (dbError) {
        console.error('Database error in getResourceById:', dbError);
        
        // Fall back to localStorage as last resort
        console.log('Falling back to localStorage due to IndexedDB error');
        const resourcesJSON = localStorage.getItem(`${this.storagePrefix}resources`) || '[]';
        
        if (resourcesJSON === '[]') return null;
        
        try {
          const resources = JSON.parse(resourcesJSON);
          if (!Array.isArray(resources)) return null;
          
          const resource = resources.find(r => r.id === id);
          if (!resource) return null;
          
          return resource;
        } catch (parseError) {
          console.error('Error parsing localStorage backup:', parseError);
          return null;
        }
      }
    } catch (error) {
      console.error('Error in getResourceById:', error);
      return null;
    }
  }

  // Open the IndexedDB database, creating it if it doesn't exist yet
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AthroResources', 1);
      
      // Initialize database or upgrade if needed
      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('resources')) {
          db.createObjectStore('resources', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('resourceContents')) {
          db.createObjectStore('resourceContents', { keyPath: 'id' });
        }
      };
      
      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        reject(new Error('Failed to open database'));
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Save a new resource to storage using IndexedDB for better large file support
   */
  async saveResource(file: File, description?: string, tags?: string[], athroId?: string): Promise<Resource> {
    try {
      // Use Supabase for new uploads
      const documentMetadata = await this.documentService.uploadDocument(file);
      
      // Create resource object referencing Supabase
      const resource: Resource = {
        id: documentMetadata.id,
        name: documentMetadata.name,
        fileType: documentMetadata.file_type,
        content: documentMetadata.text || '',
        description: description || '',
        tags: tags || [],
        athroId: athroId,
        createdAt: Date.now(),
        metadata: {
          size: documentMetadata.size,
          extension: documentMetadata.name.split('.').pop()?.toLowerCase(),
          storage_path: documentMetadata.url,
        },
        storageType: 'supabase',
        supabaseId: documentMetadata.id,
      };

      // Optionally store a reference in IndexedDB for legacy/offline support
      try {
        const db = await this.openDatabase();
        const resourceTransaction = db.transaction(['resources'], 'readwrite');
        const resourceStore = resourceTransaction.objectStore('resources');
        await new Promise<void>((resolveResource, rejectResource) => {
          const resourceRequest = resourceStore.put(resource);
          resourceRequest.onsuccess = () => resolveResource();
          resourceRequest.onerror = (e) => {
            console.error('Error storing resource metadata in IndexedDB:', e);
            rejectResource(new Error('Failed to store resource metadata'));
          };
        });
      } catch (storageError) {
        console.warn('Unable to store resource in IndexedDB:', storageError);
      }

      return resource;
    } catch (error) {
      console.error('Error in saveResource (Supabase):', error);
      throw error;
    }
  }

  /**
   * Update an existing resource
   */
  async updateResource(updatedResource: Resource): Promise<Resource> {
    if (!updatedResource || !updatedResource.id) {
      console.error('Invalid resource to update');
      throw new Error('Invalid resource to update');
    }
    
    try {
      // Open the IndexedDB database
      const db = await this.openDatabase();
      
      // Update the resource in IndexedDB
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['resources'], 'readwrite');
        const store = transaction.objectStore('resources');
        const request = store.put(updatedResource);
        
        request.onsuccess = () => resolve();
        request.onerror = (e) => {
          console.error('Error updating resource in IndexedDB:', e);
          reject(new Error('Failed to update resource'));
        };
      });
      
      // Also update the resource list in localStorage for backward compatibility
      try {
        // Get existing resources
        const resourcesJSON = localStorage.getItem(`${this.storagePrefix}resources`) || '[]';
        let resources: Resource[] = JSON.parse(resourcesJSON);
        
        // Find the index of the resource to update
        const index = resources.findIndex(r => r.id === updatedResource.id);
        
        if (index !== -1) {
          // Create a copy without the content field to avoid duplicate storage
          const resourceWithoutContent = { ...updatedResource };
          // Replace the content with a reference if it's not already a reference
          if (typeof resourceWithoutContent.content === 'string' && 
              !resourceWithoutContent.content.startsWith('idb:') &&
              !resourceWithoutContent.content.startsWith('storage:')) {
            resourceWithoutContent.content = `idb:${resourceWithoutContent.id}`;
          }
          
          // Update resource in localStorage array
          resources[index] = resourceWithoutContent;
          
          // Save back to storage
          localStorage.setItem(`${this.storagePrefix}resources`, JSON.stringify(resources));
        }
      } catch (localStorageError) {
        console.warn('Could not update resource in localStorage (non-critical):', localStorageError);
      }
      
      return updatedResource;
    } catch (error) {
      console.error('Error updating resource:', error);
      
      // Fall back to localStorage only
      try {
        // Get existing resources
        const resourcesJSON = localStorage.getItem(`${this.storagePrefix}resources`) || '[]';
        let resources: Resource[] = JSON.parse(resourcesJSON);
        
        // Find the index of the resource to update
        const index = resources.findIndex(r => r.id === updatedResource.id);
        
        if (index === -1) {
          console.error('Resource not found to update:', updatedResource.id);
          throw new Error(`Resource not found to update: ${updatedResource.id}`);
        }
        
        // Update resource
        resources[index] = updatedResource;
        
        // Save back to storage
        localStorage.setItem(`${this.storagePrefix}resources`, JSON.stringify(resources));
        
        return updatedResource;
      } catch (fallbackError) {
        console.error('Error in localStorage fallback:', fallbackError);
        throw new Error('Failed to update resource in localStorage');
      }
    }
  }

  /**
   * Delete a resource by ID
   */
  async deleteResource(id: string): Promise<void> {
    try {
      // Delete the resource from IndexedDB
      const db = await this.openDatabase();
      
      // Check if we need to delete content from content store too
      try {
        const resource = await this.getResourceById(id);
        if (resource && resource.metadata?.isLargeFile) {
          // Delete the large content from the content store
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(['content'], 'readwrite');
            const contentStore = transaction.objectStore('content');
            const deleteRequest = contentStore.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = (e) => {
              console.error('Error deleting resource content from IndexedDB:', e);
              reject(new Error('Failed to delete resource content'));
            };
          });
        }
      } catch (resourceError) {
        console.warn('Could not check if resource has content to delete:', resourceError);
      }
      
      // Delete the resource itself from the resources store
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['resources'], 'readwrite');
        const store = transaction.objectStore('resources');
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = (e) => {
          console.error('Error deleting resource from IndexedDB:', e);
          reject(new Error('Failed to delete resource'));
        };
      });
      
      // Also update localStorage for backward compatibility
      try {
        const resourcesJSON = localStorage.getItem(`${this.storagePrefix}resources`) || '[]';
        let resources: Resource[] = JSON.parse(resourcesJSON);
        
        // Filter out the resource to delete
        resources = resources.filter(resource => resource.id !== id);
        
        // Save back to storage
        localStorage.setItem(`${this.storagePrefix}resources`, JSON.stringify(resources));
      } catch (localStorageError) {
        console.warn('Could not update localStorage after deleting resource (non-critical):', localStorageError);
      }
      
    } catch (error) {
      console.error('Error in deleteResource:', error);
      
      // Fall back to localStorage only
      try {
        const resourcesJSON = localStorage.getItem(`${this.storagePrefix}resources`) || '[]';
        let resources: Resource[] = JSON.parse(resourcesJSON);
        
        // Filter out the resource to delete
        resources = resources.filter(resource => resource.id !== id);
        
        // Save back to storage
        localStorage.setItem(`${this.storagePrefix}resources`, JSON.stringify(resources));
      } catch (fallbackError) {
        console.error('Error deleting resource from localStorage fallback:', fallbackError);
      }
    }
  }
  
  /**
   * Get all study history summaries or filter by athroId
   */
  async getStudyHistory(athroId?: string): Promise<StudyHistorySummary[]> {
    const historyJSON = localStorage.getItem(`${this.storagePrefix}study_history`) || '[]';
    let history: StudyHistory[] = JSON.parse(historyJSON);
    
    // Filter by athroId if provided
    if (athroId) {
      history = history.filter(session => session.athroId === athroId);
    }
    
    // Convert to summary format to reduce payload size
    const summaries: StudyHistorySummary[] = history.map(session => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt || session.createdAt,
      athroId: session.athroId,
      resourceCount: session.resources?.length || 0,
      messageCount: session.messages?.length || 0,
      toolsCount: (session.mindMaps?.length || 0) + 
                  (session.notes?.length || 0) + 
                  (session.flashcards?.length || 0)
    }));
    
    // Sort by creation date, newest first
    return summaries.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  /**
   * Get a specific study history by ID
   */
  async getStudyHistoryById(id: string): Promise<StudyHistory | null> {
    const historyJSON = localStorage.getItem(`${this.storagePrefix}study_history`) || '[]';
    const history: StudyHistory[] = JSON.parse(historyJSON);
    
    return history.find(session => session.id === id) || null;
  }
  
  /**
   * Save a new study history session
   */
  async saveStudyHistory(data: Omit<StudyHistory, 'id' | 'createdAt'>): Promise<StudyHistory> {
    const historyJSON = localStorage.getItem(`${this.storagePrefix}study_history`) || '[]';
    const history: StudyHistory[] = JSON.parse(historyJSON);
    
    const newSession: StudyHistory = {
      ...data,
      id: uuidv4(),
      createdAt: Date.now()
    };
    
    history.push(newSession);
    localStorage.setItem(`${this.storagePrefix}study_history`, JSON.stringify(history));
    
    return newSession;
  }
  
  /**
   * Update an existing study history session
   */
  async updateStudyHistory(id: string, data: Partial<Omit<StudyHistory, 'id' | 'createdAt'>>): Promise<StudyHistory | null> {
    const historyJSON = localStorage.getItem(`${this.storagePrefix}study_history`) || '[]';
    const history: StudyHistory[] = JSON.parse(historyJSON);
    
    const index = history.findIndex(session => session.id === id);
    if (index === -1) {
      return null;
    }
    
    const updatedSession = {
      ...history[index],
      ...data
    };
    
    history[index] = updatedSession;
    localStorage.setItem(`${this.storagePrefix}study_history`, JSON.stringify(history));
    
    return updatedSession;
  }
  
  /**
   * Delete a study history session by ID
   */
  async deleteStudyHistory(id: string): Promise<boolean> {
    const historyJSON = localStorage.getItem(`${this.storagePrefix}study_history`) || '[]';
    let history: StudyHistory[] = JSON.parse(historyJSON);
    
    const initialLength = history.length;
    history = history.filter(session => session.id !== id);
    
    if (history.length === initialLength) {
      return false; // Nothing was deleted
    }
    
    localStorage.setItem(`${this.storagePrefix}study_history`, JSON.stringify(history));
    return true;
  }
}

export default new StudyService();
