-- Fix permissions for flashcards table
-- Run this in your Supabase SQL Editor

-- Grant permissions on flashcards table
GRANT ALL ON flashcards TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can insert own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can update own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can delete own flashcards" ON flashcards;

-- Add user_id column if it doesn't exist
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create or replace function to automatically set user_id
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_user_id_trigger ON flashcards;

-- Create trigger to automatically set user_id on insert
CREATE TRIGGER set_user_id_trigger
    BEFORE INSERT ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- Create comprehensive RLS policies for flashcards
CREATE POLICY "Users can view own flashcards" ON flashcards
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flashcards" ON flashcards
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Allow insert since user_id will be set automatically

CREATE POLICY "Users can update own flashcards" ON flashcards
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards" ON flashcards
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Check the results
SELECT schemaname, tablename, rowsecurity, rowsecurityforced 
FROM pg_tables 
WHERE tablename = 'flashcards';

SELECT policyname, tablename, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'flashcards'; 