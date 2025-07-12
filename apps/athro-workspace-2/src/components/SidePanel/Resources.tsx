import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PlaylistService, { Playlist as DBPlaylist, PlaylistDocument } from '../../services/PlaylistService';
// import { athroSelectionService } from '@athro/shared-services';
// import FederatedAuthService from '@athro/shared-services/FederatedAuthService';
// import type { AuthState } from '@athro/shared-services/FederatedAuthService';

interface Playlist extends DBPlaylist {
  isEditing?: boolean;
}

interface Document {
  id: string;
  name: string;
  playlistId: string;
  athroId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  isEditing?: boolean;
  originalName?: string;
}

interface ResourcesProps {
  athroId: string;
  subject: string;
  sessionId?: string;
  onSelectResource?: (documentId: string) => void;
}

const Resources: React.FC<ResourcesProps> = ({ athroId, subject, sessionId, onSelectResource }) => {
  const { user } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [mounted, setMounted] = useState(true);

  // Detect standalone mode (port 5175) vs embedded mode (port 5210)
  const isStandalone = window.location.port === '5175' && (!window.parent || window.parent === window);

  // Function to get Athro name from athroId
  const getAthroName = (athroId: string, subject: string): string => {
    // Map athroId to proper Athro names based on the pattern from WorkPage.tsx
    const athroNames: Record<string, string> = {
      'athro-maths': 'AthroMaths',
      'athro-science': 'AthroScience',
      'athro-english': 'AthroEnglish',
      'athro-history': 'AthroHistory',
      'athro-geography': 'AthroGeography',
      'athro-drama': 'AthroDrama',
      'athro-music': 'AthroMusic',
      'athro-rs': 'AthroRS',
      'athro-dt': 'AthroDT',
      'athro-media': 'AthroMedia',
      'athro-business': 'AthroBusiness',
      'athro-languages': 'AthroLanguages',
      'athro-welsh': 'AthroCymraeg'
    };
    
    return athroNames[athroId] || `Athro${subject.replace(/\s+/g, '')}`;
  };

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [draggedDocument, setDraggedDocument] = useState<string | null>(null);
  const [dragOverPlaylist, setDragOverPlaylist] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'document' | 'playlist', id: string, name: string } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; playlistId: string; playlistName: string }>({ show: false, playlistId: '', playlistName: '' });
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [unsortedDocuments, setUnsortedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sort unsortedDocuments by newest first for display
  const sortedQuickAccessDocuments = useMemo(() => {
    return [...unsortedDocuments].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
  }, [unsortedDocuments]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);

  // Enhanced loadData function with retries and better error handling
  const loadData = async () => {
    if (!mounted) return;

    try {
      // const federatedAuth = FederatedAuthService.getInstance();
      // const authState = federatedAuth.getState();
      
      console.log('🔄 Loading data - Auth check:', { user, athroId });
      
      // Skip auth check - let PlaylistService handle auth internally
      if (!athroId) {
        console.warn('❌ No athroId provided, skipping data load');
        if (mounted) {
          setLoading(false);
          setError('No Athro ID provided');
        }
        return;
      }

      console.log('✅ Proceeding with data load (auth handled by PlaylistService)');

      if (mounted) {
        setLoading(true);
        setError(null);
      }
      console.log('🔄 Loading data for athroId:', athroId);

      // Ensure Quick Uploads playlist exists
      console.log('📁 Ensuring Quick Uploads playlist exists...');
      const quickUploadsPlaylist = await PlaylistService.ensureQuickUploadsPlaylist(athroId);
      console.log('✅ Quick Uploads playlist ready:', quickUploadsPlaylist.id);

      // Load playlists with retry mechanism
      let playlistsData: Playlist[] = [];
      let documentsData: PlaylistDocument[] = [];
      let sessionDocsData: PlaylistDocument[] = [];

      try {
        console.log('📁 Loading playlists...');
        playlistsData = await PlaylistService.getPlaylists(athroId);
        console.log('✅ Loaded playlists:', playlistsData.length);

        // Load all documents for this athro
        console.log('📄 Loading documents...');
        documentsData = await PlaylistService.getAllDocuments(athroId);
        console.log('✅ Loaded documents:', documentsData.length);

        // Load session documents if sessionId provided
        if (sessionId) {
          console.log('📄 Loading session documents...');
          sessionDocsData = await PlaylistService.getSessionDocuments(sessionId, athroId);
          console.log('✅ Loaded session documents:', sessionDocsData.length);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (retryCount < maxRetries) {
          console.log(`Retrying data load (attempt ${retryCount + 1}/${maxRetries})...`);
          if (mounted) {
            setRetryCount(prev => prev + 1);
          }
          setTimeout(loadData, 1000 * (retryCount + 1)); // Exponential backoff
          return;
        }
        throw error;
      }

      // Transform and set data
      const transformedDocs = documentsData.map(doc => ({
        id: doc.id,
        name: doc.name,
        playlistId: doc.playlistId,
        athroId: doc.athroId,
        type: doc.fileType,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      const transformedSessionDocs = sessionDocsData.map(doc => ({
        id: doc.id,
        name: doc.name,
        playlistId: doc.playlistId,
        athroId: doc.athroId,
        type: doc.fileType,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      // Update state only if component is still mounted
      if (mounted) {
        // Update state
        console.log('✅ Setting playlists state:', playlistsData.length, 'playlists');
        setPlaylists(playlistsData);
        setDocuments(transformedDocs);
        setUnsortedDocuments(transformedSessionDocs);

        // FIXED: Don't auto-expand playlists - let them start closed when user opens "View Playlists"
        // Users want playlists closed by default, not auto-opened
        // const playlistsWithDocs = new Set(
        //   transformedDocs
        //     .map(doc => doc.playlistId)
        //     .filter(id => playlistsData.some(p => p.id === id))
        // );
        // setExpandedPlaylists(playlistsWithDocs);
        
        // Start with all playlists closed
        setExpandedPlaylists(new Set());

        console.log('🎉 Resources loading completed successfully');
        console.log('📊 Final loaded state:', {
          playlists: playlistsData.length,
          documents: transformedDocs.length,
          sessionDocs: transformedSessionDocs.length,
          expandedPlaylists: 0 // Always start with 0 expanded playlists
        });

        setLoading(false);
        setRetryCount(0);
      }
    } catch (error) {
      console.error('Error in loadData:', error);
      if (mounted) {
        setError(error instanceof Error ? error.message : 'Failed to load resources');
        setLoading(false);
      }
    }
  };

  // Call loadData on mount and when dependencies change
  useEffect(() => {
    console.log('📡 useEffect loadData trigger:', { user, athroId });
    
    // Skip auth check - just check for athroId
    if (athroId) {
      console.log('✅ Triggering loadData (auth handled internally)');
      loadData();
    } else {
      console.log('❌ No athroId, skipping loadData');
    }

    return () => {
      setMounted(false);
      setLoading(false);
      setError(null);
    };
  }, [athroId, sessionId]);

  // Subscribe to auth changes
  useEffect(() => {
    console.log('📡 Auth state change:', { user, athroId, mounted });
    
    // Skip auth check - just check for athroId and mounted state
    if (athroId && mounted) {
      console.log('✅ Auth change triggering loadData (auth handled internally)');
      loadData();
    } else {
      console.log('❌ Auth change - not triggering loadData:', { athroId, mounted });
    }

    return () => {
      setMounted(false);
      setLoading(false);
      setError(null);
    };
  }, [athroId, user]);

  // Add error display
  if (error) {
    return (
      <div style={{ padding: '1rem 2rem', marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ color: '#ff4444', fontSize: '0.9rem' }}>
          Error loading resources: {error}
          <button 
            onClick={loadData}
            style={{
              marginLeft: '1rem',
              padding: '0.25rem 0.5rem',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const addPlaylist = async () => {
    console.log('📁 addPlaylist clicked!');
    
    console.log('📊 Auth check:', user ? 'authenticated' : 'not authenticated');
    console.log('📊 athroId:', athroId);
    
    // Skip auth check for now - if loadData works, this should work too
    // The PlaylistService will handle auth internally via Supabase
    if (!athroId) {
      console.error('❌ Missing athroId for playlist creation');
      alert('No Athro selected. Please select an Athro from the dashboard first.');
      return;
    }
    
    console.log('✅ Proceeding with playlist creation (auth handled by PlaylistService)');
    
    try {
      setIsAddingPlaylist(true);
      
      // Create a new playlist with a temporary name
      const newPlaylist = await PlaylistService.createPlaylist(athroId, 'New Playlist');
      console.log('✅ Created new playlist:', newPlaylist.id);
      
      // CRITICAL FIX: Reload all playlists from database to ensure persistence
      console.log('🔄 Reloading playlists from database to ensure new playlist persists...');
      const playlistsData = await PlaylistService.getPlaylists(athroId);
      
      // Find the newly created playlist and set it to editing mode
      const updatedPlaylists = playlistsData.map(p => 
        p.id === newPlaylist.id ? { ...p, isEditing: true } : p
      );
      setPlaylists(updatedPlaylists);
      
      // Expand the new playlist so it's visible
      setExpandedPlaylists(prev => new Set([...prev, newPlaylist.id]));
      
      console.log('✅ Playlist creation completed - reloaded from database, card should stay open');
    } catch (error) {
      console.error('❌ Error creating playlist:', error);
      alert(`Failed to create playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingPlaylist(false);
    }
  };

  const handlePlaylistNameChange = async (id: string, newName: string) => {
    console.log('🏷️ handlePlaylistNameChange called:', { id, newName, user });
    
    // Skip auth check - let PlaylistService handle auth internally
    if (!id || !newName) {
      console.error('❌ Missing id or newName for playlist rename');
      return;
    }
    
    console.log('✅ Proceeding with playlist rename (auth handled by PlaylistService)');
    
    try {
      console.log('📤 Updating playlist name in database...');
      await PlaylistService.updatePlaylist(id, newName);
      console.log('✅ Playlist name updated successfully');
      
      setPlaylists(playlists.map(p => 
        p.id === id ? { ...p, name: newName, isEditing: false } : p
      ));
      console.log('✅ UI updated - playlist editing state cleared');
    } catch (error) {
      console.error('❌ Error updating playlist name:', error);
      console.error('❌ Playlist rename error details:', error instanceof Error ? error.message : String(error));
      
      // Revert editing state on error
      setPlaylists(playlists.map(p => 
        p.id === id ? { ...p, isEditing: false } : p
      ));
      console.log('🔄 Reverted editing state due to error');
      
      // Show user-friendly error message
      alert(`Failed to rename playlist: ${error instanceof Error ? error.message : 'Unknown error'}. Check browser console for details.`);
    }
  };

  const startEditingPlaylist = (id: string) => {
    setPlaylists(playlists.map(p => 
      p.id === id ? { ...p, isEditing: true } : p
    ));
  };

  const processFiles = async (files: FileList, targetPlaylistId?: string) => {
    console.log('📁 processFiles called with:', files.length, 'files');
    console.log('📊 AthroId:', athroId);
    console.log('📊 Target playlist:', targetPlaylistId || 'default (Quick Uploads)');
    
    // Skip auth check - let PlaylistService handle auth internally
    if (!athroId) {
      console.error('❌ Missing athroId for file upload');
      alert('No Athro selected. Please select an Athro from the dashboard first.');
      return;
    }
    
    console.log('✅ Proceeding with file upload (auth handled by PlaylistService)');
    
    try {
      console.log('📤 Starting file upload process...');
      setUploading(true);
      
      // Get the Quick Uploads History playlist
      console.log('📁 Ensuring Quick Uploads playlist exists...');
      const quickUploadsPlaylist = await PlaylistService.ensureQuickUploadsPlaylist(athroId);
      console.log('✅ Quick Uploads playlist ready:', quickUploadsPlaylist.id);
      
      const playlistId = targetPlaylistId || quickUploadsPlaylist.id;
      console.log('📁 Using playlist ID:', playlistId);
      
      // Upload files to Supabase
      console.log('📤 Uploading files to Supabase...');
      const uploadedDocs = await PlaylistService.uploadDocuments(files, playlistId, athroId, sessionId || undefined);
      console.log('✅ Files uploaded successfully:', uploadedDocs.length);
      
      // Transform to component format
      const transformedDocs = uploadedDocs.map(doc => ({
        id: doc.id,
        name: doc.name,
        playlistId: doc.playlistId,
        athroId: doc.athroId,
        type: doc.fileType,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      
      console.log('📊 Transformed documents:', transformedDocs);
      
      // CRITICAL FIX: Reload all data from database to ensure consistency
      console.log('🔄 Reloading all data from database to ensure UI consistency...');
      
      // Reload playlists
      const playlistsData = await PlaylistService.getPlaylists(athroId);
      console.log('✅ Reloaded playlists:', playlistsData.length);
      setPlaylists(playlistsData);
      
      // Reload all documents
      const documentsData = await PlaylistService.getAllDocuments(athroId);
      const allTransformedDocs = documentsData.map(doc => ({
        id: doc.id,
        name: doc.name,
        playlistId: doc.playlistId,
        athroId: doc.athroId,
        type: doc.fileType,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      console.log('✅ Reloaded all documents:', allTransformedDocs.length);
      setDocuments(allTransformedDocs);
      
      // Reload session documents for quick uploads tracking
      if (sessionId) {
        const sessionDocs = await PlaylistService.getSessionDocuments(sessionId, athroId);
        const transformedSessionDocs = sessionDocs.map(doc => ({
          id: doc.id,
          name: doc.name,
          playlistId: doc.playlistId,
          athroId: doc.athroId,
          type: doc.fileType,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }));
        console.log('✅ Reloaded session documents:', transformedSessionDocs.length);
        setUnsortedDocuments(transformedSessionDocs);
      }
      
      console.log('🎉 File upload and reload process completed successfully');
      console.log('📊 Final state - Documents:', allTransformedDocs.length, 'Playlists:', playlistsData.length);
      
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      console.error('❌ Upload error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ This could be due to:');
      console.error('   1. Authentication failure (user not authenticated)');
      console.error('   2. Missing storage bucket (playlist-documents)');
      console.error('   3. Incorrect storage RLS policies');
      console.error('   4. File size too large');
      console.error('   5. Invalid file types');
      console.error('   6. Database insertion errors');
      console.error('   7. Network connectivity issues');
      
      // Show user-friendly error message
      alert(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}. Check browser console for details.`);
    } finally {
      setUploading(false);
      console.log('🔧 Upload process completed, uploading state cleared');
    }
  };

  const handleQuickFileUpload = () => {
    // Open finder window for direct file upload
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.doc,.docx,.ppt,.pptx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        await processFiles(files);
      }
    };
    
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handlePlaylistFileUpload = (playlistId: string) => {
    // Open finder window for playlist-specific upload
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.doc,.docx,.ppt,.pptx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        await processFiles(files, playlistId);
      }
    };
    
    input.click();
  };

  const handleDocumentAction = async (documentId: string, action: 'copy' | 'move' | 'delete' | 'rename', targetPlaylistId?: string) => {
    if (!user) return;
    
    try {
      switch (action) {
        case 'copy':
          if (targetPlaylistId) {
            await PlaylistService.copyDocument(documentId, targetPlaylistId);
            // Reload documents to show the copy
            const documentsData = await PlaylistService.getAllDocuments(athroId);
            const transformedDocs = documentsData.map(doc => ({
              id: doc.id,
              name: doc.name,
              playlistId: doc.playlistId,
              athroId: doc.athroId,
              type: doc.fileType,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            }));
            setDocuments(transformedDocs);
          }
          break;
        case 'move':
          if (targetPlaylistId) {
            console.log('🚀 MOVE ACTION STARTED IN handleDocumentAction');
            console.log('📋 Document ID:', documentId);
            console.log('📁 Target Playlist ID:', targetPlaylistId);
            console.log('🌍 Athro ID:', athroId);
            console.log('👤 User authenticated:', !!user);
            
            try {
              console.log('📤 Calling PlaylistService.moveDocument...');
              const moveResult = await PlaylistService.moveDocument(documentId, targetPlaylistId);
              console.log('✅ PlaylistService.moveDocument completed successfully');
              console.log('📄 Move result:', moveResult);
              
              // Reload documents from database to ensure consistency
              console.log('🔄 Reloading ALL documents from database...');
              const documentsData = await PlaylistService.getAllDocuments(athroId);
              console.log('📊 Loaded documents count:', documentsData.length);
              console.log('📋 Document IDs loaded:', documentsData.map(d => `${d.id}:${d.name}:${d.playlistId}`));
              
              const transformedDocs = documentsData.map(doc => ({
                id: doc.id,
                name: doc.name,
                playlistId: doc.playlistId,
                athroId: doc.athroId,
                type: doc.fileType,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
              }));
              
              console.log('🔄 Setting documents state with', transformedDocs.length, 'documents');
              setDocuments(transformedDocs);
              
              // Check if the moved document is now in the correct playlist
              const movedDoc = transformedDocs.find(d => d.id === documentId);
              if (movedDoc) {
                console.log('✅ VERIFICATION: Moved document found in new data:', movedDoc.name, 'in playlist:', movedDoc.playlistId);
                console.log('✅ VERIFICATION: Target playlist matches:', movedDoc.playlistId === targetPlaylistId);
              } else {
                console.error('❌ VERIFICATION FAILED: Moved document not found in reloaded data!');
              }
              
              // Also reload session documents in case the document was moved from there
              if (sessionId) {
                console.log('🔄 Reloading session documents after move...');
                const sessionDocsData = await PlaylistService.getSessionDocuments(sessionId, athroId);
                console.log('📊 Session documents count:', sessionDocsData.length);
                
                const transformedSessionDocs = sessionDocsData.map(doc => ({
                  id: doc.id,
                  name: doc.name,
                  playlistId: doc.playlistId,
                  athroId: doc.athroId,
                  type: doc.fileType,
                  createdAt: doc.createdAt,
                  updatedAt: doc.updatedAt,
                }));
                
                console.log('🔄 Setting unsortedDocuments state with', transformedSessionDocs.length, 'documents');
                setUnsortedDocuments(transformedSessionDocs);
              }
              
              // Auto-expand the target playlist to show the moved document
              console.log('📂 Auto-expanding target playlist:', targetPlaylistId);
              setExpandedPlaylists(prev => {
                const newExpanded = new Set(prev);
                newExpanded.add(targetPlaylistId);
                console.log('📂 New expanded playlists set:', Array.from(newExpanded));
                return newExpanded;
              });
              
              console.log('✅ MOVE ACTION COMPLETED SUCCESSFULLY');
              
            } catch (moveError) {
              console.error('❌ MOVE ACTION FAILED IN handleDocumentAction:', moveError);
              console.error('❌ Move error details:', moveError instanceof Error ? moveError.message : String(moveError));
              console.error('❌ Move error stack:', moveError instanceof Error ? moveError.stack : 'No stack trace');
              throw moveError; // Re-throw so the calling function can handle it
            }
          } else {
            console.error('❌ MOVE ACTION FAILED: No target playlist ID provided');
            throw new Error('No target playlist ID provided for move operation');
          }
          break;
        case 'rename':
          setDocuments(documents.map(d => 
            d.id === documentId ? { ...d, isEditing: true, originalName: d.name } : d
          ));
          break;
        case 'delete':
          await PlaylistService.deleteDocument(documentId);
          setDocuments(documents.filter(d => d.id !== documentId));
          setUnsortedDocuments(prev => prev.filter(d => d.id !== documentId));
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
    }
  };

  const handleDocumentNameChange = async (id: string, newName: string) => {
    console.log('🏷️ handleDocumentNameChange called:', { id, newName, user });
    
    // Skip auth check - let PlaylistService handle auth internally
    if (!id || !newName) {
      console.error('❌ Missing id or newName for document rename');
      return;
    }
    
    console.log('✅ Proceeding with document rename (auth handled by PlaylistService)');
    
    try {
      // Extract file extension
      const doc = documents.find(d => d.id === id);
      if (!doc) {
        console.error('❌ Document not found for rename:', id);
        return;
      }
      
      const originalExt = doc.originalName?.split('.').pop() || doc.name.split('.').pop();
      const nameWithoutExt = newName.split('.')[0]; // Remove any extension user might have typed
      const finalName = originalExt ? `${nameWithoutExt}.${originalExt}` : nameWithoutExt;
      
      console.log('📤 Updating document name in database...', { originalName: doc.name, finalName });
      await PlaylistService.updateDocument(id, finalName);
      console.log('✅ Document name updated successfully');
      
      setDocuments(documents.map(d => 
        d.id === id ? { ...d, name: finalName, isEditing: false, originalName: undefined } : d
      ));
      
      setUnsortedDocuments(prev => prev.map(d => 
        d.id === id ? { ...d, name: finalName, isEditing: false, originalName: undefined } : d
      ));
      console.log('✅ UI updated - document editing state cleared');
    } catch (error) {
      console.error('❌ Error updating document name:', error);
      console.error('❌ Document rename error details:', error instanceof Error ? error.message : String(error));
      
      // Revert editing state on error
      setDocuments(documents.map(d => 
        d.id === id ? { ...d, isEditing: false, originalName: undefined } : d
      ));
      setUnsortedDocuments(prev => prev.map(d => 
        d.id === id ? { ...d, isEditing: false, originalName: undefined } : d
      ));
      console.log('🔄 Reverted editing state due to error');
      
      // Show user-friendly error message
      alert(`Failed to rename document: ${error instanceof Error ? error.message : 'Unknown error'}. Check browser console for details.`);
    }
  };

    const togglePlaylistExpansion = (playlistId: string) => {
    const newExpanded = new Set<string>();
    if (expandedPlaylists.has(playlistId)) {
      // If this playlist is already open, close it (set remains empty)
    } else {
      // Close all other playlists and open only this one
      newExpanded.add(playlistId);
    }
    setExpandedPlaylists(newExpanded);
  };

  const handleFileClick = (document: Document) => {
    console.log('🔥🔥🔥 Resources: handleFileClick called for document:', document.name, 'ID:', document.id);
    console.log('🔥🔥🔥 Resources: onSelectResource callback available?', !!onSelectResource);
    
    // Load document into chat
    if (onSelectResource) {
      console.log('🔥🔥🔥 Resources: Calling onSelectResource with ID:', document.id);
      onSelectResource(document.id);
    } else {
      console.warn('🔥🔥🔥 Resources: onSelectResource callback not provided');
    }
  };

  const showDeleteConfirmation = (playlistId: string, playlistName: string) => {
    setDeleteConfirmation({ show: true, playlistId, playlistName });
  };

  const confirmDelete = async () => {
    const { playlistId } = deleteConfirmation;
    
    try {
      await PlaylistService.deletePlaylist(playlistId);
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      setDocuments(documents.filter(d => d.playlistId !== playlistId));
      setUnsortedDocuments(prev => prev.filter(d => d.playlistId !== playlistId));
      
      // Close the playlist if it's expanded
      if (expandedPlaylists.has(playlistId)) {
        const newExpanded = new Set(expandedPlaylists);
        newExpanded.delete(playlistId);
        setExpandedPlaylists(newExpanded);
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
    
    setDeleteConfirmation({ show: false, playlistId: '', playlistName: '' });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, playlistId: '', playlistName: '' });
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, documentId: string) => {
    console.log('🚀 DRAG START EVENT');
    console.log('📋 Document ID received:', documentId);
    console.log('🔍 Searching for document in arrays...');
    
    const document = documents.find(d => d.id === documentId);
    const unsortedDocument = unsortedDocuments.find(d => d.id === documentId);
    const foundDocument = document || unsortedDocument;
    
    console.log('📄 Found in documents array:', document ? `${document.name} (playlist: ${document.playlistId})` : 'NOT FOUND');
    console.log('📄 Found in unsortedDocuments array:', unsortedDocument ? `${unsortedDocument.name} (playlist: ${unsortedDocument.playlistId})` : 'NOT FOUND');
    console.log('📄 Final document for drag:', foundDocument ? `${foundDocument.name} from ${foundDocument.playlistId}` : 'NOT FOUND');
    
    if (!foundDocument) {
      console.error('❌ CRITICAL: Document not found for drag operation!');
      console.error('❌ Available IDs in documents:', documents.map(d => d.id));
      console.error('❌ Available IDs in unsortedDocuments:', unsortedDocuments.map(d => d.id));
      return;
    }
    
    console.log('✅ Setting drag state...');
    setDraggedDocument(documentId);
    setIsDragging(true);
    
    console.log('📋 Setting drag data transfer...');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', documentId);
    
    console.log('✅ DRAG START COMPLETED');
    console.log('🏷️ Dragged document state set to:', documentId);
  };

  const handleDragEnd = () => {
    setDraggedDocument(null);
    setDragOverPlaylist(null);
    setIsDragging(false);
  };

  const handlePlaylistDragOver = (e: React.DragEvent, playlistId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only show drag over effect if we have a valid document being dragged
    if (draggedDocument) {
      const sourceDocument = documents.find(d => d.id === draggedDocument) || unsortedDocuments.find(d => d.id === draggedDocument);
      // Only show drag over if the document is not already in this playlist
      if (sourceDocument && sourceDocument.playlistId !== playlistId) {
        setDragOverPlaylist(playlistId);
      }
    }
  };

  const handlePlaylistDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the playlist area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverPlaylist(null);
    }
  };

  const handlePlaylistDrop = async (e: React.DragEvent, targetPlaylistId: string) => {
    e.preventDefault();
    const documentId = e.dataTransfer.getData('text/plain');
    
    console.log('🎯 DROP EVENT STARTED');
    console.log('📋 Document ID from drag data:', documentId);
    console.log('📁 Target playlist ID:', targetPlaylistId);
    console.log('🏷️ Current dragged document state:', draggedDocument);
    console.log('📊 Current documents array length:', documents.length);
    console.log('📊 Current unsortedDocuments array length:', unsortedDocuments.length);
    
    if (documentId && draggedDocument === documentId) {
      const document = documents.find(d => d.id === documentId);
      const unsortedDocument = unsortedDocuments.find(d => d.id === documentId);
      
      console.log('🔍 DOCUMENT SEARCH RESULTS:');
      console.log('📄 Found in documents array:', document ? `${document.name} (playlist: ${document.playlistId})` : 'NOT FOUND');
      console.log('📄 Found in unsortedDocuments array:', unsortedDocument ? `${unsortedDocument.name} (playlist: ${unsortedDocument.playlistId})` : 'NOT FOUND');
      
      // Check if document exists in either documents or unsortedDocuments
      const sourceDocument = document || unsortedDocument;
      
      if (sourceDocument && sourceDocument.playlistId !== targetPlaylistId) {
        console.log('✅ PROCEEDING WITH MOVE:');
        console.log(`📤 Moving "${sourceDocument.name}" from playlist "${sourceDocument.playlistId}" to "${targetPlaylistId}"`);
        
        try {
          // Call the move action with detailed logging
          console.log('🚀 Calling handleDocumentAction...');
          await handleDocumentAction(documentId, 'move', targetPlaylistId);
          console.log('✅ handleDocumentAction completed successfully');
          
          // Note: handleDocumentAction already reloads the data, so no need for another loadData() call
          console.log('✅ Move operation completed - handleDocumentAction handled data refresh');
          
        } catch (error) {
          console.error('❌ MOVE OPERATION FAILED:', error);
          console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          alert(`Failed to move document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (!sourceDocument) {
        console.warn('⚠️ DOCUMENT NOT FOUND IN EITHER ARRAY:', documentId);
        console.warn('⚠️ Available document IDs in documents:', documents.map(d => d.id));
        console.warn('⚠️ Available document IDs in unsortedDocuments:', unsortedDocuments.map(d => d.id));
        alert('Document not found. Please refresh the page and try again.');
      } else {
        console.log('ℹ️ Document already in target playlist - no move needed');
      }
    } else {
      console.warn('⚠️ DROP EVENT VALIDATION FAILED:');
      console.warn('📋 documentId from drag data:', documentId);
      console.warn('🏷️ draggedDocument state:', draggedDocument);
      console.warn('✅ documentId exists:', !!documentId);
      console.warn('✅ draggedDocument matches:', draggedDocument === documentId);
    }
    
    console.log('🏁 DROP EVENT COMPLETED - Cleaning up drag state');
    setDragOverPlaylist(null);
    setDraggedDocument(null);
    setIsDragging(false);
  };

  // Long press handlers
  const handleMouseDown = (e: React.MouseEvent, documentId: string) => {
    if (e.button === 0) { // Left mouse button
      const timer = setTimeout(() => {
        setIsDragging(true);
        // Start drag operation programmatically
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.cursor = 'grabbing';
        }
      }, 500); // 500ms long press
      
      setLongPressTimer(timer);
    }
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Custom delete confirmation
  const showCustomDeleteConfirm = (type: 'document' | 'playlist', id: string, name: string) => {
    setDeleteConfirm({ type, id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const { type, id } = deleteConfirm;
    
    if (type === 'document') {
      await handleDocumentAction(id, 'delete');
    } else if (type === 'playlist') {
      try {
        await PlaylistService.deletePlaylist(id);
        setPlaylists(playlists.filter(p => p.id !== id));
        setDocuments(documents.filter(d => d.playlistId !== id));
        setUnsortedDocuments(prev => prev.filter(d => d.playlistId !== id));
        
        if (expandedPlaylists.has(id)) {
          const newExpanded = new Set(expandedPlaylists);
          newExpanded.delete(id);
          setExpandedPlaylists(newExpanded);
        }
      } catch (error) {
        console.error('Error deleting playlist:', error);
      }
    }
    
    setDeleteConfirm(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const ThemeIcon = ({ type, size = 16, style }: { type: 'down-arrow' | 'plus' | 'minus' | 'file' | 'hamburger' | 'note' | 'trash' | 'folder' | 'x' | 'send' | 'copy', size?: number, style?: React.CSSProperties }) => {
    const iconPaths = {
      'down-arrow': 'M7 10l5 5 5-5z',
      'plus': 'M12 5v14m-7-7h14',
      'minus': 'M5 12h14',
      'file': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
      'hamburger': 'M3 12h18 M3 6h18 M3 18h18',
      'note': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2l6 6 M14 2v6h6',
      'trash': 'M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z',
      'folder': 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
      'x': 'M18 6L6 18 M6 6l12 12',
      'send': 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
      'copy': 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M10 4h4 M8 4v4h8V4'
    };
    
    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        background: '#4fc38a',
        maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='${iconPaths[type]}'/%3E%3C/svg%3E")`,
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
        ...style
      }} />
    );
  };

  // Sort playlists: newest first, but Quick Uploads History always appears last
  const sortedPlaylists = [...playlists].sort((a, b) => {
    // Quick Uploads History always goes to the end
    if (a.name === 'Quick Uploads History') return 1;
    if (b.name === 'Quick Uploads History') return -1;
    
    // For all other playlists, sort by creation date (newest first)
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Helper function to get document count for a playlist
  const getPlaylistDocumentCount = (playlistId: string): number => {
    return documents.filter(doc => doc.playlistId === playlistId).length;
  };
    
  // Show loading state - BUT NOT during playlist operations
  if (loading && !isAddingPlaylist) {
    return (
      <div style={{ padding: '1rem 2rem', marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ color: '#4fc38a', fontSize: '0.9rem' }}>Loading playlists...</div>
      </div>
    );
  }

    return (
    <div style={{ padding: '1rem 2rem', marginBottom: '1rem' }}>
      {/* Main Playlists Header - Hidden in standalone mode (port 5175) */}
      {!isStandalone && (
      <div 
          onClick={() => setSelectedPlaylist(selectedPlaylist === 'main' ? null : 'main')}
        style={{
            padding: '0.75rem 1.5rem',
            background: selectedPlaylist === 'main' ? 'rgba(79, 195, 138, 0.2)' : 'rgba(79, 195, 138, 0.08)',
            border: selectedPlaylist === 'main' ? '2px solid #4fc38a' : '1px solid rgba(79, 195, 138, 0.3)',
            borderRadius: '0.5rem',
            color: '#4fc38a',
                cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
            transition: 'all 0.2s ease',
            width: 'calc(100% + 3rem)',
            marginLeft: '-1.5rem',
            marginRight: '-1.5rem',
            fontWeight: 'bold',
            boxShadow: selectedPlaylist === 'main' ? '0 0 15px rgba(79, 195, 138, 0.4)' : 'none',
            position: 'relative'
          }}
        >
          <ThemeIcon 
            type={selectedPlaylist === 'main' ? 'minus' : 'down-arrow'} 
            size={20} 
              style={{ 
              position: 'absolute',
              left: '1.5rem'
            }}
          />
          <span style={{
            width: '100%',
            textAlign: 'center'
          }}>
            Playlists
          </span>
        </div>
      )}

      {/* When Playlists are CLOSED - Quick Upload Section (or always show in standalone mode) */}
      {(selectedPlaylist !== 'main' || isStandalone) && (
        <div style={{ marginBottom: '1rem' }}>
          {/* Quick upload explanation - Hidden in standalone mode */}
          {!isStandalone && (
            <div style={{ 
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#666',
              marginBottom: '1rem',
              lineHeight: '1.4'
            }}>
              no time for playlists?
            </div>
          )}

          {/* Big + button for quick upload with drag and drop */}
                <div style={{ 
                  textAlign: 'center', 
            padding: '0.5rem 0',
            marginBottom: '0.5rem'
          }}>
            <div
              onClick={handleQuickFileUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: isDragOver ? '2px dashed #4fc38a' : '2px dashed transparent',
                background: isDragOver ? 'rgba(79, 195, 138, 0.1)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!isDragOver) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragOver) {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              <div style={{
                width: '30px',
                height: '30px',
                background: '#4fc38a',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.2rem auto',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: '15px',
                  height: '15px',
                  background: 'white',
                  maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M12 5v14m-7-7h14'/%3E%3C/svg%3E")`,
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  maskSize: 'contain'
                }} />
                </div>
                <div style={{ 
                fontSize: '0.75rem', 
                color: '#4fc38a',
                fontWeight: '500',
                marginBottom: '0.1rem'
              }}>
                {isDragOver ? 'Drop your documents here!' : 'Drop or add documents (PDF, DOC, DOCX, TXT, PPT, PPTX) to use them in the chat'}
                </div>
            </div>
          </div>

          {/* Session quick uploads documents display */}
          {sortedQuickAccessDocuments.length > 0 && (
            <div style={{ 
              marginTop: '1rem',
              background: 'rgba(79, 195, 138, 0.05)',
              borderRadius: '0.5rem',
              padding: '0.75rem'
            }}>
              <div style={{ 
                fontSize: '0.85rem',
                color: '#4fc38a', 
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Quick Access:
              </div>
              {sortedQuickAccessDocuments.map((document) => (
                <div
                  key={document.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, document.id)}
                  onDragEnd={handleDragEnd}
                  onMouseDown={(e) => handleMouseDown(e, document.id)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={(e) => {
                    handleMouseLeave();
                    e.currentTarget.style.background = '#e4c97e';
                  }}
                  onClick={() => {
                    console.log('🔥🔥🔥 QUICK ACCESS DOCUMENT CLICKED:', document.name);
                    handleFileClick(document);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(228, 201, 126, 0.8)'}
                  style={{ 
                    padding: '0.4rem 0.6rem',
                    background: '#e4c97e',
                    border: '1px solid rgba(228, 201, 126, 0.3)',
                    borderRadius: '0.3rem',
                    color: '#2a2a2a',
                    fontSize: '0.8rem',
                    marginBottom: '0.3rem',
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: isDragging || draggedDocument === document.id ? 'grabbing' : 'pointer',
                    opacity: draggedDocument === document.id ? 0.5 : 1,
                    position: 'relative'
                  }}
                >
                  <div
                  style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.2rem',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease',
                      background: 'rgba(42, 42, 42, 0.1)',
                      boxShadow: '0 0 0 rgba(42, 42, 42, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#4fc38a';
                      e.currentTarget.style.boxShadow = '0 0 8px rgba(79, 195, 138, 0.6)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(42, 42, 42, 0.1)';
                      e.currentTarget.style.boxShadow = '0 0 0 rgba(42, 42, 42, 0.3)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <ThemeIcon type="send" size={12} style={{ background: '#2a2a2a' }} />
              </div>
                  <span style={{ 
                    flex: 1, 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>{document.name}</span>
              </div>
              ))}
            </div>
          )}
            </div>
          )}
          
      {/* When Playlists are OPENED - Full Playlist Management */}
      {selectedPlaylist === 'main' && (
        <div style={{ marginBottom: '1rem' }}>
          
          {/* Add new playlist button at the top */}
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addPlaylist();
              }}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{ 
                width: '40px',
                height: '40px',
                background: '#4fc38a',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem auto',
                transition: 'all 0.2s ease'
              }}>
                <ThemeIcon 
                  type="folder" 
                  size={20} 
                  style={{ background: 'white' }}
                />
              </div>
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#4fc38a',
                fontWeight: '500'
              }}>
                Click here to add a new playlist
              </div>
            </div>
          </div>

          {/* User-created playlists (centralized) - Show existing playlists first */}
            <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            {/* Debug message */}
            {sortedPlaylists.filter(p => p.name !== 'Quick Uploads History').length === 0 && (
              <div style={{ 
                padding: '1rem', 
                color: '#999', 
                textAlign: 'center',
                fontSize: '0.85rem',
                fontStyle: 'italic'
              }}>
                {loading ? 'Loading playlists...' : 'No saved playlists found. Use the button above to create your first playlist!'}
              </div>
            )}
            {sortedPlaylists.filter(p => p.name !== 'Quick Uploads History').map((playlist) => (
              <div 
                key={playlist.id} 
                style={{ marginBottom: '0.5rem', width: '100%' }}
                onDragOver={(e) => handlePlaylistDragOver(e, playlist.id)}
                onDragLeave={handlePlaylistDragLeave}
                onDrop={(e) => handlePlaylistDrop(e, playlist.id)}
              >
                <div
                style={{ 
                    padding: '0.5rem 1rem',
                    background: dragOverPlaylist === playlist.id ? 'rgba(79, 195, 138, 0.25)' : 
                              expandedPlaylists.has(playlist.id) ? 'rgba(79, 195, 138, 0.15)' : 'rgba(79, 195, 138, 0.05)',
                    border: dragOverPlaylist === playlist.id ? '3px solid #4fc38a' :
                           expandedPlaylists.has(playlist.id) ? '2px solid #4fc38a' : '1px solid rgba(79, 195, 138, 0.2)',
                    borderRadius: '0.4rem',
                  color: '#4fc38a',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: dragOverPlaylist === playlist.id ? '0 0 20px rgba(79, 195, 138, 0.6)' :
                              expandedPlaylists.has(playlist.id) ? '0 0 10px rgba(79, 195, 138, 0.3)' : 'none'
                  }}
                >
                  <div
                    onClick={(e) => {
                      // Don't toggle expansion when playlist is being edited
                      if (playlist.isEditing) {
                        e.stopPropagation();
                        return;
                      }
                      togglePlaylistExpansion(playlist.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1,
                      cursor: playlist.isEditing ? 'default' : 'pointer'
                    }}
                  >
                    <ThemeIcon 
                      type={expandedPlaylists.has(playlist.id) ? 'down-arrow' : 'hamburger'} 
                      size={14} 
                      style={expandedPlaylists.has(playlist.id) ? { transform: 'rotate(180deg)' } : undefined}
                    />
                    {playlist.isEditing ? (
                      <input
                        type="text"
                        value={playlist.name}
                        onChange={(e) => setPlaylists(playlists.map(p => 
                          p.id === playlist.id ? { ...p, name: e.target.value } : p
                        ))}
                        onBlur={() => handlePlaylistNameChange(playlist.id, playlist.name)}
                        onKeyDown={(e) => {
                          console.log('⌨️ Playlist input keydown:', e.key);
                          if (e.key === 'Enter') {
                            console.log('✅ Enter pressed - committing playlist name change');
                            e.preventDefault();
                            handlePlaylistNameChange(playlist.id, playlist.name);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#4fc38a',
                          fontSize: '0.9rem',
                          outline: 'none',
                          flex: 1,
                          textAlign: 'center'
                        }}
                        autoFocus
                      />
                    ) : (
                      <span 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditingPlaylist(playlist.id);
                        }}
                        style={{ flex: 1, cursor: 'pointer', textAlign: 'center' }}
                        title="Double-click to rename"
                      >
                        {playlist.name} ({getPlaylistDocumentCount(playlist.id)})
                      </span>
          )}
        </div>
                  
                  {/* Playlist Actions */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        showCustomDeleteConfirm('playlist', playlist.id, playlist.name);
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '0.2rem',
                        borderRadius: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete playlist"
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <ThemeIcon type="trash" size={12} />
      </div>
                  </div>
                </div>

                {/* Expanded playlist content */}
                {expandedPlaylists.has(playlist.id) && (
                  <div style={{ marginLeft: '0rem', marginTop: '0.5rem' }}>
                    {/* Documents in this playlist */}
                    {documents
                      .filter(doc => doc.playlistId === playlist.id)
                      .map((document) => (
                        <div
                          key={document.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, document.id)}
                          onDragEnd={handleDragEnd}
                          onMouseDown={(e) => handleMouseDown(e, document.id)}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseLeave}
                          onClick={(e) => {
                            // Single click sends to chat
                            console.log('🔥🔥🔥 PLAYLIST DOCUMENT CLICKED:', document.name);
                            e.stopPropagation();
                            handleFileClick(document);
                          }}
                          onDoubleClick={(e) => {
                            // Double click enables editing
                            e.stopPropagation();
                            setDocuments(documents.map(d => 
                              d.id === document.id ? { ...d, isEditing: true } : d
                            ));
                          }}
          style={{
                            padding: '0.5rem 0.8rem',
                            background: '#e4c97e',
                            border: '1px solid rgba(228, 201, 126, 0.3)',
                            borderRadius: '0.3rem',
                            color: '#2a2a2a',
                            fontSize: '0.85rem',
                            marginBottom: '0.4rem',
      display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            position: 'relative',
                            cursor: isDragging || draggedDocument === document.id ? 'grabbing' : 'pointer',
                            opacity: draggedDocument === document.id ? 0.5 : 1
                          }}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileClick(document);
                            }}
          style={{
                              cursor: 'pointer',
                              padding: '0.2rem',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              background: 'rgba(42, 42, 42, 0.1)',
                              boxShadow: '0 0 0 rgba(42, 42, 42, 0.3)'
                            }}
                            title="Send to chat"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#4fc38a';
                              e.currentTarget.style.boxShadow = '0 0 8px rgba(79, 195, 138, 0.6)';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(42, 42, 42, 0.1)';
                              e.currentTarget.style.boxShadow = '0 0 0 rgba(42, 42, 42, 0.3)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <ThemeIcon type="send" size={12} style={{ background: '#2a2a2a' }} />
                          </div>
                          
                          {document.isEditing ? (
                            <input
                              type="text"
                              value={document.name.split('.')[0]} // Show name without extension
                              onChange={(e) => setDocuments(documents.map(d => 
                                d.id === document.id ? { ...d, name: e.target.value } : d
                              ))}
                              onBlur={() => handleDocumentNameChange(document.id, document.name)}
                              onKeyDown={(e) => {
                                console.log('⌨️ Document input keydown:', e.key);
                                if (e.key === 'Enter') {
                                  console.log('✅ Enter pressed - committing document name change');
                                  e.preventDefault();
                                  handleDocumentNameChange(document.id, document.name);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                background: 'transparent',
            border: 'none',
                                color: '#2a2a2a',
                                fontSize: '0.85rem',
                                outline: 'none',
                                flex: 1
                              }}
                              autoFocus
                            />
                          ) : (
                            <span 
                              style={{ 
                                flex: 1, 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                cursor: 'pointer'
                              }}
                              title="Double-click to rename"
                            >
                              {document.name}
                            </span>
                          )}

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDocumentAction(document.id, 'copy', playlist.id);
                            }}
                            style={{
            cursor: 'pointer',
                              padding: '0.2rem',
                              borderRadius: '0.2rem',
            display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            title="Copy document"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(42, 42, 42, 0.1)';
                              e.currentTarget.style.boxShadow = '0 0 8px rgba(42, 42, 42, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <ThemeIcon type="copy" size={12} style={{ background: '#2a2a2a' }} />
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              showCustomDeleteConfirm('document', document.id, document.name);
                            }}
                            style={{
                              cursor: 'pointer',
                              padding: '0.2rem',
                              borderRadius: '0.2rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            title="Delete document"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                              e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.6)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <ThemeIcon type="trash" size={12} style={{ background: '#2a2a2a' }} />
                          </div>
                        </div>
                      ))}

                    {/* Upload section for this playlist - moved after documents */}
            <div style={{
                      textAlign: 'center',
                      padding: '1rem 0',
                      marginTop: '0.75rem'
                    }}>
                      <div
                        onClick={() => handlePlaylistFileUpload(playlist.id)}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
              <div style={{
                          width: '40px',
                          height: '40px',
                          background: '#4fc38a',
                          borderRadius: '50%',
      display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.5rem auto',
                          transition: 'all 0.2s ease'
              }}>
                <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'white',
                            maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M12 5v14m-7-7h14'/%3E%3C/svg%3E")`,
                            maskRepeat: 'no-repeat',
                            maskPosition: 'center',
                            maskSize: 'contain'
                }} />
              </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#666',
                          lineHeight: '1.4'
                        }}>
                          add to playlist
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ADD NEW PLAYLIST BUTTON - After existing playlists */}
          {/* Quick Uploads History folder (always at the bottom) */}
          {sortedPlaylists.filter(p => p.name === 'Quick Uploads History').map((playlist) => (
            <div 
              key={playlist.id} 
              style={{ marginBottom: '0.5rem' }}
              onDragOver={(e) => handlePlaylistDragOver(e, playlist.id)}
              onDragLeave={handlePlaylistDragLeave}
              onDrop={(e) => handlePlaylistDrop(e, playlist.id)}
            >
              <div
                style={{
                  padding: '0.5rem 1rem',
                  background: dragOverPlaylist === playlist.id ? 'rgba(79, 195, 138, 0.25)' :
                            expandedPlaylists.has(playlist.id) ? 'rgba(79, 195, 138, 0.15)' : 'rgba(79, 195, 138, 0.05)',
                  border: dragOverPlaylist === playlist.id ? '3px solid #4fc38a' :
                         expandedPlaylists.has(playlist.id) ? '2px solid #4fc38a' : '1px solid rgba(79, 195, 138, 0.2)',
                  borderRadius: '0.4rem',
                  color: '#4fc38a',
                fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  boxShadow: dragOverPlaylist === playlist.id ? '0 0 20px rgba(79, 195, 138, 0.6)' :
                            expandedPlaylists.has(playlist.id) ? '0 0 10px rgba(79, 195, 138, 0.3)' : 'none'
                }}
              >
                <div
                  onClick={() => togglePlaylistExpansion(playlist.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flex: 1,
                  cursor: 'pointer'
                }}
                >
                  <ThemeIcon 
                    type={expandedPlaylists.has(playlist.id) ? 'down-arrow' : 'hamburger'} 
                    size={14} 
                    style={expandedPlaylists.has(playlist.id) ? { transform: 'rotate(180deg)' } : undefined}
                  />
                  <span style={{ flex: 1, textAlign: 'center' }}>
                    {playlist.name} ({getPlaylistDocumentCount(playlist.id)})
                  </span>
                </div>
            </div>

              {/* Expanded Quick Uploads History content */}
              {expandedPlaylists.has(playlist.id) && (
                <div style={{ marginLeft: '0rem', marginTop: '0.5rem' }}>
                  {/* Documents in Quick Uploads History folder */}
                  {documents
                    .filter(doc => doc.playlistId === playlist.id)
                    .map((document) => (
                      <div
                        key={document.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, document.id)}
                        onDragEnd={handleDragEnd}
                        onMouseDown={(e) => handleMouseDown(e, document.id)}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => {
                          // Single click sends to chat
                          console.log('🔥🔥🔥 QUICK UPLOADS HISTORY DOCUMENT CLICKED:', document.name);
                          e.stopPropagation();
                          handleFileClick(document);
                        }}
                        onDoubleClick={(e) => {
                          // Double click enables editing
                          e.stopPropagation();
                          setDocuments(documents.map(d => 
                            d.id === document.id ? { ...d, isEditing: true } : d
                          ));
                        }}
                style={{
                          padding: '0.5rem 0.8rem',
                          background: '#e4c97e',
                          border: '1px solid rgba(228, 201, 126, 0.3)',
                          borderRadius: '0.3rem',
                          color: '#2a2a2a',
                          fontSize: '0.85rem',
                          marginBottom: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          position: 'relative',
                          cursor: isDragging || draggedDocument === document.id ? 'grabbing' : 'pointer',
                          opacity: draggedDocument === document.id ? 0.5 : 1
                        }}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileClick(document);
                          }}
                          style={{
                            cursor: 'pointer',
                            padding: '0.2rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            background: 'rgba(42, 42, 42, 0.1)',
                            boxShadow: '0 0 0 rgba(42, 42, 42, 0.3)'
                          }}
                          title="Send to chat"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#4fc38a';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(79, 195, 138, 0.6)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(42, 42, 42, 0.1)';
                            e.currentTarget.style.boxShadow = '0 0 0 rgba(42, 42, 42, 0.3)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <ThemeIcon type="send" size={12} style={{ background: '#2a2a2a' }} />
                        </div>
                        
                        {document.isEditing ? (
                <input
                  type="text"
                            value={document.name.split('.')[0]} // Show name without extension
                            onChange={(e) => setDocuments(documents.map(d => 
                              d.id === document.id ? { ...d, name: e.target.value } : d
                            ))}
                            onBlur={() => handleDocumentNameChange(document.id, document.name)}
                            onKeyDown={(e) => {
                              console.log('⌨️ Quick Upload document input keydown:', e.key);
                              if (e.key === 'Enter') {
                                console.log('✅ Enter pressed - committing quick upload document name change');
                                e.preventDefault();
                                handleDocumentNameChange(document.id, document.name);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                  style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#2a2a2a',
                              fontSize: '0.85rem',
                              outline: 'none',
                              flex: 1
                            }}
                            autoFocus
                          />
                        ) : (
                          <span 
                            style={{ 
                              flex: 1, 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              cursor: 'pointer'
                            }}
                            title="Double-click to rename"
                          >
                            {document.name}
                          </span>
                        )}

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentAction(document.id, 'copy', playlist.id);
                          }}
                style={{
                            cursor: 'pointer',
                            padding: '0.2rem',
                            borderRadius: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          title="Copy document"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(42, 42, 42, 0.1)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(42, 42, 42, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <ThemeIcon type="copy" size={12} style={{ background: '#2a2a2a' }} />
            </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            showCustomDeleteConfirm('document', document.id, document.name);
                          }}
              style={{
                            cursor: 'pointer',
                            padding: '0.2rem',
                            borderRadius: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
                          title="Delete document"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <ThemeIcon type="trash" size={12} style={{ background: '#2a2a2a' }} />
                        </div>
                      </div>
                    ))}
          </div>
        )}
            </div>
          ))}
        </div>
      )}
                    
      {/* Custom delete confirmation modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
        <div style={{
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
            padding: '2.5rem',
            borderRadius: '0.8rem',
            border: '2px solid rgba(79, 195, 138, 0.3)',
            minWidth: '350px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: 'rgba(220, 53, 69, 0.2)',
          display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ThemeIcon type="trash" size={24} style={{ background: '#dc3545' }} />
            </div>
            
            <h3 style={{ 
              color: '#4fc38a', 
              marginBottom: '0.5rem',
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              Delete {deleteConfirm.type === 'document' ? 'Document' : 'Playlist'}
            </h3>
            
            <p style={{
              color: '#ccc', 
              marginBottom: '2rem',
              lineHeight: '1.5',
              fontSize: '0.95rem'
            }}>
              Are you sure you want to delete<br />
              <strong style={{ color: '#fff' }}>"{deleteConfirm.name}"</strong>?<br />
              <span style={{ fontSize: '0.85rem', color: '#999' }}>
                This action cannot be undone.
              </span>
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.4rem',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                Cancel
              </button>
                  <button
                onClick={handleConfirmDelete}
                    style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                      border: 'none',
                  borderRadius: '0.4rem',
                  color: 'white',
                      cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.3)';
                }}
              >
                Delete
              </button>
                      </div>
                    </div>
        </div>
      )}
                    
      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
                      <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #4fc38a',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{
              color: '#4fc38a',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              Delete Playlist
                      </div>
                    <div style={{ 
              color: '#ccc',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              Are you sure you want to delete "{deleteConfirmation.playlistName}"?<br/>
              This action cannot be undone.
                    </div>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
                  <button
                onClick={cancelDelete}
                    style={{
                  padding: '0.75rem 1.5rem',
                      background: 'transparent',
                  border: '2px solid #4fc38a',
                  borderRadius: '0.375rem',
                      color: '#4fc38a',
                      cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Cancel
                  </button>
                  <button
                onClick={confirmDelete}
                    style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ff4444',
                  border: '2px solid #ff4444',
                  borderRadius: '0.375rem',
                  color: 'white',
                      cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                    }}
                  >
                Delete
                  </button>
                </div>
              </div>
        </div>
          )}
    </div>
  );
};

export default Resources;