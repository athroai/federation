-- 🚨 URGENT: Fix user tier after successful Stripe payment
-- Session ID: cs_test_a1rMYKeMp7dW0nP64RBXhk5kh5bwhp1N5ry6tQfyHi2b1dJN8ov1DskpKF
-- User paid $19.99 for premium tier

-- Find the user first
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

-- Verify the fix worked
SELECT 
    id, 
    email, 
    user_tier,
    subscription_status,
    stripe_customer_id,
    updated_at,
    'PAYMENT PROCESSED: User should now have FULL access' as status
FROM profiles 
WHERE email LIKE '%nexastream.co.uk' OR id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb'; 