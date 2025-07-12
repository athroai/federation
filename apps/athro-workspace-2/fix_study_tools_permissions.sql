-- Fix permissions for flashcards, notes, and mindmaps tables
-- Run this in your Supabase SQL Editor

-- Ensure all study tools tables exist with correct structure
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_history(id) ON DELETE CASCADE,
  athro_id TEXT,
  subject TEXT,
  topic TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  repetition_count INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'UNRATED',
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  review_interval TEXT,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_history(id) ON DELETE CASCADE,
  athro_id TEXT,
  subject TEXT,
  topic TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  review_status TEXT DEFAULT 'REVIEWED',
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_history(id) ON DELETE CASCADE,
  athro_id TEXT,
  subject TEXT,
  topic TEXT,
  root_node JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  athro_id TEXT,
  title TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  resources TEXT[] DEFAULT '{}',
  mind_maps TEXT[] DEFAULT '{}',
  notes TEXT[] DEFAULT '{}',
  flashcards TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Temporarily disable RLS to clean up policies
ALTER TABLE flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
-- Flashcards policies
DROP POLICY IF EXISTS "Users can view their own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can insert their own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can update their own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can delete their own flashcards" ON flashcards;

-- Study notes policies
DROP POLICY IF EXISTS "Users can view their own study notes" ON study_notes;
DROP POLICY IF EXISTS "Users can insert their own study notes" ON study_notes;
DROP POLICY IF EXISTS "Users can update their own study notes" ON study_notes;
DROP POLICY IF EXISTS "Users can delete their own study notes" ON study_notes;

-- Mind maps policies
DROP POLICY IF EXISTS "Users can view their own mind maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can insert their own mind maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can update their own mind maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can delete their own mind maps" ON mind_maps;

-- Study history policies
DROP POLICY IF EXISTS "Users can view their own study history" ON study_history;
DROP POLICY IF EXISTS "Users can insert their own study history" ON study_history;
DROP POLICY IF EXISTS "Users can update their own study history" ON study_history;
DROP POLICY IF EXISTS "Users can delete their own study history" ON study_history;

-- Grant necessary permissions to authenticated users
GRANT ALL ON flashcards TO authenticated;
GRANT ALL ON study_notes TO authenticated;
GRANT ALL ON mind_maps TO authenticated;
GRANT ALL ON study_history TO authenticated;

-- Re-enable RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_history ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for FLASHCARDS
CREATE POLICY "Enable read access for own flashcards"
    ON flashcards FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for own flashcards"
    ON flashcards FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for own flashcards"
    ON flashcards FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for own flashcards"
    ON flashcards FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for STUDY_NOTES
CREATE POLICY "Enable read access for own study notes"
    ON study_notes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for own study notes"
    ON study_notes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for own study notes"
    ON study_notes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for own study notes"
    ON study_notes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for MIND_MAPS
CREATE POLICY "Enable read access for own mind maps"
    ON mind_maps FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for own mind maps"
    ON mind_maps FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for own mind maps"
    ON mind_maps FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for own mind maps"
    ON mind_maps FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for STUDY_HISTORY
CREATE POLICY "Enable read access for own study history"
    ON study_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for own study history"
    ON study_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for own study history"
    ON study_history FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for own study history"
    ON study_history FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_athro_id ON flashcards(athro_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deleted ON flashcards(deleted);

CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_athro_id ON study_notes(athro_id);

CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_athro_id ON mind_maps(athro_id);

CREATE INDEX IF NOT EXISTS idx_study_history_user_id ON study_history(user_id);
CREATE INDEX IF NOT EXISTS idx_study_history_athro_id ON study_history(athro_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
DROP TRIGGER IF EXISTS update_study_notes_updated_at ON study_notes;
DROP TRIGGER IF EXISTS update_mind_maps_updated_at ON mind_maps;
DROP TRIGGER IF EXISTS update_study_history_updated_at ON study_history;

CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_notes_updated_at
    BEFORE UPDATE ON study_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_maps_updated_at
    BEFORE UPDATE ON mind_maps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_history_updated_at
    BEFORE UPDATE ON study_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test the permissions by showing table info
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('flashcards', 'study_notes', 'mind_maps', 'study_history');

-- Show the current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('flashcards', 'study_notes', 'mind_maps', 'study_history')
ORDER BY tablename, policyname; 