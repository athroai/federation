-- Create playlist tables for the Resources component
-- Run this in your Supabase SQL editor

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
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  athro_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT, -- Path in Supabase Storage
  file_size BIGINT,
  session_id TEXT, -- For quick uploads tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_athro_id ON playlists(athro_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_athro ON playlists(user_id, athro_id);

CREATE INDEX IF NOT EXISTS idx_playlist_documents_user_id ON playlist_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_documents_playlist_id ON playlist_documents(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_documents_athro_id ON playlist_documents(athro_id);
CREATE INDEX IF NOT EXISTS idx_playlist_documents_session_id ON playlist_documents(session_id);

-- Enable RLS
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

-- Create RLS policies for playlist_documents
CREATE POLICY "Users can view their own playlist documents" ON playlist_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlist documents" ON playlist_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlist documents" ON playlist_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlist documents" ON playlist_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlist_documents_updated_at BEFORE UPDATE ON playlist_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 