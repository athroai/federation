-- FOLDER STRUCTURE MIGRATION
-- Run this in your Supabase SQL Editor

-- Create folders table for user-created organization
CREATE TABLE IF NOT EXISTS folders (
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

-- Enable RLS for folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
DROP POLICY IF EXISTS "Users can manage their own folders" ON folders;
CREATE POLICY "Users can manage their own folders" ON folders
    FOR ALL USING (auth.uid() = user_id);

-- Add folder_path columns to existing tables (only if they don't exist)
DO $$ 
BEGIN
    -- Add to resources table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'folder_path') THEN
        ALTER TABLE resources ADD COLUMN folder_path VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'custom_folder') THEN
        ALTER TABLE resources ADD COLUMN custom_folder VARCHAR(255);
    END IF;
    
    -- Add to flashcards table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'folder_path') THEN
        ALTER TABLE flashcards ADD COLUMN folder_path VARCHAR(500);
    END IF;
    
    -- Add to quick_notes table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_notes' AND column_name = 'folder_path') THEN
        ALTER TABLE quick_notes ADD COLUMN folder_path VARCHAR(500);
    END IF;
    
    -- Add to full_notes table  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'full_notes' AND column_name = 'folder_path') THEN
        ALTER TABLE full_notes ADD COLUMN folder_path VARCHAR(500);
    END IF;
    
    -- Add to mind_maps table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mind_maps' AND column_name = 'folder_path') THEN
        ALTER TABLE mind_maps ADD COLUMN folder_path VARCHAR(500);
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_folders_user_athro ON folders(user_id, athro_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_path ON folders(user_id, parent_path);
CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(user_id, folder_type);

-- Add indexes to existing tables for folder_path
CREATE INDEX IF NOT EXISTS idx_resources_folder_path ON resources(user_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_flashcards_folder_path ON flashcards(user_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_quick_notes_folder_path ON quick_notes(user_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_full_notes_folder_path ON full_notes(user_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_mind_maps_folder_path ON mind_maps(user_id, folder_path);

-- Success message
SELECT 'Folder structure migration completed successfully!' as message; 