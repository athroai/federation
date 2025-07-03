-- SAFE SUPABASE USER CLEANUP SCRIPT
-- Alternative approach that handles RLS and permission issues

-- Temporarily disable RLS (if you have permissions)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE wellbeing_data DISABLE ROW LEVEL SECURITY;

-- Count users before deletion
SELECT 'BEFORE CLEANUP:' as status, COUNT(*) as user_count FROM auth.users;

-- Delete user data in correct order (child tables first)
TRUNCATE TABLE subject_preferences CASCADE;
TRUNCATE TABLE user_preferences CASCADE;
TRUNCATE TABLE wellbeing_data CASCADE;
TRUNCATE TABLE flashcards CASCADE;
TRUNCATE TABLE flashcard_sessions CASCADE;
TRUNCATE TABLE study_notes CASCADE;
TRUNCATE TABLE mind_maps CASCADE;
TRUNCATE TABLE mind_map_nodes CASCADE;
TRUNCATE TABLE mind_map_edges CASCADE;
TRUNCATE TABLE study_sessions CASCADE;
TRUNCATE TABLE athro_selections CASCADE;
TRUNCATE TABLE chat_sessions CASCADE;

-- Delete profiles
TRUNCATE TABLE profiles CASCADE;

-- For auth.users, we might need to use the Supabase admin API
-- But let's try direct delete first:
DELETE FROM auth.users;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellbeing_data ENABLE ROW LEVEL SECURITY;

-- Verify cleanup
SELECT 'AFTER CLEANUP:' as status, COUNT(*) as user_count FROM auth.users;
SELECT 'Profiles remaining:' as table_name, COUNT(*) as count FROM profiles;

SELECT 'Cleanup completed successfully!' as final_status; 