-- Create athro_selections table
CREATE TABLE IF NOT EXISTS athro_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  athro_id TEXT NOT NULL,
  selected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, athro_id)
);

-- Create athro_confidence_levels table
CREATE TABLE IF NOT EXISTS athro_confidence_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  athro_id TEXT NOT NULL,
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, athro_id)
);

-- Create user_preferences table for misc UI preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_athro_selections_user_id ON athro_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_athro_selections_athro_id ON athro_selections(athro_id);
CREATE INDEX IF NOT EXISTS idx_athro_confidence_levels_user_id ON athro_confidence_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_athro_confidence_levels_athro_id ON athro_confidence_levels(athro_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE athro_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE athro_confidence_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for athro_selections
CREATE POLICY "Users can view their own athro selections" ON athro_selections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own athro selections" ON athro_selections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own athro selections" ON athro_selections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own athro selections" ON athro_selections
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for athro_confidence_levels
CREATE POLICY "Users can view their own athro confidence levels" ON athro_confidence_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own athro confidence levels" ON athro_confidence_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own athro confidence levels" ON athro_confidence_levels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own athro confidence levels" ON athro_confidence_levels
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_athro_selections_updated_at 
    BEFORE UPDATE ON athro_selections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athro_confidence_levels_updated_at 
    BEFORE UPDATE ON athro_confidence_levels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 