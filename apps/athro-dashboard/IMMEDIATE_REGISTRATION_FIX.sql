-- 🚨 IMMEDIATE REGISTRATION FIX - TIER ASSIGNMENT ONLY
-- This fixes the "Database error saving new user" error by simplifying the triggers
-- Run this in your Supabase SQL Editor NOW

-- Step 1: Remove ALL existing broken triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_comprehensive ON auth.users;
DROP TRIGGER IF EXISTS sync_email_verification ON auth.users;
DROP TRIGGER IF EXISTS sync_email_verification_comprehensive ON auth.users;

-- Step 2: Drop all broken functions
DROP FUNCTION IF EXISTS public.handle_new_user_comprehensive();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_email_verification_status();

-- Step 3: Create SIMPLE, bulletproof function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
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
  
  -- ONLY create profiles entry - nothing else
  INSERT INTO profiles (
    id, 
    email, 
    user_tier,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    user_tier_value,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If profiles insert fails, try with minimal data
    INSERT INTO profiles (id, user_tier) 
    VALUES (NEW.id, user_tier_value)
    ON CONFLICT (id) DO UPDATE SET user_tier = EXCLUDED.user_tier;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create simple trigger
CREATE TRIGGER on_auth_user_created_simple
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();

-- Step 5: Ensure profiles table can handle the data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 6: Test the fix with a verification query
-- You can run this to verify the trigger is working:
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- 🎯 TIER MAPPING REFERENCE:
-- Frontend 'tier' values → Database 'user_tier' values:
-- 'free' → 'free'
-- 'lite' → 'lite' 
-- 'pro' → 'full'
-- 'full' → 'full' 