-- 🔍 SIMPLE STATUS CHECK
-- Check if the email verification fix worked

-- 1. Are the test users ready?
SELECT 
  au.email,
  CASE 
    WHEN pu.id IS NOT NULL THEN 'READY FOR EMAIL VERIFICATION ✅'
    ELSE 'STILL MISSING FROM PUBLIC.USERS ❌'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IN ('protest10@nexastream.co.uk', 'protest20@nexastream.co.uk')
ORDER BY au.email; 