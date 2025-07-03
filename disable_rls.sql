-- Disable RLS for document tables to allow unauthenticated access during development
-- Run this in your Supabase SQL editor

ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_logs DISABLE ROW LEVEL SECURITY;

-- Also create a policy that allows all operations if you prefer to keep RLS enabled
-- CREATE POLICY "Allow all operations for documents" ON documents
-- FOR ALL USING (true) WITH CHECK (true); 