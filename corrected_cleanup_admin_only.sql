-- CORRECTED USER CLEANUP - Keep athroai@nexastream.co.uk only
-- Based on actual database schema from migration files

-- First, see current users
SELECT 'BEFORE CLEANUP:' as status, email, created_at FROM auth.users ORDER BY created_at;

-- Get admin user info
SELECT 'Admin user found:' as status, email, id FROM auth.users WHERE email = 'athroai@nexastream.co.uk';

-- Safe cleanup based on actual tables
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
        RETURN;
    END IF;
    
    RAISE NOTICE 'Preserving admin user: %', admin_user_id;
    
    -- Delete user data from actual tables (workspace-2 tables)
    DELETE FROM flashcards WHERE user_id != admin_user_id;
    DELETE FROM study_notes WHERE user_id != admin_user_id;
    DELETE FROM mind_maps WHERE user_id != admin_user_id;
    DELETE FROM resources WHERE user_id != admin_user_id;
    DELETE FROM study_history WHERE user_id != admin_user_id;
    
    -- Delete user data from dashboard tables
    DELETE FROM subject_preferences WHERE user_id != admin_user_id;
    DELETE FROM user_preferences WHERE user_id != admin_user_id;
    DELETE FROM wellbeing_data WHERE user_id != admin_user_id;
    DELETE FROM profiles WHERE id != admin_user_id;
    
    -- Delete other possible tables (if they exist)
    BEGIN
        DELETE FROM athro_selections WHERE user_id != admin_user_id;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'athro_selections table does not exist, skipping';
    END;
    
    BEGIN
        DELETE FROM chat_sessions WHERE user_id != admin_user_id;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'chat_sessions table does not exist, skipping';
    END;
    
    -- Finally delete non-admin auth users
    DELETE FROM auth.users WHERE id != admin_user_id;
    
    RAISE NOTICE 'Cleanup completed successfully';
END $$;

-- Verify cleanup
SELECT 'AFTER CLEANUP:' as status, email, created_at FROM auth.users; 