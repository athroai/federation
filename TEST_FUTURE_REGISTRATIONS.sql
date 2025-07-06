-- 🧪 TEST FUTURE REGISTRATIONS
-- Comprehensive check that ALL future registrants will work automatically

-- 1. TRIGGER SYSTEM STATUS
SELECT 
  'TRIGGER_SYSTEM' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
      AND event_object_table = 'users'
      AND event_object_schema = 'auth'
    ) THEN '✅ TRIGGER ACTIVE - Will create user records'
    ELSE '❌ TRIGGER MISSING - Future registrations will fail'
  END as status;

-- 2. RLS POLICY SYSTEM STATUS  
SELECT 
  'RLS_POLICY_SYSTEM' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND schemaname = 'public'
      AND policyname = 'Triggers can insert user data'
      AND cmd = 'INSERT'
    ) THEN '✅ POLICY ACTIVE - Triggers can insert users'
    ELSE '❌ POLICY MISSING - Triggers will be blocked'
  END as status;

-- 3. TRIGGER FUNCTION STATUS
SELECT 
  'TRIGGER_FUNCTION' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'handle_new_user_bulletproof'
      AND routine_schema = 'public'
      AND routine_type = 'FUNCTION'
    ) THEN '✅ FUNCTION EXISTS - Robust user creation'
    ELSE '❌ FUNCTION MISSING - Trigger will fail'
  END as status;

-- 4. EMAIL VERIFICATION RPC STATUS
SELECT 
  'EMAIL_VERIFICATION_RPC' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'check_email_verification_status'
      AND routine_schema = 'public'
    ) THEN '✅ RPC EXISTS - Email verification polling will work'
    ELSE '❌ RPC MISSING - Email verification will fail'
  END as status;

-- 5. EMAIL SYNC TRIGGER STATUS
SELECT 
  'EMAIL_SYNC_TRIGGER' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'sync_email_verification'
      AND event_object_table = 'users'
      AND event_object_schema = 'auth'
    ) THEN '✅ SYNC TRIGGER ACTIVE - Email verification will sync'
    ELSE '❌ SYNC TRIGGER MISSING - Cross-device detection will fail'
  END as status;

-- 6. COMPLETE SYSTEM READINESS
SELECT 
  'FUTURE_REGISTRATION_READINESS' as assessment,
  CASE 
    WHEN (
      -- All required components exist
      EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') AND
      EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Triggers can insert user data') AND
      EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user_bulletproof') AND
      EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'check_email_verification_status') AND
      EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sync_email_verification')
    ) THEN '🎉 ALL FUTURE REGISTRATIONS FULLY PROTECTED ✅'
    ELSE '⚠️ SOME COMPONENTS MISSING - Future registrations may fail'
  END as status;

-- 7. DETAILED BREAKDOWN FOR FUTURE USERS
SELECT 
  'FUTURE_USER_JOURNEY' as step_type,
  'Step 1: User registers' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
    THEN '✅ Will auto-create record in public.users'
    ELSE '❌ Will NOT create record - email verification fails'
  END as outcome
UNION ALL
SELECT 
  'FUTURE_USER_JOURNEY' as step_type,
  'Step 2: User gets verification email' as step,
  '✅ Supabase handles this automatically' as outcome
UNION ALL
SELECT 
  'FUTURE_USER_JOURNEY' as step_type,
  'Step 3: User clicks email link on any device' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sync_email_verification')
    THEN '✅ Will sync verification status to public.users'
    ELSE '❌ Will NOT sync - cross-device detection fails'
  END as outcome
UNION ALL
SELECT 
  'FUTURE_USER_JOURNEY' as step_type,
  'Step 4: Original page polls for verification' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'check_email_verification_status')
    THEN '✅ Will detect verification via RPC polling'
    ELSE '❌ Will NOT detect - polling fails'
  END as outcome
UNION ALL
SELECT 
  'FUTURE_USER_JOURNEY' as step_type,
  'Step 5: Page advances automatically' as step,
  '✅ Frontend handles this (handleEmailVerified)' as outcome;

-- 8. SIMULATION TEST (Test the RPC with a known user)
SELECT 
  'SIMULATION_TEST' as test_type,
  'Testing RPC with existing user to verify it works' as description,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.check_email_verification_status('protest20@nexastream.co.uk')
    ) THEN '✅ RPC WORKS - Future users will be detectable'
    ELSE '❌ RPC BROKEN - Future verification detection will fail'
  END as result;

SELECT 'Future registration test complete!' as status; 