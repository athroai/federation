-- Temporarily remove foreign key constraint to allow temp sessions
-- Run this in Supabase SQL Editor

-- Drop the foreign key constraint on flashcards.session_id
ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS flashcards_session_id_fkey;

-- Make session_id just a text field instead of UUID reference
ALTER TABLE flashcards ALTER COLUMN session_id TYPE TEXT;

-- Do the same for other tables to be consistent
ALTER TABLE study_notes DROP CONSTRAINT IF EXISTS study_notes_session_id_fkey;
ALTER TABLE study_notes ALTER COLUMN session_id TYPE TEXT;

ALTER TABLE mind_maps DROP CONSTRAINT IF EXISTS mind_maps_session_id_fkey; 
ALTER TABLE mind_maps ALTER COLUMN session_id TYPE TEXT;

ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_session_id_fkey;
ALTER TABLE resources ALTER COLUMN session_id TYPE TEXT;

-- Add index for performance since we removed the FK index
CREATE INDEX IF NOT EXISTS idx_flashcards_session_id_text ON flashcards(session_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_session_id_text ON study_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_session_id_text ON mind_maps(session_id);
CREATE INDEX IF NOT EXISTS idx_resources_session_id_text ON resources(session_id); 
 
 
 
 