-- Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources',
  'resources',
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

-- Create RLS policies for the resources bucket
CREATE POLICY "Users can upload their own resources" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resources' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own resources" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resources' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own resources" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resources' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own resources" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resources' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

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