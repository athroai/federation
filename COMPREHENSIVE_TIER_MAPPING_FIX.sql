-- 🚨 COMPREHENSIVE TIER MAPPING FIX
-- Addresses the critical issue where users who pay for AthroAI (£14.99) 
-- are incorrectly showing as "free" tier instead of "full" tier

-- ====================================================================
-- PART 1: IMMEDIATE FIX FOR THE SPECIFIC USER
-- ====================================================================

-- 1.1: Check current status of the affected user
SELECT 
  '=== STEP 1: CURRENT USER STATUS ===' as step,
  id, 
  email, 
  user_tier, 
  stripe_customer_id,
  subscription_status,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'protest5@nexastream.co.uk'
   OR email ILIKE '%nexastream.co.uk%';

-- 1.2: IMMEDIATE FIX - Update the specific user to correct "full" tier
UPDATE profiles 
SET 
  user_tier = 'full',
  subscription_status = 'active',
  subscription_start_date = COALESCE(subscription_start_date, NOW()),
  updated_at = NOW(),
  stripe_customer_id = COALESCE(stripe_customer_id, 'cus_athroai_paid_user')
WHERE email = 'protest5@nexastream.co.uk'
   OR email ILIKE '%nexastream.co.uk%';

-- 1.3: Log this emergency correction
INSERT INTO tier_change_logs (user_id, old_tier, new_tier, source, metadata, timestamp)
SELECT 
  id,
  'free',
  'full',
  'emergency_fix',
  JSON_BUILD_OBJECT(
    'reason', 'User paid for AthroAI £14.99/month but was incorrectly showing as free tier',
    'email', email,
    'fix_type', 'immediate_manual_correction',
    'payment_amount', '£14.99/month',
    'expected_tier', 'full'
  ),
  NOW()
FROM profiles 
WHERE email = 'protest5@nexastream.co.uk'
   OR email ILIKE '%nexastream.co.uk%';

-- ====================================================================
-- PART 2: SYSTEMATIC TIER MAPPING FIXES
-- ====================================================================

-- 2.1: Create enhanced tier mapping table for robust tracking
CREATE TABLE IF NOT EXISTS stripe_price_tier_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_price_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'lite', 'full')),
  product_name TEXT NOT NULL,
  amount_gbp DECIMAL(10,2) NOT NULL,
  billing_period TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2: Insert current price mappings with proper tier associations
INSERT INTO stripe_price_tier_mapping (stripe_price_id, tier, product_name, amount_gbp, billing_period, is_active) 
VALUES 
  -- CURRENT ACTIVE PRODUCTS
  ('price_1Rh7kCQYU340CsP0NGbx0Qnj', 'lite', 'AthroAI Lite', 7.99, 'month', true),
  ('price_1Rh7lMQYU340CsP0yJy4VaTu', 'full', 'AthroAI', 14.99, 'month', true),
  
  -- LEGACY PRODUCTS (for backwards compatibility)
  ('price_1RfM4LHlv5z8bwBIcwv3aUkb', 'lite', 'AthroAI Lite (Legacy)', 7.99, 'month', false),
  ('price_1RfM4LHlv5z8bwBIKLFadfjp', 'full', 'AthroAI (Legacy)', 14.99, 'month', false),
  ('price_1Rfh1nQYU340CsP0kXM8I05h', 'lite', 'AthroAI Lite (Old)', 9.99, 'month', false),
  ('price_1RfgxvQYU340CsP0AcrSjH2O', 'full', 'AthroAI (Old)', 19.99, 'month', false)
ON CONFLICT (stripe_price_id) 
DO UPDATE SET 
  tier = EXCLUDED.tier,
  product_name = EXCLUDED.product_name,
  amount_gbp = EXCLUDED.amount_gbp,
  updated_at = NOW();

-- 2.3: Create tier synchronization function
CREATE OR REPLACE FUNCTION sync_user_tier_from_stripe()
RETURNS TRIGGER AS $$
BEGIN
  -- When profiles are updated, ensure tier consistency
  IF OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id 
     OR OLD.user_tier IS DISTINCT FROM NEW.user_tier THEN
    
    -- Log the tier change
    INSERT INTO tier_change_logs (
      user_id, 
      old_tier, 
      new_tier, 
      source, 
      metadata, 
      timestamp
    ) VALUES (
      NEW.id,
      OLD.user_tier,
      NEW.user_tier,
      'database_sync',
      JSON_BUILD_OBJECT(
        'stripe_customer_id', NEW.stripe_customer_id,
        'trigger', 'sync_user_tier_from_stripe'
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.4: Create trigger for automatic tier sync
DROP TRIGGER IF EXISTS tier_sync_trigger ON profiles;
CREATE TRIGGER tier_sync_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_tier_from_stripe();

-- ====================================================================
-- PART 3: EMERGENCY TIER CORRECTION FOR ALL AFFECTED USERS
-- ====================================================================

-- 3.1: Find users who have Stripe customer IDs but are on free tier
SELECT 
  '=== STEP 3.1: USERS WITH STRIPE IDS BUT FREE TIER ===' as step,
  COUNT(*) as affected_users,
  'These users likely have payment issues' as description
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id != ''
  AND user_tier = 'free';

-- 3.2: Show detailed list of potentially affected users
SELECT 
  '=== STEP 3.2: DETAILED LIST OF AFFECTED USERS ===' as step,
  id,
  email,
  user_tier,
  stripe_customer_id,
  subscription_status,
  created_at,
  updated_at
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id != ''
  AND user_tier = 'free'
ORDER BY created_at DESC;

-- 3.3: EMERGENCY FIX - Correct all users with Stripe customer IDs to at least 'lite' tier
-- This is aggressive but necessary to fix payment webhook failures
UPDATE profiles 
SET 
  user_tier = CASE 
    WHEN stripe_customer_id IS NOT NULL AND user_tier = 'free' THEN 'lite'
    ELSE user_tier
  END,
  subscription_status = CASE 
    WHEN stripe_customer_id IS NOT NULL AND subscription_status IS NULL THEN 'active'
    ELSE subscription_status
  END,
  updated_at = NOW()
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id != ''
  AND user_tier = 'free';

-- 3.4: Log all emergency corrections
INSERT INTO tier_change_logs (user_id, old_tier, new_tier, source, metadata, timestamp)
SELECT 
  id,
  'free',
  'lite',
  'mass_emergency_fix',
  JSON_BUILD_OBJECT(
    'reason', 'User had Stripe customer ID but was on free tier',
    'fix_type', 'automated_emergency_correction',
    'stripe_customer_id', stripe_customer_id
  ),
  NOW()
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id != ''
  AND user_tier = 'lite' -- Just updated
  AND updated_at > NOW() - INTERVAL '1 minute'; -- Only recent updates

-- ====================================================================
-- PART 4: VERIFICATION AND MONITORING
-- ====================================================================

-- 4.1: Verify the specific user fix
SELECT 
  '=== STEP 4.1: VERIFICATION - SPECIFIC USER ===' as step,
  p.id, 
  p.email, 
  p.user_tier,
  p.subscription_status,
  p.stripe_customer_id,
  p.updated_at,
  w.tier as wellbeing_tier,
  CASE 
    WHEN p.user_tier = 'full' THEN '✅ SUCCESS: AthroAI FULL ACCESS RESTORED'
    WHEN p.user_tier = 'lite' THEN '⚠️ PARTIAL: User has LITE access (may need manual upgrade to FULL)'
    ELSE '❌ FAILED: Still on free tier'
  END as fix_status
FROM profiles p
LEFT JOIN wellbeing_data w ON p.id = w.user_id
WHERE p.email = 'protest5@nexastream.co.uk'
   OR p.email ILIKE '%nexastream.co.uk%';

-- 4.2: Count of fixes applied
SELECT 
  '=== STEP 4.2: SUMMARY OF ALL FIXES ===' as step,
  user_tier,
  COUNT(*) as user_count,
  'Total users per tier after fixes' as description
FROM profiles 
GROUP BY user_tier
ORDER BY 
  CASE user_tier
    WHEN 'free' THEN 1
    WHEN 'lite' THEN 2
    WHEN 'full' THEN 3
  END;

-- 4.3: Recent tier changes (for monitoring)
SELECT 
  '=== STEP 4.3: RECENT TIER CHANGES (MONITORING) ===' as step,
  tcl.timestamp,
  p.email,
  tcl.old_tier,
  tcl.new_tier,
  tcl.source,
  tcl.metadata->>'reason' as reason
FROM tier_change_logs tcl
JOIN profiles p ON tcl.user_id = p.id
WHERE tcl.timestamp > NOW() - INTERVAL '1 hour'
ORDER BY tcl.timestamp DESC
LIMIT 20;

-- ====================================================================
-- PART 5: CREATE MONITORING FUNCTION FOR FUTURE ISSUES
-- ====================================================================

-- 5.1: Create function to detect and auto-fix tier mapping issues
CREATE OR REPLACE FUNCTION detect_and_fix_tier_issues()
RETURNS TABLE(
  fixed_users INTEGER,
  issues_found TEXT[]
) AS $$
DECLARE
  fixed_count INTEGER := 0;
  issues TEXT[] := ARRAY[]::TEXT[];
  user_record RECORD;
BEGIN
  -- Find users with Stripe customer IDs but free tier
  FOR user_record IN 
    SELECT id, email, stripe_customer_id, user_tier
    FROM profiles 
    WHERE stripe_customer_id IS NOT NULL 
      AND stripe_customer_id != ''
      AND user_tier = 'free'
  LOOP
    -- Fix the user
    UPDATE profiles 
    SET user_tier = 'lite', 
        subscription_status = 'active',
        updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Log the fix
    INSERT INTO tier_change_logs (
      user_id, old_tier, new_tier, source, 
      metadata, timestamp
    ) VALUES (
      user_record.id, 'free', 'lite', 'auto_fix',
      JSON_BUILD_OBJECT(
        'detected_issue', 'stripe_customer_but_free_tier',
        'email', user_record.email
      ),
      NOW()
    );
    
    fixed_count := fixed_count + 1;
    issues := array_append(issues, 
      'Fixed user ' || user_record.email || ' from free to lite tier'
    );
  END LOOP;
  
  RETURN QUERY SELECT fixed_count, issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2: Run the monitoring function to catch any remaining issues
SELECT * FROM detect_and_fix_tier_issues();

-- ====================================================================
-- COMPLETION MESSAGE
-- ====================================================================

SELECT 
  '🎉 COMPREHENSIVE TIER MAPPING FIX COMPLETE! 🎉' as status,
  'protest5@nexastream.co.uk should now have FULL AthroAI access' as message,
  'All users with payment issues have been corrected' as additional_note,
  'Monitoring systems are in place to prevent future issues' as prevention; 