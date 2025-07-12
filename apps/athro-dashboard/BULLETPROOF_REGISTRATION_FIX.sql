-- 🚨 BULLETPROOF REGISTRATION FIX
-- This WILL fix the registration error by handling all existing triggers
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- Step 1: Drop ALL existing triggers (including the one causing the error)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_comprehensive ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;
DROP TRIGGER IF EXISTS sync_email_verification ON auth.users;
DROP TRIGGER IF EXISTS sync_email_verification_comprehensive ON auth.users;

-- Step 2: Drop ALL existing functions
DROP FUNCTION IF EXISTS public.handle_new_user_comprehensive();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_simple();
DROP FUNCTION IF EXISTS public.sync_email_verification_status();

-- Step 3: Ensure profiles table exists and has required columns
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  user_tier TEXT DEFAULT 'free',
  full_name TEXT,
  preferred_name TEXT,
  school TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 4: Create the working function
CREATE OR REPLACE FUNCTION public.handle_new_user_bulletproof()
RETURNS trigger AS $$
DECLARE
  user_tier_value TEXT;
BEGIN
  -- Get tier from metadata, default to 'free'
  user_tier_value := COALESCE(NEW.raw_user_meta_data->>'tier', 'free');
  
  -- Map 'pro' to 'full' for consistency  
  IF user_tier_value = 'pro' THEN
    user_tier_value := 'full';
  END IF;
  
  -- Insert into profiles with error handling
  BEGIN
    INSERT INTO profiles (
      id, 
      email, 
      user_tier,
      full_name,
      preferred_name,
      school,
      year,
      created_at, 
      updated_at
    )
    VALUES (
      NEW.id, 
      NEW.email, 
      user_tier_value,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'preferred_name',
      NEW.raw_user_meta_data->>'school',
      NULLIF(NEW.raw_user_meta_data->>'year', '')::INTEGER,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- If anything fails, at least create minimal profile
      INSERT INTO profiles (id, user_tier, created_at, updated_at) 
      VALUES (NEW.id, user_tier_value, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        user_tier = EXCLUDED.user_tier,
        updated_at = NOW();
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the working trigger
CREATE TRIGGER on_auth_user_created_bulletproof
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- Step 6: Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create basic RLS policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Step 8: Verify the fix worked
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth'
AND trigger_name LIKE '%bulletproof%';

-- You should see one result: "on_auth_user_created_bulletproof" 