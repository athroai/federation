# 🚨 URGENT STRIPE WEBHOOK SETUP
**This MUST be done immediately to prevent customers from paying without getting access**

## 🔥 CRITICAL STEPS (DO THIS NOW):

### 1. **Go to Stripe Dashboard**
- Visit: https://dashboard.stripe.com
- Login to your Stripe account

### 2. **Navigate to Webhooks**
- Left sidebar → **Developers** → **Webhooks**
- Click **"+ Add endpoint"**

### 3. **Configure Webhook Endpoint**
**Endpoint URL:**
```
https://klxmxaeforrhzkmvsczs.supabase.co/functions/v1/stripe-webhook
```

**Events to select (CRITICAL):**
- ✅ `checkout.session.completed` (REQUIRED)
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`  
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_failed`

### 4. **API Version**
- Set to: `2023-10-16` (or latest)

### 5. **Save and Get Signing Secret**
- Click **"Add endpoint"**
- Copy the webhook signing secret (starts with `whsec_...`)

### 6. **Configure Supabase Secret**
- Go to: https://supabase.com/dashboard/project/klxmxaeforrhzkmvsczs/settings/edge-functions
- Add environment variable:
  - **Name:** `STRIPE_WEBHOOK_SECRET`  
  - **Value:** `whsec_[your-secret-here]`

---

## 🧪 TEST THE WEBHOOK

### Test Payment Flow:
1. Make a small test payment ($1)
2. Check Supabase logs:
   ```bash
   supabase logs --project-ref klxmxaeforrhzkmvsczs --follow
   ```
3. Look for these logs:
   ```
   ✅ Webhook signature verified
   📨 Received webhook event: checkout.session.completed
   🔧 Price ID Mapping Debug:
   ✅ Mapped to FULL tier
   ✅ Updated user tier to full for user: [user-id]
   ```

### If Webhook Fails:
- Check endpoint URL is exactly: `https://klxmxaeforrhzkmvsczs.supabase.co/functions/v1/stripe-webhook`
- Verify webhook secret matches in Supabase
- Check events are selected (minimum: `checkout.session.completed`)

---

## 🔧 CURRENT CUSTOMER FIX

**For the customer who just paid $19.99:**

1. **Run this SQL in Supabase Dashboard:**
```sql
-- Fix the user who just paid
UPDATE profiles 
SET 
    user_tier = 'full',
    subscription_status = 'active',
    updated_at = NOW()
WHERE email LIKE '%nexastream.co.uk' OR id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb';

-- Verify fix
SELECT id, email, user_tier, subscription_status, updated_at
FROM profiles 
WHERE email LIKE '%nexastream.co.uk' OR id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb';
```

2. **Customer should then:**
   - Refresh their browser
   - Or log out and log back in
   - They should now see "full" tier access

---

## 🎯 WHAT THIS FIXES

**Before webhook setup:**
- ❌ Customers pay but stay on "free" tier
- ❌ Manual database updates required
- ❌ Angry customers who paid but can't access features

**After webhook setup:**
- ✅ Payments automatically update user tier
- ✅ Customers get immediate access after payment
- ✅ No manual intervention needed
- ✅ Professional payment experience

---

## 🚨 PRODUCTION READINESS

This webhook setup is **REQUIRED** before you can safely launch. Without it:
- Every customer who pays will face this same issue
- You'll need to manually fix each payment
- Customer trust will be damaged
- Support tickets will flood in

**The webhook must be working before any marketing or launch activities.**

---

## 📞 VERIFICATION

After setup, test by:
1. Making a test payment
2. Confirming tier updates automatically
3. Checking Supabase logs show webhook activity
4. Verifying no manual intervention needed

**Status: 🔴 CRITICAL - NOT SET UP**
**Action: 🚨 SET UP IMMEDIATELY** 