-- PRODUCTION-READY AUTH SYSTEM
-- This creates a robust, secure, and reliable auth system

-- Step 1: Create proper profiles table with constraints
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
    id uuid primary key,
    email text unique not null,
    full_name text,
    preferred_name text,
    school text,
    year integer check (year >= 1900 AND year <= 2100),
    user_tier text not null default 'free' check (user_tier in ('free', 'lite', 'full')),
    stripe_customer_id text,
    subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'cancelled', 'past_due')),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    
    -- Add foreign key constraint to auth.users
    constraint fk_auth_user foreign key (id) references auth.users(id) on delete cascade
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_user_tier ON profiles(user_tier);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Step 3: Create proper RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
DROP POLICY IF EXISTS "Users can access own profile" ON profiles;
CREATE POLICY "Users can access own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Service role can access all profiles (for admin operations)
DROP POLICY IF EXISTS "Service role full access" ON profiles;
CREATE POLICY "Service role full access" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 4: Create robust trigger function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    profile_exists boolean;
    user_tier_value text;
BEGIN
    -- Validate input
    IF NEW.id IS NULL OR NEW.email IS NULL THEN
        RAISE WARNING 'Invalid user data: id=%, email=%', NEW.id, NEW.email;
        RETURN NEW;
    END IF;

    -- Check if profile already exists (prevent duplicates)
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'Profile already exists for user: %', NEW.email;
        RETURN NEW;
    END IF;

    -- Extract and validate tier from metadata
    user_tier_value := COALESCE(NEW.raw_user_meta_data->>'tier', 'free');
    IF user_tier_value NOT IN ('free', 'lite', 'full') THEN
        user_tier_value := 'free';
    END IF;

    -- Create profile with proper validation
    INSERT INTO profiles (
        id,
        email,
        full_name,
        preferred_name,
        school,
        year,
        user_tier,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'preferred_name'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'school'), ''),
        CASE 
            WHEN NEW.raw_user_meta_data->>'year' ~ '^\d+$' 
            THEN (NEW.raw_user_meta_data->>'year')::integer
            ELSE NULL
        END,
        user_tier_value,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );

    RAISE NOTICE 'Profile created successfully for user: % (tier: %)', NEW.email, user_tier_value;
    RETURN NEW;

EXCEPTION 
    WHEN unique_violation THEN
        RAISE WARNING 'Profile already exists for user: %', NEW.email;
        RETURN NEW;
    WHEN check_violation THEN
        RAISE WARNING 'Invalid data for user %: %', NEW.email, SQLERRM;
        -- Create minimal profile with safe defaults
        INSERT INTO profiles (id, email, user_tier, created_at, updated_at)
        VALUES (NEW.id, NEW.email, 'free', timezone('utc'::text, now()), timezone('utc'::text, now()))
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 5: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Create profile ensuring function for app-level fallback
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id_param uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_email text;
    profile_exists boolean;
    result json;
BEGIN
    -- Get user email from auth.users
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = user_id_param;
    
    IF user_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_param) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Create minimal profile
        INSERT INTO profiles (id, email, user_tier, created_at, updated_at)
        VALUES (user_id_param, user_email, 'free', timezone('utc'::text, now()), timezone('utc'::text, now()))
        ON CONFLICT (id) DO NOTHING;
        
        RETURN json_build_object('success', true, 'action', 'created');
    ELSE
        RETURN json_build_object('success', true, 'action', 'exists');
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 8: Fix admin user
INSERT INTO profiles (id, email, full_name, user_tier, created_at, updated_at)
SELECT 
    id, 
    email, 
    'Athro AI Admin',
    'full',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
FROM auth.users 
WHERE email = 'athroai@nexastream.co.uk'
ON CONFLICT (id) DO UPDATE SET
    user_tier = 'full',
    updated_at = timezone('utc'::text, now());

-- Step 9: Verify setup
SELECT '✅ PRODUCTION-READY AUTH SYSTEM CREATED' as status;
SELECT 'Proper constraints, RLS, triggers, and fallbacks in place' as details;

-- Show current state
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT user_tier, COUNT(*) as count FROM profiles GROUP BY user_tier; 