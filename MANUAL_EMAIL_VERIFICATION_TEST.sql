-- 🧪 MANUAL EMAIL VERIFICATION TEST
-- Use this to simulate email verification for testing

-- 1. Check current status
SELECT 
  'BEFORE_VERIFICATION' as step,
  au.id,
  au.email,
  au.email_confirmed_at as auth_confirmed_at,
  pu.email_confirmed as public_confirmed,
  pu.email_confirmed_at as public_confirmed_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'protest10@nexastream.co.uk';

-- 2. Manually verify the email in auth.users (simulating email link click)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'protest10@nexastream.co.uk' 
AND email_confirmed_at IS NULL;

-- 3. Check if trigger synced to public.users
SELECT 
  'AFTER_VERIFICATION' as step,
  au.id,
  au.email,
  au.email_confirmed_at as auth_confirmed_at,
  pu.email_confirmed as public_confirmed,
  pu.email_confirmed_at as public_confirmed_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'protest10@nexastream.co.uk';

-- 4. Test the RPC function that the frontend uses
SELECT 
  'RPC_FUNCTION_TEST' as step,
  * 
FROM public.check_email_verification_status('protest10@nexastream.co.uk');

-- 5. Reset for testing (if needed)
-- Uncomment these lines to reset the verification status
-- UPDATE auth.users 
-- SET email_confirmed_at = NULL
-- WHERE email = 'protest10@nexastream.co.uk';
-- 
-- UPDATE public.users 
-- SET email_confirmed = FALSE, email_confirmed_at = NULL
-- WHERE email = 'protest10@nexastream.co.uk';

SELECT 'Manual email verification test complete!' as status; 