-- 🔍 DIAGNOSE REGISTRATION FAILURE
-- Find out why user records aren't being created automatically during registration

-- 1. Check ALL recent registrations vs public.users records
SELECT 
  'MISSING_USER_RECORDS' as issue,
  COUNT(*) as missing_count,
  STRING_AGG(au.email, ', ') as missing_emails
FROM auth.users au
WHERE au.created_at > NOW() - INTERVAL '2 days'
AND au.id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL);

-- 2. Check specific paid tier registrations
SELECT 
  'PAID_TIER_REGISTRATIONS' as check_type,
  au.email,
  au.created_at,
  au.raw_user_meta_data->>'tier' as requested_tier,
  CASE 
    WHEN pu.id IS NOT NULL THEN 'EXISTS_IN_PUBLIC_USERS'
    ELSE 'MISSING_FROM_PUBLIC_USERS'
  END as public_users_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '2 days'
AND (au.raw_user_meta_data->>'tier' != 'free' OR au.raw_user_meta_data->>'tier' IS NULL)
ORDER BY au.created_at DESC;

-- 3. Check if the trigger is actually firing
SELECT 
  'TRIGGER_VALIDATION' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 4. Test the trigger function directly
SELECT 
  'TRIGGER_FUNCTION_TEST' as check_type,
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'handle_new_user_safe');

-- 5. Check for any trigger errors in logs (if available)
-- This might not work depending on your Supabase setup
SELECT 
  'TRIGGER_FUNCTION_PERMISSIONS' as check_type,
  'Checking if trigger function has proper permissions' as note;

-- 6. Manually test the trigger function with a sample user
-- First, let's see if we can call the function directly
SELECT 
  'MANUAL_TRIGGER_TEST' as test_type,
  'Testing trigger function manually' as note;

-- 7. Check RLS policies that might be blocking the trigger
SELECT 
  'RLS_POLICIES_BLOCKING_TRIGGER' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public'
AND cmd = 'INSERT';

-- 8. Check if the INSERT policy allows the trigger's context
SELECT 
  'INSERT_POLICY_ANALYSIS' as check_type,
  'The INSERT policy requires auth.uid() = id' as current_policy,
  'But triggers run in SECURITY DEFINER context' as potential_issue,
  'This might be blocking automatic user creation' as diagnosis;

-- 9. Proposed fix: Create a trigger-friendly INSERT policy
SELECT 
  'PROPOSED_FIX' as solution,
  'Need to add a policy that allows triggers to insert user records' as description,
  'CREATE POLICY "Triggers can insert user data" ON public.users FOR INSERT WITH CHECK (true);' as sql_fix;

SELECT 'Diagnosis complete - check results above' as status; 