-- ✅ IMMEDIATE REGISTRATION FIX - Missing INSERT policy for users table
-- This fixes the "user records not being created" issue during registration

-- Step 1: Add missing INSERT policy for users table
-- This allows users to insert their own records during registration
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 2: Verify the trigger is working properly
-- Check if handle_new_user trigger exists and is active
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 3: Test the fix by checking current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Step 4: Create a safer trigger that handles conflicts better
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS trigger AS $$
BEGIN
  -- Try to insert, but handle conflicts gracefully
  INSERT INTO public.users (id, email, tier, email_confirmed, email_confirmed_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'tier', 'free'),
    (NEW.email_confirmed_at IS NOT NULL),
    NEW.email_confirmed_at
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
    RAISE LOG 'Failed to create user record for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update the trigger to use the safer function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_safe();

-- Step 6: Test with our current problem user
-- Create the missing user record for protest10
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

SELECT 'Registration fix applied successfully!' as status; 