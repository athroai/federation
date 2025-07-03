-- SUPABASE USER CLEANUP SCRIPT
-- ⚠️  WARNING: THIS WILL DELETE ALL USERS AND RELATED DATA
-- Run this in your Supabase SQL Editor

-- 1. First, delete all user-related data (respects foreign key constraints)
DELETE FROM subject_preferences;
DELETE FROM user_preferences; 
DELETE FROM wellbeing_data;
DELETE FROM flashcards;
DELETE FROM flashcard_sessions;
DELETE FROM study_notes;
DELETE FROM mind_maps;
DELETE FROM mind_map_nodes;
DELETE FROM mind_map_edges;
DELETE FROM study_sessions;
DELETE FROM athro_selections;
DELETE FROM chat_sessions;

-- 2. Delete profile data
DELETE FROM profiles;

-- 3. Finally, delete auth users (this will cascade to auth-related tables)
-- Note: This requires RLS to be disabled or admin privileges
DELETE FROM auth.users;

-- 4. Reset any sequences if needed
-- ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART WITH 1;

-- 5. Verify cleanup
SELECT 'Users remaining:' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles remaining:', COUNT(*) FROM profiles
UNION ALL
SELECT 'Subject preferences remaining:', COUNT(*) FROM subject_preferences
UNION ALL
SELECT 'User preferences remaining:', COUNT(*) FROM user_preferences
UNION ALL
SELECT 'Wellbeing data remaining:', COUNT(*) FROM wellbeing_data
UNION ALL
SELECT 'Flashcards remaining:', COUNT(*) FROM flashcards
UNION ALL
SELECT 'Study notes remaining:', COUNT(*) FROM study_notes;

-- Success message
SELECT 'All users and related data have been deleted!' as status; 