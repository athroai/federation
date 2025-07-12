-- Add email verification tracking to public.users table
-- This enables production-grade cross-device email verification

-- Step 1: Add email_confirmed field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- Step 2: Create function to sync email verification status from auth.users
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

-- Step 3: Create trigger to automatically sync email verification
DROP TRIGGER IF EXISTS sync_email_verification ON auth.users;
CREATE TRIGGER sync_email_verification
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.sync_email_verification();

-- Step 4: Update existing users table function to include email_confirmed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create RPC function for checking verification status (production-safe)
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

-- Step 6: Grant permissions for the RPC function
GRANT EXECUTE ON FUNCTION public.check_email_verification_status TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_verification_status TO authenticated;

-- Step 7: Sync existing users from auth.users to ensure data consistency
INSERT INTO public.users (id, email, tier, email_confirmed, email_confirmed_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'tier', 'free'),
  (au.email_confirmed_at IS NOT NULL),
  au.email_confirmed_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Step 8: Update existing users with current verification status
UPDATE public.users 
SET 
  email_confirmed = (
    SELECT (email_confirmed_at IS NOT NULL) 
    FROM auth.users 
    WHERE auth.users.id = public.users.id
  ),
  email_confirmed_at = (
    SELECT email_confirmed_at 
    FROM auth.users 
    WHERE auth.users.id = public.users.id
  )
WHERE email_confirmed IS NULL OR email_confirmed_at IS NULL;

SELECT 'Email verification tracking added to public.users table' as status; 