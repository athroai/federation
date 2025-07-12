-- Add user_tier column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'lite' CHECK (user_tier IN ('lite', 'full'));

-- Create index for faster tier-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_tier ON profiles(user_tier);

-- Update existing users to 'full' tier (assuming they're already using the full platform)
UPDATE profiles SET user_tier = 'full' WHERE user_tier IS NULL;

-- Create RLS policies for tier-based access control

-- Policy: Users can only see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Lite users cannot access calendar events
DROP POLICY IF EXISTS "Full tier users can access calendar events" ON calendar_events;
CREATE POLICY "Full tier users can access calendar events" ON calendar_events
  FOR ALL USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_tier = 'full'
    )
  );

-- Policy: Lite users cannot access wellbeing data
DROP POLICY IF EXISTS "Full tier users can access wellbeing data" ON wellbeing_data;
CREATE POLICY "Full tier users can access wellbeing data" ON wellbeing_data
  FOR ALL USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_tier = 'full'
    )
  );

-- Policy: Lite users cannot access study sessions
DROP POLICY IF EXISTS "Full tier users can access study sessions" ON study_sessions;
CREATE POLICY "Full tier users can access study sessions" ON study_sessions
  FOR ALL USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_tier = 'full'
    )
  );

-- Create function to check user tier
CREATE OR REPLACE FUNCTION get_user_tier(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT user_tier 
    FROM profiles 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 