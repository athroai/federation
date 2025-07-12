-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_history(id) ON DELETE CASCADE,
  athro_id TEXT,
  subject TEXT,
  topic TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  repetition_count INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'UNRATED',
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  review_interval TEXT,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_notes table
CREATE TABLE IF NOT EXISTS study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_history(id) ON DELETE CASCADE,
  athro_id TEXT,
  subject TEXT,
  topic TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  review_status TEXT DEFAULT 'REVIEWED',
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mind_maps table
CREATE TABLE IF NOT EXISTS mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_history(id) ON DELETE CASCADE,
  athro_id TEXT,
  subject TEXT,
  topic TEXT,
  root_node JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_history(id) ON DELETE CASCADE,
  athro_id TEXT,
  name TEXT NOT NULL,
  file_type TEXT,
  content TEXT, -- Base64 encoded file content
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  storage_type TEXT DEFAULT 'supabase',
  supabase_id TEXT,
  metadata JSONB DEFAULT '{}',
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_history table
CREATE TABLE IF NOT EXISTS study_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  athro_id TEXT,
  title TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  resources TEXT[] DEFAULT '{}',
  mind_maps TEXT[] DEFAULT '{}',
  notes TEXT[] DEFAULT '{}',
  flashcards TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_session_id ON flashcards(session_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_athro_id ON flashcards(athro_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_deleted ON flashcards(deleted);

CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_session_id ON study_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_athro_id ON study_notes(athro_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON study_notes(subject);

CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_session_id ON mind_maps(session_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_athro_id ON mind_maps(athro_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_subject ON mind_maps(subject);

CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_session_id ON resources(session_id);
CREATE INDEX IF NOT EXISTS idx_resources_athro_id ON resources(athro_id);

CREATE INDEX IF NOT EXISTS idx_study_history_user_id ON study_history(user_id);
CREATE INDEX IF NOT EXISTS idx_study_history_athro_id ON study_history(athro_id);

-- Enable Row Level Security
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Flashcards policies
CREATE POLICY "Users can view their own flashcards" ON flashcards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards" ON flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards" ON flashcards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" ON flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- Study notes policies
CREATE POLICY "Users can view their own study notes" ON study_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study notes" ON study_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study notes" ON study_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study notes" ON study_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Mind maps policies
CREATE POLICY "Users can view their own mind maps" ON mind_maps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mind maps" ON mind_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mind maps" ON mind_maps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mind maps" ON mind_maps
  FOR DELETE USING (auth.uid() = user_id);

-- Resources policies
CREATE POLICY "Users can view their own resources" ON resources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resources" ON resources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resources" ON resources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resources" ON resources
  FOR DELETE USING (auth.uid() = user_id);

-- Study history policies
CREATE POLICY "Users can view their own study history" ON study_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study history" ON study_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study history" ON study_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study history" ON study_history
  FOR DELETE USING (auth.uid() = user_id); 