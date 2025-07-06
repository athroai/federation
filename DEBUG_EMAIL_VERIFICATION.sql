-- 🔍 COMPREHENSIVE EMAIL VERIFICATION DEBUG SCRIPT
-- Run this in your Supabase SQL Editor to diagnose all issues

-- =============================================
-- PART 1: CHECK DATABASE STRUCTURE
-- =============================================

-- Check if users table exists and has correct structure
SELECT 
  'users_table_structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies on users table
SELECT 
  'users_table_policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- =============================================
-- PART 2: CHECK CURRENT TEST USER
-- =============================================

-- Check if protest10 exists in auth.users
SELECT 
  'auth_users_check' as check_type,
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'protest10@nexastream.co.uk';

-- Check if protest10 exists in public.users
SELECT 
  'public_users_check' as check_type,
  id,
  email,
  email_confirmed,
  email_confirmed_at,
  tier,
  created_at
FROM public.users 
WHERE email = 'protest10@nexastream.co.uk';

-- =============================================
-- PART 3: CHECK FUNCTIONS AND TRIGGERS
-- =============================================

-- Check if RPC function exists
SELECT 
  'rpc_function_check' as check_type,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'check_email_verification_status' 
AND routine_schema = 'public';

-- Check if sync trigger exists
SELECT 
  'sync_trigger_check' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('sync_email_verification', 'on_auth_user_created');

-- Check if handle_new_user function exists
SELECT 
  'handle_new_user_function_check' as check_type,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'handle_new_user_safe') 
AND routine_schema = 'public';

-- =============================================
-- PART 4: TEST THE RPC FUNCTION
-- =============================================

-- Test the RPC function directly
SELECT 
  'rpc_function_test' as check_type,
  * 
FROM public.check_email_verification_status('protest10@nexastream.co.uk');

-- =============================================
-- PART 5: APPLY MISSING FIXES
-- =============================================

-- Add missing INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'Users can insert own data'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id)';
    RAISE NOTICE 'Added INSERT policy for users table';
  ELSE
    RAISE NOTICE 'INSERT policy already exists';
  END IF;
END $$;

-- Create/update the user record for protest10
INSERT INTO public.users (id, email, tier, email_confirmed, email_confirmed_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'tier', 'free'),
  (au.email_confirmed_at IS NOT NULL),
  au.email_confirmed_at
FROM auth.users au
WHERE au.email = 'protest10@nexastream.co.uk'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  tier = EXCLUDED.tier,
  email_confirmed = EXCLUDED.email_confirmed,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = now();

-- =============================================
-- PART 6: VERIFY THE FIX
-- =============================================

-- Test the RPC function again after fix
SELECT 
  'rpc_function_test_after_fix' as check_type,
  * 
FROM public.check_email_verification_status('protest10@nexastream.co.uk');

-- Check final state of public.users
SELECT 
  'final_users_check' as check_type,
  id,
  email,
  email_confirmed,
  email_confirmed_at,
  tier,
  created_at,
  updated_at
FROM public.users 
WHERE email = 'protest10@nexastream.co.uk';

-- =============================================
-- PART 7: SUMMARY
-- =============================================

-- Final summary
SELECT 
  'SUMMARY' as check_type,
  'Email verification system status:' as message,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'protest10@nexastream.co.uk') 
    THEN '✅ User record exists'
    ELSE '❌ User record missing'
  END as user_record_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own data')
    THEN '✅ INSERT policy exists'
    ELSE '❌ INSERT policy missing'
  END as insert_policy_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'check_email_verification_status')
    THEN '✅ RPC function exists'
    ELSE '❌ RPC function missing'
  END as rpc_function_status; 