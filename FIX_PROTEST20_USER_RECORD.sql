-- 🚀 FIX PROTEST20 USER RECORD
-- The user registered but no record was created in public.users

-- 1. Check if user exists in auth.users
SELECT 
  'AUTH_USERS_CHECK' as step,
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'protest20@nexastream.co.uk';

-- 2. Check if user exists in public.users (should be empty)
SELECT 
  'PUBLIC_USERS_CHECK' as step,
  id,
  email,
  email_confirmed,
  email_confirmed_at,
  tier,
  created_at
FROM public.users 
WHERE email = 'protest20@nexastream.co.uk';

-- 3. Create the missing user record
INSERT INTO public.users (id, email, tier, email_confirmed, email_confirmed_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'tier', 'free'),
  (au.email_confirmed_at IS NOT NULL),
  au.email_confirmed_at
FROM auth.users au
WHERE au.email = 'protest20@nexastream.co.uk'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  tier = EXCLUDED.tier,
  email_confirmed = EXCLUDED.email_confirmed,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = now();

-- 4. Verify the user record was created
SELECT 
  'USER_RECORD_CREATED' as step,
  id,
  email,
  email_confirmed,
  email_confirmed_at,
  tier,
  created_at
FROM public.users 
WHERE email = 'protest20@nexastream.co.uk';

-- 5. Test the RPC function that the frontend uses
SELECT 
  'RPC_FUNCTION_TEST' as step,
  * 
FROM public.check_email_verification_status('protest20@nexastream.co.uk');

-- 6. Check if the trigger is working by looking at recent registrations
SELECT 
  'RECENT_REGISTRATIONS_CHECK' as step,
  'Missing user records in public.users' as issue,
  COUNT(*) as auth_users_count
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '1 day'
AND id NOT IN (SELECT id FROM public.users);

-- 7. Check trigger status
SELECT 
  'TRIGGER_STATUS' as step,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'protest20 user record fixed!' as status; 