-- CLEAR ALL USERS EXCEPT athroai@nexastream.co.uk
-- ⚠️  WARNING: This will permanently delete ALL users and their data except athroai@nexastream.co.uk
-- 
-- INSTRUCTIONS:
-- 1. Run this in your Supabase SQL Editor
-- 2. Review the BEFORE CLEANUP output to confirm what will be deleted
-- 3. The script will preserve athroai@nexastream.co.uk and all their data
-- 4. All other users and their associated data will be permanently removed

-- Step 1: Show current users before cleanup
SELECT 'BEFORE CLEANUP - Current users:' as status;
SELECT 
    email, 
    created_at, 
    CASE 
        WHEN email = 'athroai@nexastream.co.uk' THEN '🔒 WILL BE PRESERVED' 
        ELSE '❌ WILL BE DELETED' 
    END as action
FROM auth.users 
ORDER BY created_at;

-- Step 2: Show admin user details
SELECT 'Admin user to preserve:' as status, email, id, created_at 
FROM auth.users 
WHERE email = 'athroai@nexastream.co.uk';

-- Step 3: Execute cleanup while preserving admin user
DO $$
DECLARE
    admin_user_id UUID;
    users_to_delete INTEGER;
    deleted_count INTEGER := 0;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'athroai@nexastream.co.uk';
    
    -- Check if admin user exists
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL ERROR: Admin user athroai@nexastream.co.uk not found! Aborting cleanup to prevent data loss.';
        RETURN;
    END IF;
    
    -- Count users that will be deleted
    SELECT COUNT(*) INTO users_to_delete 
    FROM auth.users 
    WHERE id != admin_user_id;
    
    RAISE NOTICE '🔒 Preserving admin user: % (ID: %)', 'athroai@nexastream.co.uk', admin_user_id;
    RAISE NOTICE '❌ Will delete % other users and all their data', users_to_delete;
    
    -- Delete user data from workspace tables
    DELETE FROM flashcards WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % flashcards from non-admin users', deleted_count;
    
    DELETE FROM study_notes WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % study notes from non-admin users', deleted_count;
    
    DELETE FROM mind_maps WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % mind maps from non-admin users', deleted_count;
    
    DELETE FROM resources WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % resources from non-admin users', deleted_count;
    
    DELETE FROM study_history WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % study history records from non-admin users', deleted_count;
    
    -- Delete user data from dashboard tables
    DELETE FROM subject_preferences WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % subject preferences from non-admin users', deleted_count;
    
    DELETE FROM user_preferences WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user preferences from non-admin users', deleted_count;
    
    DELETE FROM wellbeing_data WHERE user_id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % wellbeing data records from non-admin users', deleted_count;
    
    -- Delete profiles for non-admin users
    DELETE FROM profiles WHERE id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % profiles from non-admin users', deleted_count;
    
    -- Delete from tables that may or may not exist
    BEGIN
        DELETE FROM athro_selections WHERE user_id != admin_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % athro selections from non-admin users', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'athro_selections table does not exist, skipping';
    END;
    
    BEGIN
        DELETE FROM chat_sessions WHERE user_id != admin_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % chat sessions from non-admin users', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'chat_sessions table does not exist, skipping';
    END;
    
    BEGIN
        DELETE FROM flashcard_sessions WHERE user_id != admin_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % flashcard sessions from non-admin users', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'flashcard_sessions table does not exist, skipping';
    END;
    
    -- Finally delete non-admin auth users
    DELETE FROM auth.users WHERE id != admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '❌ Deleted % non-admin users from auth.users', deleted_count;
    
    RAISE NOTICE '✅ CLEANUP COMPLETED SUCCESSFULLY';
    RAISE NOTICE '🔒 Preserved user: athroai@nexastream.co.uk';
    RAISE NOTICE '📊 Database now contains only the admin user and their data';
END $$;

-- Step 4: Verify cleanup results
SELECT '🎯 AFTER CLEANUP - Remaining users:' as status;
SELECT 
    email, 
    created_at, 
    '✅ PRESERVED' as status
FROM auth.users 
ORDER BY created_at;

-- Step 5: Show data counts after cleanup
SELECT '📊 DATA SUMMARY AFTER CLEANUP:' as status;
SELECT 
    'profiles' as table_name, 
    COUNT(*) as remaining_records 
FROM profiles
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users
UNION ALL
SELECT 'subject_preferences', COUNT(*) FROM subject_preferences
UNION ALL
SELECT 'user_preferences', COUNT(*) FROM user_preferences
UNION ALL
SELECT 'wellbeing_data', COUNT(*) FROM wellbeing_data
UNION ALL
SELECT 'flashcards', COUNT(*) FROM flashcards
UNION ALL
SELECT 'study_notes', COUNT(*) FROM study_notes
UNION ALL
SELECT 'mind_maps', COUNT(*) FROM mind_maps;

-- Final confirmation
SELECT '✅ CLEANUP COMPLETED SUCCESSFULLY!' as final_status;
SELECT 'Only athroai@nexastream.co.uk remains in the database.' as confirmation; 