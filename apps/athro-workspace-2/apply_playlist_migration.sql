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

-- Create storage bucket for playlist documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'playlist-documents',
  'playlist-documents',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/csv',
    'application/json',
    'text/markdown',
    'text/html'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the playlist-documents bucket
CREATE POLICY "Users can upload their own playlist documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'playlist-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own playlist documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'playlist-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own playlist documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'playlist-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own playlist documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'playlist-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  ); 