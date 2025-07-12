import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Playlist {
  id: string;
  name: string;
  athroId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDocument {
  id: string;
  playlistId: string;
  athroId: string;
  name: string;
  fileType: string;
  storagePath: string;
  fileSize: number;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export class PlaylistService {
  private static instance: PlaylistService;

  private constructor() {}

  static getInstance(): PlaylistService {
    if (!PlaylistService.instance) {
      PlaylistService.instance = new PlaylistService();
    }
    return PlaylistService.instance;
  }

  // Helper method to validate user and throw appropriate error
  private async validateUser(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated. Please log in and try again.');
    }
    return user.id;
  }

  // Helper method to handle Supabase errors
  private handleError(error: any, operation: string): never {
    console.error(`Error in PlaylistService.${operation}:`, error);
    if (error?.message?.includes('JWTExpired')) {
      throw new Error('Your session has expired. Please log in again.');
    }
    if (error?.message?.includes('not found')) {
      throw new Error(`Resource not found during ${operation}. Please refresh and try again.`);
    }
    throw new Error(`Failed to ${operation}. Please try again.`);
  }

  // ===================== PLAYLIST METHODS =====================

  /**
   * Get all playlists for a specific athro
   */
  async getPlaylists(athroId: string): Promise<Playlist[]> {
    try {
      const userId = await this.validateUser();

      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(p => ({
        id: p.id,
        name: p.name,
        athroId: p.athro_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    } catch (error) {
      this.handleError(error, 'get playlists');
    }
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(athroId: string, name: string): Promise<Playlist> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          athro_id: athroId,
          name: name,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        athroId: data.athro_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Update playlist name
   */
  async updatePlaylist(playlistId: string, name: string): Promise<Playlist> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('playlists')
        .update({ name })
        .eq('id', playlistId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        athroId: data.athro_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  /**
   * Delete a playlist and all its documents
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // First get all documents in this playlist to delete their files from storage
      const documents = await this.getDocuments(playlistId);
      
      // Delete files from storage
      for (const doc of documents) {
        if (doc.storagePath) {
          await supabase.storage
            .from('playlist-documents')
            .remove([doc.storagePath]);
        }
      }

      // Delete the playlist (documents will be cascade deleted due to foreign key)
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  /**
   * Ensure Quick Uploads History playlist exists (and handle duplicates)
   */
  async ensureQuickUploadsPlaylist(athroId: string): Promise<Playlist> {
    try {
      const playlists = await this.getPlaylists(athroId);
      const quickUploadsPlaylists = playlists.filter(p => p.name === 'Quick Uploads History');
      
      if (quickUploadsPlaylists.length === 0) {
        // Create the Quick Uploads History playlist
        return await this.createPlaylist(athroId, 'Quick Uploads History');
      }
      
      if (quickUploadsPlaylists.length === 1) {
        // Perfect - return the single playlist
        return quickUploadsPlaylists[0];
      }
      
      // Handle duplicates - keep the oldest one and merge all documents into it
      console.warn(`Found ${quickUploadsPlaylists.length} Quick Uploads History playlists, merging duplicates...`);
      
      // Sort by creation date to keep the oldest
      const sortedPlaylists = quickUploadsPlaylists.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const keepPlaylist = sortedPlaylists[0];
      const duplicatePlaylists = sortedPlaylists.slice(1);
      
      // Move all documents from duplicate playlists to the main one
      for (const duplicatePlaylist of duplicatePlaylists) {
        const documents = await this.getDocuments(duplicatePlaylist.id);
        for (const document of documents) {
          await this.moveDocument(document.id, keepPlaylist.id);
        }
        // Delete the empty duplicate playlist
        await this.deletePlaylist(duplicatePlaylist.id);
      }
      
      console.log(`Merged ${duplicatePlaylists.length} duplicate Quick Uploads History playlists into one`);
      return keepPlaylist;
    } catch (error) {
      console.error('Error ensuring quick uploads playlist:', error);
      throw error;
    }
  }

  // ===================== DOCUMENT METHODS =====================

  /**
   * Get all documents in a specific playlist
   */
  async getDocuments(playlistId: string): Promise<PlaylistDocument[]> {
    try {
      const userId = await this.validateUser();

      const { data, error } = await supabase
        .from('playlist_documents')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(d => ({
        id: d.id,
        playlistId: d.playlist_id,
        athroId: d.athro_id,
        name: d.name,
        fileType: d.file_type,
        storagePath: d.storage_path,
        fileSize: d.file_size,
        sessionId: d.session_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (error) {
      this.handleError(error, 'get documents');
    }
  }

  /**
   * Get all documents for an athro (across all playlists)
   */
  async getAllDocuments(athroId: string): Promise<PlaylistDocument[]> {
    try {
      const userId = await this.validateUser();

      const { data, error } = await supabase
        .from('playlist_documents')
        .select('*')
        .eq('athro_id', athroId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(d => ({
        id: d.id,
        playlistId: d.playlist_id,
        athroId: d.athro_id,
        name: d.name,
        fileType: d.file_type,
        storagePath: d.storage_path,
        fileSize: d.file_size,
        sessionId: d.session_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (error) {
      this.handleError(error, 'get all documents');
    }
  }

  /**
   * Get a specific document by ID
   */
  async getDocumentById(documentId: string): Promise<PlaylistDocument | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('playlist_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return {
        id: data.id,
        playlistId: data.playlist_id,
        athroId: data.athro_id,
        name: data.name,
        fileType: data.file_type,
        storagePath: data.storage_path,
        fileSize: data.file_size,
        sessionId: data.session_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error getting document by ID:', error);
      throw error;
    }
  }

  /**
   * Upload document(s) to a playlist
   */
  async uploadDocuments(files: FileList, playlistId: string, athroId: string, sessionId?: string): Promise<PlaylistDocument[]> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const uploadedDocs: PlaylistDocument[] = [];

      for (const file of Array.from(files)) {
        // Generate unique file path
        const fileExtension = file.name.split('.').pop() || '';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const filePath = `${user.id}/${athroId}/${fileName}`;

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('playlist-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file to storage:', uploadError);
          continue; // Skip this file and continue with others
        }

        // Create document record in database
        const { data, error: insertError } = await supabase
          .from('playlist_documents')
          .insert({
            playlist_id: playlistId,
            athro_id: athroId,
            name: file.name,
            file_type: file.type,
            storage_path: filePath,
            file_size: file.size,
            session_id: sessionId,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting document record:', insertError);
          // Clean up the uploaded file
          await supabase.storage.from('playlist-documents').remove([filePath]);
          continue;
        }

        uploadedDocs.push({
          id: data.id,
          playlistId: data.playlist_id,
          athroId: data.athro_id,
          name: data.name,
          fileType: data.file_type,
          storagePath: data.storage_path,
          fileSize: data.file_size,
          sessionId: data.session_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }

      return uploadedDocs;
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    }
  }

  /**
   * Update document name
   */
  async updateDocument(documentId: string, name: string): Promise<PlaylistDocument> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('playlist_documents')
        .update({ name })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        playlistId: data.playlist_id,
        athroId: data.athro_id,
        name: data.name,
        fileType: data.file_type,
        storagePath: data.storage_path,
        fileSize: data.file_size,
        sessionId: data.session_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Move document to another playlist
   */
  async moveDocument(documentId: string, newPlaylistId: string): Promise<PlaylistDocument> {
    try {
      console.log('🔧 PlaylistService.moveDocument STARTED');
      console.log('📋 Document ID:', documentId);
      console.log('📁 New Playlist ID:', newPlaylistId);
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        console.error('❌ User not authenticated in moveDocument');
        throw new Error('User not authenticated');
      }
      
      console.log('👤 User authenticated:', user.id);
      
      // First, let's check if the document exists and get its current state
      console.log('🔍 Checking current document state...');
      const { data: currentDoc, error: fetchError } = await supabase
        .from('playlist_documents')
        .select('*')
        .eq('id', documentId)
        .single();
        
      if (fetchError) {
        console.error('❌ Error fetching document for move:', fetchError);
        throw fetchError;
      }
      
      if (!currentDoc) {
        console.error('❌ Document not found for move operation');
        throw new Error('Document not found');
      }
      
      console.log('📄 Current document state:', {
        id: currentDoc.id,
        name: currentDoc.name,
        current_playlist: currentDoc.playlist_id,
        target_playlist: newPlaylistId
      });
      
      if (currentDoc.playlist_id === newPlaylistId) {
        console.log('ℹ️ Document already in target playlist, no move needed');
        // Return the document as-is
        return {
          id: currentDoc.id,
          playlistId: currentDoc.playlist_id,
          athroId: currentDoc.athro_id,
          name: currentDoc.name,
          fileType: currentDoc.file_type,
          storagePath: currentDoc.storage_path,
          fileSize: currentDoc.file_size,
          sessionId: currentDoc.session_id,
          createdAt: currentDoc.created_at,
          updatedAt: currentDoc.updated_at,
        };
      }

      console.log('📤 Executing database update...');
      const { data, error } = await supabase
        .from('playlist_documents')
        .update({ playlist_id: newPlaylistId })
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        console.error('❌ Database update error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        throw error;
      }
      
      if (!data) {
        console.error('❌ No data returned from update operation');
        throw new Error('No data returned from move operation');
      }

      console.log('✅ Database update successful');
      console.log('📄 Updated document data:', {
        id: data.id,
        name: data.name,
        old_playlist: currentDoc.playlist_id,
        new_playlist: data.playlist_id,
        update_successful: data.playlist_id === newPlaylistId
      });

      const result = {
        id: data.id,
        playlistId: data.playlist_id,
        athroId: data.athro_id,
        name: data.name,
        fileType: data.file_type,
        storagePath: data.storage_path,
        fileSize: data.file_size,
        sessionId: data.session_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      console.log('✅ PlaylistService.moveDocument COMPLETED SUCCESSFULLY');
      return result;
      
    } catch (error) {
      console.error('❌ PlaylistService.moveDocument FAILED:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Copy document to another playlist
   */
  async copyDocument(documentId: string, newPlaylistId: string): Promise<PlaylistDocument> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Get the original document
      const { data: originalDoc, error: fetchError } = await supabase
        .from('playlist_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy of the document record (the file stays the same in storage)
      const { data, error } = await supabase
        .from('playlist_documents')
        .insert({
          playlist_id: newPlaylistId,
          athro_id: originalDoc.athro_id,
          name: `${originalDoc.name} (Copy)`,
          file_type: originalDoc.file_type,
          storage_path: originalDoc.storage_path, // Same file path
          file_size: originalDoc.file_size,
          session_id: originalDoc.session_id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        playlistId: data.playlist_id,
        athroId: data.athro_id,
        name: data.name,
        fileType: data.file_type,
        storagePath: data.storage_path,
        fileSize: data.file_size,
        sessionId: data.session_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error copying document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Get the document to find the storage path
      const { data: doc, error: fetchError } = await supabase
        .from('playlist_documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Check if any other documents use the same file before deleting
      const { data: otherDocs, error: checkError } = await supabase
        .from('playlist_documents')
        .select('id')
        .eq('storage_path', doc.storage_path)
        .neq('id', documentId);

      if (checkError) throw checkError;

      // Delete the document record
      const { error: deleteError } = await supabase
        .from('playlist_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      // Only delete the file from storage if no other documents reference it
      if (!otherDocs || otherDocs.length === 0) {
        await supabase.storage
          .from('playlist-documents')
          .remove([doc.storage_path]);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a document
   */
  async getDocumentUrl(storagePath: string): Promise<string> {
    try {
      const { data } = supabase.storage
        .from('playlist-documents')
        .getPublicUrl(storagePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      throw error;
    }
  }

  /**
   * Get documents by session ID (for quick uploads tracking)
   */
  async getSessionDocuments(sessionId: string, athroId: string): Promise<PlaylistDocument[]> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('playlist_documents')
        .select('*')
        .eq('athro_id', athroId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        playlistId: d.playlist_id,
        athroId: d.athro_id,
        name: d.name,
        fileType: d.file_type,
        storagePath: d.storage_path,
        fileSize: d.file_size,
        sessionId: d.session_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (error) {
      console.error('Error getting session documents:', error);
      throw error;
    }
  }
}

export default PlaylistService.getInstance(); 