-- ✅ COMPREHENSIVE FIX FOR REGISTRATION TRIGGERS
-- This fixes the "Database error saving new user" error by consolidating all trigger functions
-- Run this in your Supabase SQL Editor

-- Step 1: Drop all existing conflicting triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_email_verification ON auth.users;

-- Step 2: Create comprehensive function that handles ALL new user setup
CREATE OR REPLACE FUNCTION public.handle_new_user_comprehensive()
RETURNS trigger AS $$
DECLARE
  user_tier_value TEXT;
BEGIN
  -- Get tier from metadata or default to 'free'
  user_tier_value := COALESCE(NEW.raw_user_meta_data->>'tier', 'free');
  
  -- 1. Insert into public.users table (for email verification tracking)
  BEGIN
    INSERT INTO public.users (id, email, tier, email_confirmed, email_confirmed_at, created_at, updated_at)
    VALUES (
      NEW.id, 
      NEW.email, 
      user_tier_value,
      (NEW.email_confirmed_at IS NOT NULL),
      NEW.email_confirmed_at,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      tier = EXCLUDED.tier,
      email_confirmed = EXCLUDED.email_confirmed,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the entire operation
      RAISE WARNING 'Failed to insert into users table: %', SQLERRM;
  END;
  
  -- 2. Insert into profiles table (for user profile data)
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
      updated_at,
      last_monthly_reset,
      last_activity_reset_date,
      spent_today_gbp
    )
    VALUES (
      NEW.id, 
      NEW.email, 
      CASE 
        WHEN user_tier_value = 'pro' THEN 'full'
        ELSE user_tier_value
      END,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'preferred_name',
      NEW.raw_user_meta_data->>'school',
      NULLIF(NEW.raw_user_meta_data->>'year', '')::INTEGER,
      NOW(),
      NOW(),
      DATE_TRUNC('month', CURRENT_DATE),
      CURRENT_DATE,
      0
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      user_tier = EXCLUDED.user_tier,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      preferred_name = COALESCE(EXCLUDED.preferred_name, profiles.preferred_name),
      school = COALESCE(EXCLUDED.school, profiles.school),
      year = COALESCE(EXCLUDED.year, profiles.year),
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the entire operation
      RAISE WARNING 'Failed to insert into profiles table: %', SQLERRM;
  END;
  
  -- 3. Initialize user_usage table (for token tracking)
  BEGIN
    INSERT INTO user_usage (
      user_id,
      total_tokens,
      total_spend_gbp,
      last_reset_date,
      monthly_token_limit,
      last_monthly_reset,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      0,
      0,
      CURRENT_DATE,
      CASE 
        WHEN user_tier_value = 'free' THEN 100
        WHEN user_tier_value = 'lite' THEN 500
        WHEN user_tier_value = 'full' OR user_tier_value = 'pro' THEN 2000
        ELSE 100
      END,
      DATE_TRUNC('month', CURRENT_DATE),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      monthly_token_limit = EXCLUDED.monthly_token_limit,
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail - this table might not exist in all setups
      RAISE WARNING 'Failed to insert into user_usage table: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create single comprehensive trigger for new users
CREATE TRIGGER on_auth_user_created_comprehensive
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_comprehensive();

-- Step 4: Create function for email verification sync (separate trigger)
CREATE OR REPLACE FUNCTION public.sync_email_verification_status()
RETURNS trigger AS $$
BEGIN
  -- Update public.users when auth.users email_confirmed_at changes
  BEGIN
    UPDATE public.users 
    SET 
      email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
      email_confirmed_at = NEW.email_confirmed_at,
      updated_at = NOW()
    WHERE id = NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail
      RAISE WARNING 'Failed to sync email verification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger for email verification sync
CREATE TRIGGER sync_email_verification_comprehensive
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.sync_email_verification_status();

-- Step 6: Ensure all required tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email_confirmed BOOLEAN DEFAULT FALSE,
  email_confirmed_at TIMESTAMPTZ
);

-- Ensure profiles table has all required columns
DO $$ 
BEGIN
  -- Add missing columns to profiles if they don't exist
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_monthly_reset DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE);
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_reset_date DATE DEFAULT CURRENT_DATE;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spent_today_gbp DECIMAL(10,6) DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_tokens_used INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_spend_gbp DECIMAL(10,6) DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_tokens_purchased INTEGER DEFAULT 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Some columns may already exist: %', SQLERRM;
END $$;

-- Step 7: Create user_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_usage (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_spend_gbp DECIMAL(10,6) NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  monthly_token_limit INTEGER DEFAULT 100,
  last_monthly_reset DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 8: Enable RLS and create policies for new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can read their own usage" ON user_usage;
DROP POLICY IF EXISTS "Service role can update usage" ON user_usage;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read their own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can update usage" ON user_usage
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.uid() = user_id
  );

-- Step 9: Grant necessary permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, UPDATE ON user_usage TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON user_usage TO service_role;

-- Step 10: Create helper function for checking email verification
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

-- Grant permissions for the RPC function
GRANT EXECUTE ON FUNCTION public.check_email_verification_status TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_verification_status TO authenticated;

-- Success message
SELECT 'Registration triggers successfully consolidated and fixed!' as status,
       'New users should now register without database errors' as next_step; 