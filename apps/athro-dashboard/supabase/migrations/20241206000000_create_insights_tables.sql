-- Create insights-related tables for athro dashboard insights tracking
-- This enables the insights cards to show real user activity data

-- Study Sessions Table
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    athro_id TEXT NOT NULL,
    athro_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('study', 'quiz', 'review')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Results Table
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    confidence_before INTEGER,
    confidence_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool Usage Table
CREATE TABLE IF NOT EXISTS public.tool_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    athro_id TEXT,
    tool_type TEXT NOT NULL CHECK (tool_type IN ('mind_map', 'note', 'flashcard', 'resource')),
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Confidence History Table
CREATE TABLE IF NOT EXISTS public.confidence_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    athro_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    confidence_level INTEGER NOT NULL CHECK (confidence_level >= 1 AND confidence_level <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON public.study_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_athro_id ON public.study_sessions(athro_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON public.quiz_results(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_subject ON public.quiz_results(subject);

CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON public.tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON public.tool_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_type ON public.tool_usage(tool_type);

CREATE INDEX IF NOT EXISTS idx_confidence_history_user_id ON public.confidence_history(user_id);
CREATE INDEX IF NOT EXISTS idx_confidence_history_created_at ON public.confidence_history(created_at);
CREATE INDEX IF NOT EXISTS idx_confidence_history_athro_id ON public.confidence_history(athro_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to ensure users can only access their own data
CREATE POLICY "Users can only access their own study sessions" ON public.study_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own quiz results" ON public.quiz_results
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own tool usage" ON public.tool_usage
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own confidence history" ON public.confidence_history
    FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.study_sessions TO authenticated;
GRANT ALL ON public.quiz_results TO authenticated;
GRANT ALL ON public.tool_usage TO authenticated;
GRANT ALL ON public.confidence_history TO authenticated;

-- Also grant to anon for any public access scenarios
GRANT SELECT ON public.study_sessions TO anon;
GRANT SELECT ON public.quiz_results TO anon;
GRANT SELECT ON public.tool_usage TO anon;
GRANT SELECT ON public.confidence_history TO anon; 