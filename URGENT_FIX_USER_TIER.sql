-- 🚨 URGENT: Fix user tier after successful Stripe payment
-- Session ID: cs_test_a1rMYKeMp7dW0nP64RBXhk5kh5bwhp1N5ry6tQfyHi2b1dJN8ov1DskpKF
-- User paid $19.99 for premium tier

-- Find the user
SELECT id, email, user_tier, updated_at 
FROM profiles 
WHERE email LIKE '%nexastream.co.uk' OR id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb';

-- Update to full tier immediately
UPDATE profiles 
SET 
    user_tier = 'full',
    updated_at = NOW(),
    stripe_customer_id = COALESCE(stripe_customer_id, 'cus_emergency_fix'),
    subscription_status = 'active'
WHERE email LIKE '%nexastream.co.uk' OR id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb';

-- Also ensure wellbeing_data table is updated
INSERT INTO wellbeing_data (user_id, tier, updated_at) 
SELECT id, 'full', NOW()
FROM profiles 
WHERE email LIKE '%nexastream.co.uk' OR id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb'
ON CONFLICT (user_id) 
DO UPDATE SET 
    tier = 'full',
    updated_at = NOW();

-- Verify the fix worked
SELECT 
    p.id, 
    p.email, 
    p.user_tier,
    p.subscription_status,
    p.updated_at,
    w.tier as wellbeing_tier,
    'PAYMENT PROCESSED: User should now have FULL access' as status
FROM profiles p
LEFT JOIN wellbeing_data w ON p.id = w.user_id
WHERE p.email LIKE '%nexastream.co.uk' OR p.id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb'; 