-- SIMPLE CLEANUP - Keep athroai@nexastream.co.uk only
-- Copy and paste each section separately if needed

-- 1. First, check current users
SELECT email, id FROM auth.users WHERE email != 'athroai@nexastream.co.uk';

-- 2. Delete non-admin user data (run this first)
DELETE FROM subject_preferences 
WHERE user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'athroai@nexastream.co.uk'
);

DELETE FROM user_preferences 
WHERE user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'athroai@nexastream.co.uk'
);

DELETE FROM wellbeing_data 
WHERE user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'athroai@nexastream.co.uk'
);

DELETE FROM profiles 
WHERE id NOT IN (
    SELECT id FROM auth.users WHERE email = 'athroai@nexastream.co.uk'
);

-- 3. Delete non-admin auth users (run this last)
DELETE FROM auth.users 
WHERE email != 'athroai@nexastream.co.uk';

-- 4. Verify only admin remains
SELECT 'Remaining user:' as status, email FROM auth.users; 