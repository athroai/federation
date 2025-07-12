-- Add folder structure support to existing tables
-- This creates the foundation for the organized folder system

-- Add folder_path to resources table
ALTER TABLE resources ADD COLUMN folder_path VARCHAR(500);
ALTER TABLE resources ADD COLUMN custom_folder VARCHAR(255);

-- Add folder_path to study tools tables  
ALTER TABLE flashcards ADD COLUMN folder_path VARCHAR(500);
ALTER TABLE quick_notes ADD COLUMN folder_path VARCHAR(500);
ALTER TABLE full_notes ADD COLUMN folder_path VARCHAR(500);
ALTER TABLE mind_maps ADD COLUMN folder_path VARCHAR(500);

-- Create folders table for user-created organization
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_path VARCHAR(500) NOT NULL,
    full_path VARCHAR(500) NOT NULL,
    athro_id VARCHAR(100) NOT NULL,
    folder_type VARCHAR(50) NOT NULL, -- 'resources' or 'tools'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, full_path)
);

-- Create indexes for better performance
CREATE INDEX idx_folders_user_athro ON folders(user_id, athro_id);
CREATE INDEX idx_folders_parent_path ON folders(user_id, parent_path);
CREATE INDEX idx_folders_type ON folders(user_id, folder_type);

-- Add indexes to existing tables for folder_path
CREATE INDEX idx_resources_folder_path ON resources(user_id, folder_path);
CREATE INDEX idx_flashcards_folder_path ON flashcards(user_id, folder_path);
CREATE INDEX idx_quick_notes_folder_path ON quick_notes(user_id, folder_path);
CREATE INDEX idx_full_notes_folder_path ON full_notes(user_id, folder_path);
CREATE INDEX idx_mind_maps_folder_path ON mind_maps(user_id, folder_path);

-- Enable RLS for folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Users can manage their own folders" ON folders
    FOR ALL USING (auth.uid() = user_id);

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  athro_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist_documents table
CREATE TABLE IF NOT EXISTS playlist_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  athro_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  session_id UUID REFERENCES study_history(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for playlists and documents
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_athro_id ON playlists(athro_id);
CREATE INDEX IF NOT EXISTS idx_playlist_documents_playlist_id ON playlist_documents(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_documents_athro_id ON playlist_documents(athro_id);
CREATE INDEX IF NOT EXISTS idx_playlist_documents_session_id ON playlist_documents(session_id);

-- Enable RLS for playlists and documents
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for playlists
CREATE POLICY "Users can view their own playlists" ON playlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists" ON playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON playlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON playlists
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for playlist documents
CREATE POLICY "Users can view documents in their playlists" ON playlist_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_documents.playlist_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert documents to their playlists" ON playlist_documents
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_documents.playlist_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update documents in their playlists" ON playlist_documents
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_documents.playlist_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete documents from their playlists" ON playlist_documents
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_documents.playlist_id AND user_id = auth.uid()
  ));

-- Migration script to move existing data to new folder structure
-- Resources: "Uploads/Upload Resources/{athro-name}-resources/"
-- Tools: "Uploads/All Study Tools/{athro-name}-tools/{tool-type}/" 