-- Create user_usage table for token metering
CREATE TABLE IF NOT EXISTS user_usage (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_spend_gbp DECIMAL(10,6) NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for user_usage
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own usage"
  ON user_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can update usage"
  ON user_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add spent_today_gbp to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS spent_today_gbp DECIMAL(10,6) NOT NULL DEFAULT 0;

-- Create function to reset daily usage at midnight UTC
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_usage
  SET total_tokens = 0,
      total_spend_gbp = 0,
      last_reset_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE last_reset_date < CURRENT_DATE;
  
  UPDATE profiles
  SET spent_today_gbp = 0
  WHERE EXISTS (
    SELECT 1 FROM user_usage
    WHERE user_usage.user_id = profiles.id
    AND user_usage.last_reset_date < CURRENT_DATE
  );
END;
$$; 