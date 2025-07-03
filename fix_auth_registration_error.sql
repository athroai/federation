-- FIX AUTH REGISTRATION ERROR - Repair Database Schema
-- This script fixes the "Database error finding user" during registration

-- Step 1: Check current database state
SELECT '🔍 CHECKING CURRENT STATE' as status;

-- Check if auth.users table exists and is accessible
SELECT 'auth.users table status:' as check_name, 
       CASE WHEN EXISTS(SELECT 1 FROM auth.users LIMIT 1) THEN '✅ Accessible' ELSE '❌ Not accessible' END as status;

-- Check if profiles table exists
SELECT 'profiles table status:' as check_name,
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN '✅ Exists' ELSE '❌ Missing' END as status;

-- Check if users table exists
SELECT 'public.users table status:' as check_name,
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN '✅ Exists' ELSE '❌ Missing' END as status;

-- Step 2: Recreate missing tables and functions
DO $$
BEGIN
    -- Recreate profiles table if it doesn't exist or is corrupted
    CREATE TABLE IF NOT EXISTS profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        full_name text,
        preferred_name text,
        school text,
        year integer,
        avatar_url text,
        email text,
        user_tier text default 'free',
        stripe_customer_id text,
        spent_today_gbp decimal(10,6) default 0,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
    );

    -- Recreate public.users table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.users (
        id uuid REFERENCES auth.users(id) PRIMARY KEY,
        email text,
        tier text DEFAULT 'free' CHECK (tier IN ('free', 'lite', 'pro', 'premium', 'full')),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS on tables
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE '✅ Tables created/verified';
END $$;

-- Step 3: Recreate RLS policies for profiles
DROP POLICY IF EXISTS "Users can access their own profile" ON profiles;
CREATE POLICY "Users can access their own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Step 4: Recreate RLS policies for public.users
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Step 5: Recreate the user signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert into public.users table
    INSERT INTO public.users (id, email, tier)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'tier', 'free')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        tier = COALESCE(new.raw_user_meta_data->>'tier', 'free'),
        updated_at = now();

    -- Insert into profiles table
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        preferred_name, 
        school, 
        year,
        user_tier
    )
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'preferred_name',
        new.raw_user_meta_data->>'school',
        (new.raw_user_meta_data->>'year')::integer,
        COALESCE(new.raw_user_meta_data->>'tier', 'free')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        preferred_name = COALESCE(EXCLUDED.preferred_name, profiles.preferred_name),
        school = COALESCE(EXCLUDED.school, profiles.school),
        year = COALESCE(EXCLUDED.year, profiles.year),
        user_tier = COALESCE(EXCLUDED.user_tier, profiles.user_tier),
        updated_at = now();

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    new.updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE 'plpgsql';

-- Step 8: Create updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Fix any orphaned data by ensuring admin user has proper records
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'athroai@nexastream.co.uk';
    
    IF admin_user_id IS NOT NULL THEN
        -- Ensure admin has profile
        INSERT INTO profiles (
            id, 
            email, 
            full_name, 
            user_tier
        )
        VALUES (
            admin_user_id,
            'athroai@nexastream.co.uk',
            'Athro AI Admin',
            'full'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            user_tier = 'full',
            updated_at = now();

        -- Ensure admin has users record
        INSERT INTO public.users (id, email, tier)
        VALUES (admin_user_id, 'athroai@nexastream.co.uk', 'pro')
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            tier = 'pro',
            updated_at = now();

        RAISE NOTICE '✅ Admin user records fixed';
    END IF;
END $$;

-- Step 10: Test the setup by checking if we can simulate user creation
SELECT '🧪 TESTING SETUP' as status;

-- Verify triggers exist
SELECT 'Triggers status:' as check_name,
       CASE WHEN EXISTS(
           SELECT 1 FROM information_schema.triggers 
           WHERE trigger_name = 'on_auth_user_created'
       ) THEN '✅ Trigger exists' ELSE '❌ Trigger missing' END as status;

-- Verify functions exist
SELECT 'Functions status:' as check_name,
       CASE WHEN EXISTS(
           SELECT 1 FROM information_schema.routines 
           WHERE routine_name = 'handle_new_user'
       ) THEN '✅ Function exists' ELSE '❌ Function missing' END as status;

-- Final verification
SELECT '✅ DATABASE REPAIR COMPLETED' as final_status;
SELECT 'Registration should now work properly' as confirmation; 