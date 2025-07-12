-- Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'flashcards' 
ORDER BY ordinal_position;

-- Refresh the schema cache (this requires admin privileges)
-- SELECT schema_cache_refresh();

-- Alternative: Check if the session_id column exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'flashcards' 
  AND column_name = 'session_id'
) as session_id_exists; 