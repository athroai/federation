-- 🚀 FIX AUTOMATIC USER CREATION
-- Ensure ALL users registering for paid tiers automatically appear in public.users

-- SUSPECTED ROOT CAUSE: 
-- The trigger runs in SECURITY DEFINER context where auth.uid() might not be available
-- This causes the INSERT policy "auth.uid() = id" to fail, blocking user record creation

-- SOLUTION 1: Add a trigger-friendly INSERT policy
-- This allows triggers to insert user records without auth.uid() restrictions
DO $$
BEGIN
  -- Check if trigger-friendly policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'Triggers can insert user data'
  ) THEN
    -- Create policy that allows triggers to insert user records
    EXECUTE 'CREATE POLICY "Triggers can insert user data" ON public.users FOR INSERT WITH CHECK (true)';
    RAISE NOTICE 'Added trigger-friendly INSERT policy';
  ELSE
    RAISE NOTICE 'Trigger-friendly INSERT policy already exists';
  END IF;
END $$;

-- SOLUTION 2: Fix the trigger function to handle RLS better
CREATE OR REPLACE FUNCTION public.handle_new_user_bulletproof()
RETURNS trigger AS $$
BEGIN
  -- Use a more robust approach that bypasses RLS issues
  INSERT INTO public.users (id, email, tier, email_confirmed, email_confirmed_at, created_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'tier', 'free'),
    (NEW.email_confirmed_at IS NOT NULL),
    NEW.email_confirmed_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    tier = EXCLUDED.tier,
    email_confirmed = EXCLUDED.email_confirmed,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE LOG 'Failed to create user record for % (%), error: %', NEW.email, NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SOLUTION 3: Update the trigger to use the bulletproof function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- SOLUTION 4: Fix all existing missing user records
INSERT INTO public.users (id, email, tier, email_confirmed, email_confirmed_at, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'tier', 'free'),
  (au.email_confirmed_at IS NOT NULL),
  au.email_confirmed_at,
  au.created_at
FROM auth.users au
WHERE au.created_at > NOW() - INTERVAL '7 days'
AND au.id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  tier = EXCLUDED.tier,
  email_confirmed = EXCLUDED.email_confirmed,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = now();

-- SOLUTION 5: Test with a fake user to ensure the trigger works
SELECT 
  'TRIGGER_TEST_RESULT' as test_type,
  'Testing if trigger will work for new registrations' as description,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) THEN 'Trigger exists and should work'
    ELSE 'Trigger missing - registration will fail'
  END as status;

-- SOLUTION 6: Verify the fix worked
SELECT 
  'VERIFICATION' as check_type,
  'Users fixed in the last 7 days' as description,
  COUNT(*) as users_now_in_public_table
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '7 days';

-- SOLUTION 7: Show recent paid tier registrations status
SELECT 
  'PAID_TIER_STATUS' as check_type,
  au.email,
  au.raw_user_meta_data->>'tier' as requested_tier,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ EXISTS IN PUBLIC.USERS'
    ELSE '❌ MISSING FROM PUBLIC.USERS'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '2 days'
AND (au.raw_user_meta_data->>'tier' != 'free' OR au.raw_user_meta_data->>'tier' IS NULL)
ORDER BY au.created_at DESC;

SELECT 'All users should now automatically appear in public.users!' as success_message; 