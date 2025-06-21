-- Test script to verify user exists in auth.users
-- Run this in your Supabase SQL editor

-- Check if the user exists
SELECT 
    id,
    email,
    created_at,
    updated_at
FROM auth.users 
WHERE id = '8a21b9fb-1621-4267-8700-92aa3e65b681';

-- If the above returns a row, the user exists
-- If it returns no rows, that's the problem

-- Also check the documents table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
    AND column_name = 'user_id';

-- Check current foreign key constraints on documents table
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'documents'; 