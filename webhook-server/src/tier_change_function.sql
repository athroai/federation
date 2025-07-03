-- Create tier_changes table if it doesn't exist
CREATE TABLE IF NOT EXISTS tier_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  source TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to log tier changes
CREATE OR REPLACE FUNCTION log_tier_change(
  p_user_id UUID,
  p_old_tier TEXT,
  p_new_tier TEXT,
  p_source TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO tier_changes (
    user_id,
    old_tier,
    new_tier,
    source,
    metadata
  ) VALUES (
    p_user_id,
    p_old_tier,
    p_new_tier,
    p_source,
    p_metadata
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 