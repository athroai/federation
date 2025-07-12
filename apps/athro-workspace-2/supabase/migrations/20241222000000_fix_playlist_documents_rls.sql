-- Fix RLS policy for playlist_documents to allow moving documents between user's playlists
-- The existing UPDATE policy only checks the old playlist_id, blocking moves to new playlists

-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update documents in their playlists" ON playlist_documents;

-- Create a more permissive UPDATE policy that allows moves between user's playlists
-- This checks if the user owns EITHER the source playlist (for the document being moved)
-- OR the target playlist (where it's being moved to)
CREATE POLICY "Users can update documents in their playlists" ON playlist_documents
  FOR UPDATE USING (
    -- User owns the source playlist (document's current playlist)
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE id = playlist_documents.playlist_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- User owns the target playlist (where document is being moved)
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE id = playlist_documents.playlist_id 
      AND user_id = auth.uid()
    )
  );
