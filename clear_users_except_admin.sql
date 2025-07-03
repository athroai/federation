-- SUPABASE USER CLEANUP SCRIPT - KEEP ADMIN ONLY
-- ⚠️  This will delete ALL users EXCEPT athroai@nexastream.co.uk
-- Run this in your Supabase SQL Editor

-- First, let's see what we're working with
SELECT 'BEFORE CLEANUP - Current users:' as status;
SELECT email, created_at FROM auth.users ORDER BY created_at;

-- Get the admin user ID to preserve
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'athroai@nexastream.co.uk';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user athroai@nexastream.co.uk not found!';
    ELSE
        RAISE NOTICE 'Found admin user: %', admin_user_id;
        
        -- Delete user-related data for non-admin users
        DELETE FROM subject_preferences 
        WHERE user_id != admin_user_id;
        
        DELETE FROM user_preferences 
        WHERE user_id != admin_user_id;
        
        DELETE FROM wellbeing_data 
        WHERE user_id != admin_user_id;
        
        DELETE FROM flashcards 
        WHERE user_id != admin_user_id;
        
        DELETE FROM flashcard_sessions 
        WHERE user_id != admin_user_id;
        
        DELETE FROM study_notes 
        WHERE user_id != admin_user_id;
        
        DELETE FROM mind_maps 
        WHERE user_id != admin_user_id;
        
        DELETE FROM mind_map_nodes 
        WHERE mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id != admin_user_id
        );
        
        DELETE FROM mind_map_edges 
        WHERE mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id != admin_user_id
        );
        
        DELETE FROM study_sessions 
        WHERE user_id != admin_user_id;
        
        DELETE FROM athro_selections 
        WHERE user_id != admin_user_id;
        
        DELETE FROM chat_sessions 
        WHERE user_id != admin_user_id;
        
        -- Delete profiles for non-admin users
        DELETE FROM profiles 
        WHERE id != admin_user_id;
        
        -- Delete auth users (except admin)
        DELETE FROM auth.users 
        WHERE id != admin_user_id;
        
        RAISE NOTICE 'Cleanup completed - admin user preserved';
    END IF;
END $$;

-- Verify cleanup results
SELECT 'AFTER CLEANUP - Remaining users:' as status;
SELECT email, created_at, user_metadata FROM auth.users ORDER BY created_at;

SELECT 'Data counts after cleanup:' as status;
SELECT 
    'Profiles' as table_name, 
    COUNT(*) as count 
FROM profiles
UNION ALL
SELECT 'Subject preferences', COUNT(*) FROM subject_preferences
UNION ALL
SELECT 'User preferences', COUNT(*) FROM user_preferences
UNION ALL
SELECT 'Wellbeing data', COUNT(*) FROM wellbeing_data;

SELECT 'Cleanup completed successfully! Only athroai@nexastream.co.uk remains.' as final_status; 