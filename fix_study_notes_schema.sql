-- Fix study_notes table schema by adding missing columns
-- Run this SQL in your Supabase SQL editor

-- Add missing columns to study_notes table
ALTER TABLE study_notes 
ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'QUICK',
ADD COLUMN IF NOT EXISTS folder_path TEXT,
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_notes_note_type ON study_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_study_notes_deleted ON study_notes(deleted);
CREATE INDEX IF NOT EXISTS idx_study_notes_folder_path ON study_notes(folder_path);

-- Update existing records to have a default note_type if they don't have one
UPDATE study_notes SET note_type = 'QUICK' WHERE note_type IS NULL;

-- Add constraint to ensure note_type is either QUICK or FULL
ALTER TABLE study_notes 
ADD CONSTRAINT check_note_type 
CHECK (note_type IN ('QUICK', 'FULL'));

-- Update the updated_at trigger to include new columns
-- This ensures that any update to the record updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_study_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_study_notes_updated_at ON study_notes;
CREATE TRIGGER update_study_notes_updated_at
    BEFORE UPDATE ON study_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_study_notes_updated_at(); 