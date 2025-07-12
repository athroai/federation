-- ✅ COMPLETE DATABASE MIGRATION - Apply this in Supabase SQL Editor
-- This creates ALL missing tables and columns to fix dashboard card issues completely

-- Step 1: Ensure profiles table exists with all columns (from previous migration)
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
ADD COLUMN IF NOT EXISTS recent_grades TEXT,
ADD COLUMN IF NOT EXISTS preferred_name TEXT,
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Step 2: Create user_preferences table (THIS IS WHAT'S MISSING!)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Step 3: Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Step 5: Create additional required tables
CREATE TABLE IF NOT EXISTS subject_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  confidence_level INTEGER,
  is_priority BOOLEAN DEFAULT false,
  average_grade TEXT,
  exam_board TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject)
);

-- Enable RLS on subject_preferences
ALTER TABLE subject_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subject preferences"
  ON subject_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Step 6: Create calendar_events table if needed
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  event_type TEXT DEFAULT 'study',
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendar events"
  ON calendar_events FOR ALL
  USING (auth.uid() = user_id);

-- Step 7: Create wellbeing_data table if needed
CREATE TABLE IF NOT EXISTS wellbeing_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stress_level INTEGER,
  motivation_level INTEGER,
  sleep_hours DECIMAL(4,2),
  exercise_minutes INTEGER,
  mood_rating INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wellbeing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wellbeing data"
  ON wellbeing_data FOR ALL
  USING (auth.uid() = user_id);

-- Step 8: Create study_sessions table if needed
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  session_type TEXT DEFAULT 'general',
  notes TEXT,
  confidence_before INTEGER,
  confidence_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study sessions"
  ON study_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Step 9: Create subscription_events table for tracking
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  stripe_customer_id TEXT,
  new_tier TEXT,
  old_tier TEXT,
  tokens_added INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- Step 10: Create tier_change_logs table
CREATE TABLE IF NOT EXISTS tier_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  source TEXT NOT NULL,
  metadata TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tier_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tier changes"
  ON tier_change_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_key ON user_preferences(user_id, preference_key);
CREATE INDEX IF NOT EXISTS idx_subject_preferences_user ON subject_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_wellbeing_data_user_created ON wellbeing_data(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created ON study_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_change_logs_user ON tier_change_logs(user_id);

-- Step 12: Update email field for existing users (sync from auth.users)
UPDATE profiles 
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE profiles.id = auth_users.id 
AND profiles.email IS NULL;

-- Step 13: Ensure all users have proper reset dates
UPDATE profiles 
SET last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE)
WHERE last_monthly_reset IS NULL;

UPDATE profiles 
SET last_activity_reset_date = CURRENT_DATE
WHERE last_activity_reset_date IS NULL;

-- Step 14: Create function to ensure user profile exists
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

-- Step 15: Create trigger to auto-create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION ensure_user_profile();

-- Step 16: Create missing profiles for existing auth users
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

-- Step 17: Grant necessary permissions
GRANT SELECT ON user_preferences TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON user_preferences TO authenticated;
GRANT ALL ON user_preferences TO service_role;

GRANT SELECT ON subject_preferences TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON subject_preferences TO authenticated;
GRANT ALL ON subject_preferences TO service_role;

-- Grant permissions for other tables
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wellbeing_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON study_sessions TO authenticated;
GRANT SELECT ON subscription_events TO authenticated;
GRANT SELECT ON tier_change_logs TO authenticated;

-- Step 18: Create helper functions for user preferences
CREATE OR REPLACE FUNCTION get_user_preference(p_user_id UUID, p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT preference_value INTO result
  FROM user_preferences
  WHERE user_id = p_user_id AND preference_key = p_key;
  
  RETURN COALESCE(result, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_user_preference(p_user_id UUID, p_key TEXT, p_value JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_preferences (user_id, preference_key, preference_value)
  VALUES (p_user_id, p_key, p_value)
  ON CONFLICT (user_id, preference_key)
  DO UPDATE SET 
    preference_value = p_value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ VERIFICATION QUERIES (Run these to verify everything is working)
-- SELECT COUNT(*) as total_profiles FROM profiles;
-- SELECT COUNT(*) as total_user_preferences FROM user_preferences;
-- SELECT COUNT(*) as profiles_with_email FROM profiles WHERE email IS NOT NULL;
-- SELECT user_tier, COUNT(*) FROM profiles GROUP BY user_tier;

-- 🎯 SUCCESS MESSAGE
SELECT 'SUCCESS: Complete database migration applied! All tables and columns created!' as status; 