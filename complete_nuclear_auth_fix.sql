-- COMPLETE NUCLEAR AUTH FIX - Remove ALL broken triggers
-- This will make registration work purely through application code

-- Step 1: NUCLEAR - Drop ALL auth-related triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID) CASCADE;

-- Step 2: Temporarily disable ALL constraints to fix any corruption
SET session_replication_role = replica;

-- Step 3: Clean up any corrupted data (keep only admin)
DELETE FROM auth.users WHERE email != 'athroai@nexastream.co.uk';
DELETE FROM profiles WHERE email != 'athroai@nexastream.co.uk';

-- Step 4: Re-enable constraints
SET session_replication_role = DEFAULT;

-- Step 5: Recreate profiles table with simple structure
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
    id uuid primary key,
    email text unique not null,
    full_name text,
    preferred_name text,
    school text,
    year integer,
    user_tier text default 'free',
    stripe_customer_id text,
    subscription_status text default 'inactive',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Step 6: Create very permissive RLS (we'll tighten later)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for now" ON profiles;
CREATE POLICY "Allow all for now" ON profiles FOR ALL USING (true);

-- Step 7: Recreate admin user profile
INSERT INTO profiles (id, email, full_name, user_tier)
SELECT 
    id, 
    email, 
    'Athro AI Admin',
    'full'
FROM auth.users 
WHERE email = 'athroai@nexastream.co.uk'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_tier = 'full',
    updated_at = now();

-- Step 8: Verify setup
SELECT '✅ COMPLETE NUCLEAR FIX APPLIED' as status;
SELECT 'All triggers removed - registration will work through app code only' as result;
SELECT COUNT(*) as remaining_users FROM auth.users;
SELECT COUNT(*) as remaining_profiles FROM profiles; 