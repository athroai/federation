-- ✅ COMPREHENSIVE DATABASE FIX - Apply this in Supabase SQL Editor
-- This fixes all missing columns causing dashboard card failures

-- Step 1: Add all missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'lite', 'full')),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS spent_today_gbp DECIMAL(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_spend_gbp DECIMAL(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_monthly_reset DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
ADD COLUMN IF NOT EXISTS last_activity_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS extra_tokens_purchased INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS exam_board TEXT,
ADD COLUMN IF NOT EXISTS recent_grades TEXT;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_tier ON profiles(user_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_monthly_reset ON profiles(last_monthly_reset);

-- Step 3: Update email field for existing users (sync from auth.users)
UPDATE profiles 
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE profiles.id = auth_users.id 
AND profiles.email IS NULL;

-- Step 4: Ensure all users have proper reset dates
UPDATE profiles 
SET last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE)
WHERE last_monthly_reset IS NULL;

UPDATE profiles 
SET last_activity_reset_date = CURRENT_DATE
WHERE last_activity_reset_date IS NULL;

-- Step 5: Create function to ensure user profile exists
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, user_tier, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    'free',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to auto-create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION ensure_user_profile();

-- Step 7: Create missing profiles for existing auth users
INSERT INTO profiles (id, email, user_tier, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'free',
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 8: Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can update subscription data" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can update subscription data" ON profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.uid() = id
  );

-- Step 9: Create function for SubscriptionService compatibility
CREATE OR REPLACE FUNCTION get_user_subscription_data(user_id UUID)
RETURNS TABLE (
  id UUID,
  user_tier TEXT,
  spent_today_gbp DECIMAL(10,6),
  last_activity_reset_date DATE,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_tier,
    p.spent_today_gbp,
    p.last_activity_reset_date,
    p.subscription_start_date,
    p.subscription_end_date
  FROM profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Grant necessary permissions
GRANT SELECT ON profiles TO anon, authenticated;
GRANT UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ✅ VERIFICATION QUERIES (Run these to verify everything is working)
-- SELECT COUNT(*) as total_profiles FROM profiles;
-- SELECT COUNT(*) as profiles_with_email FROM profiles WHERE email IS NOT NULL;
-- SELECT user_tier, COUNT(*) FROM profiles GROUP BY user_tier;
-- SELECT * FROM profiles LIMIT 5;

-- 🎯 SUCCESS MESSAGE
SELECT 'SUCCESS: All missing database columns have been added!' as status; 