-- SAFE USER CLEANUP - Keep athroai@nexastream.co.uk only
-- This version checks if tables exist before deleting

-- First, see current users
SELECT 'BEFORE CLEANUP:' as status, email, created_at FROM auth.users ORDER BY created_at;

-- Get admin user info
SELECT 'Admin user found:' as status, email, id FROM auth.users WHERE email = 'athroai@nexastream.co.uk';

-- Safe cleanup with table existence checks
DO $$
DECLARE
    admin_user_id UUID;
    table_exists BOOLEAN;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'athroai@nexastream.co.uk';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user athroai@nexastream.co.uk not found!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found admin user: %', admin_user_id;
    
    -- Delete from subject_preferences if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subject_preferences'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM subject_preferences WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned subject_preferences';
    END IF;
    
    -- Delete from user_preferences if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_preferences'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM user_preferences WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned user_preferences';
    END IF;
    
    -- Delete from wellbeing_data if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'wellbeing_data'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM wellbeing_data WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned wellbeing_data';
    END IF;
    
    -- Delete from flashcards if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'flashcards'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM flashcards WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned flashcards';
    END IF;
    
    -- Delete from study_notes if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'study_notes'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM study_notes WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned study_notes';
    END IF;
    
    -- Delete from mind_maps if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mind_maps'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM mind_maps WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned mind_maps';
    END IF;
    
    -- Delete from athro_selections if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'athro_selections'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM athro_selections WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned athro_selections';
    END IF;
    
    -- Delete from chat_sessions if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chat_sessions'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM chat_sessions WHERE user_id != admin_user_id;
        RAISE NOTICE 'Cleaned chat_sessions';
    END IF;
    
    -- Delete from profiles (this should exist)
    DELETE FROM profiles WHERE id != admin_user_id;
    RAISE NOTICE 'Cleaned profiles';
    
    -- Delete auth users (except admin)
    DELETE FROM auth.users WHERE id != admin_user_id;
    RAISE NOTICE 'Cleaned auth users';
    
    RAISE NOTICE 'Cleanup completed successfully!';
END $$;

-- Verify results
SELECT 'AFTER CLEANUP:' as status, email, created_at FROM auth.users;
SELECT 'Profiles remaining:' as table_name, COUNT(*) as count FROM profiles; 