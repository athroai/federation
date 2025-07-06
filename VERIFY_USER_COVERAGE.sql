-- 🔍 VERIFY USER COVERAGE
-- Check which users are now covered: existing vs new registrants

-- 1. EXISTING USERS STATUS (Last 7 days)
SELECT 
  'EXISTING_USERS_COVERAGE' as check_type,
  'Users from last 7 days' as scope,
  COUNT(*) as total_auth_users,
  COUNT(pu.id) as users_in_public_table,
  COUNT(*) - COUNT(pu.id) as still_missing,
  ROUND(100.0 * COUNT(pu.id) / COUNT(*), 1) as coverage_percentage
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '7 days';

-- 2. DETAILED EXISTING USERS STATUS
SELECT 
  'EXISTING_USERS_DETAILED' as check_type,
  au.email,
  au.created_at,
  au.raw_user_meta_data->>'tier' as requested_tier,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ FIXED - Now in public.users'
    ELSE '❌ STILL MISSING from public.users'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '7 days'
ORDER BY au.created_at DESC;

-- 3. FUTURE USERS STATUS (Trigger verification)
SELECT 
  'FUTURE_USERS_PROTECTION' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) THEN '✅ PROTECTED - Trigger exists for future registrations'
    ELSE '❌ NOT PROTECTED - Future registrations will fail'
  END as trigger_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Triggers can insert user data'
    ) THEN '✅ POLICY EXISTS - Triggers can insert users'
    ELSE '❌ POLICY MISSING - Triggers will be blocked'
  END as policy_status;

-- 4. PAID TIER USERS SPECIFICALLY
SELECT 
  'PAID_TIER_USERS' as check_type,
  'Users who registered for paid tiers' as scope,
  au.email,
  au.raw_user_meta_data->>'tier' as tier,
  au.created_at,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ CAN USE EMAIL VERIFICATION'
    ELSE '❌ EMAIL VERIFICATION WILL FAIL'
  END as email_verification_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '7 days'
AND (au.raw_user_meta_data->>'tier' IN ('lite', 'pro', 'premium') 
     OR au.raw_user_meta_data->>'tier' IS NULL)
ORDER BY au.created_at DESC;

-- 5. SUMMARY REPORT
SELECT 
  'SUMMARY_REPORT' as report_type,
  (
    SELECT COUNT(*) 
    FROM auth.users au
    JOIN public.users pu ON au.id = pu.id
    WHERE au.created_at > NOW() - INTERVAL '7 days'
  ) as existing_users_fixed,
  (
    SELECT COUNT(*) 
    FROM auth.users au
    WHERE au.created_at > NOW() - INTERVAL '7 days'
    AND au.id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
  ) as existing_users_still_missing,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) AND EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Triggers can insert user data'
    ) THEN 'YES - Future registrations protected'
    ELSE 'NO - Future registrations will fail'
  END as future_registrations_protected;

-- 6. SPECIFIC USERS WE'VE BEEN TESTING
SELECT 
  'TEST_USERS_STATUS' as check_type,
  au.email,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ READY FOR EMAIL VERIFICATION'
    ELSE '❌ NEEDS MANUAL FIX'
  END as status,
  pu.email_confirmed,
  pu.email_confirmed_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IN ('protest10@nexastream.co.uk', 'protest20@nexastream.co.uk')
ORDER BY au.email;

SELECT 'Verification complete! Check results above.' as status; 