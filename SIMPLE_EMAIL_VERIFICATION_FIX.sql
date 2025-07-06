-- 🚀 SIMPLE EMAIL VERIFICATION FIX
-- This addresses the most common issues preventing email verification from working

-- 1. Add missing INSERT policy (most common issue)
CREATE POLICY IF NOT EXISTS "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Ensure the RPC function exists and works
CREATE OR REPLACE FUNCTION public.check_email_verification_status(user_email TEXT)
RETURNS TABLE (
  user_id uuid,
  email text,
  email_confirmed boolean,
  email_confirmed_at timestamptz,
  tier text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.email_confirmed,
    u.email_confirmed_at,
    u.tier
  FROM public.users u
  WHERE u.email = user_email
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions for the RPC function
GRANT EXECUTE ON FUNCTION public.check_email_verification_status TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_verification_status TO authenticated;

-- 4. Fix the sync trigger
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS trigger AS $$
BEGIN
  -- Update public.users when auth.users email_confirmed_at changes
  UPDATE public.users 
  SET 
    email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
    email_confirmed_at = NEW.email_confirmed_at,
    updated_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the sync trigger
DROP TRIGGER IF EXISTS sync_email_verification ON auth.users;
CREATE TRIGGER sync_email_verification
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.sync_email_verification();

-- 6. Create user record for protest10 (current test user)
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

-- 7. Test the fix
SELECT 
  'TEST_RESULT' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'protest10@nexastream.co.uk') 
    THEN '✅ User record exists - email verification should work!'
    ELSE '❌ User record still missing'
  END as result;

-- 8. Show the user record
SELECT 
  'USER_RECORD' as status,
  id,
  email,
  email_confirmed,
  email_confirmed_at,
  tier
FROM public.users 
WHERE email = 'protest10@nexastream.co.uk';

-- 9. Test the RPC function
SELECT 
  'RPC_TEST' as status,
  * 
FROM public.check_email_verification_status('protest10@nexastream.co.uk'); 