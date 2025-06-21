-- Add user_id column to documents table for proper RLS
-- Run this in your Supabase SQL editor

ALTER TABLE documents 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing RLS policies to use the new user_id column
-- You'll need to recreate the policies in the Supabase dashboard with:
-- Policy definition: auth.uid() = user_id 