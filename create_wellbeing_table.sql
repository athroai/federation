-- Create wellbeing_data table
CREATE TABLE IF NOT EXISTS wellbeing_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mood_level INTEGER CHECK (mood_level >= 1 AND mood_level <= 10),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    gratitude_entry TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE wellbeing_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own data
CREATE POLICY "Users can view own wellbeing data" ON wellbeing_data
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own data
CREATE POLICY "Users can insert own wellbeing data" ON wellbeing_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own wellbeing data" ON wellbeing_data
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own data
CREATE POLICY "Users can delete own wellbeing data" ON wellbeing_data
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wellbeing_data_user_id ON wellbeing_data(user_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_data_created_at ON wellbeing_data(created_at DESC); 