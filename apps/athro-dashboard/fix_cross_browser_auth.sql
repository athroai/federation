-- Fix for cross-browser email verification detection
-- Run this in your Supabase SQL Editor

-- 1. Create a function to check if an email is verified
CREATE OR REPLACE FUNCTION public.check_email_verified(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_verified BOOLEAN;
BEGIN
  SELECT (email_confirmed_at IS NOT NULL) INTO is_verified
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN COALESCE(is_verified, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a more detailed function that returns user info
CREATE OR REPLACE FUNCTION public.get_user_verification_status(user_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as user_id,
    auth.users.email,
    auth.users.email_confirmed_at,
    auth.users.created_at
  FROM auth.users
  WHERE auth.users.email = user_email
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_email_verified TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_verified TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_verification_status TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_verification_status TO authenticated; 