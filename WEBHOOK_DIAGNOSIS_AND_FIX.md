# 🚨 WEBHOOK PAYMENT PROCESSING - DIAGNOSIS & FIX

## **CRITICAL ISSUE IDENTIFIED**

**Problem**: User paid £19.99 for premium tier but system still shows "Free" tier  
**Cause**: Stripe webhook not properly updating user tier after successful payment  
**Impact**: Paying customers don't get access to paid features  

---

## **🔍 DIAGNOSIS**

### **Current Webhook Setup Issues:**

1. **Multiple webhook endpoints** configured but not working consistently
2. **Price ID mapping** may not match actual Stripe products  
3. **Webhook secret** configuration issues
4. **Event processing** failing silently

### **Files Involved:**
- `apps/athro-dashboard/supabase/functions/stripe-webhook/index.ts` (Supabase Edge Function)
- `webhook-server/src/index.ts` (Standalone webhook server)
- Various environment configurations

---

## **🚀 IMMEDIATE FIXES**

### **Fix #1: Emergency User Tier Update**

**In browser console (while user is logged in):**
```javascript
// Run the emergency fix from IMMEDIATE_BROWSER_FIX.js
await emergencyTierFix();
```

**Or in Supabase SQL Editor:**
```sql
-- Update any recent free tier users to full (last 2 hours)
UPDATE profiles 
SET 
    user_tier = 'full',
    subscription_status = 'active',
    updated_at = NOW()
WHERE user_tier = 'free' 
  AND created_at > NOW() - INTERVAL '2 hours'
  AND email NOT LIKE '%athroai@nexastream.co.uk%';
```

### **Fix #2: Webhook Configuration**

**Step 1: Verify Stripe Webhook Endpoint**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Ensure you have ONE active endpoint: 
   ```
   https://klxmxaeforrhzkmvsczs.supabase.co/functions/v1/stripe-webhook
   ```
3. Required events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

**Step 2: Verify Price IDs**
```bash
# Run this to get your actual Stripe price IDs:
stripe prices list --limit 10
```

Compare with your webhook configuration:
- **Lite (£9.99)**: `price_1RfM4LHlv5z8bwBIcwv3aUkb`
- **Full (£19.99)**: `price_1RfM4LHlv5z8bwBIKLFadfjp`

---

## **🔧 PERMANENT SOLUTION**

### **Option A: Fix Supabase Edge Function (Recommended)**

**1. Update Price ID Mapping**
```typescript
// In apps/athro-dashboard/supabase/functions/stripe-webhook/index.ts
const PRICE_ID_TO_TIER = {
  'price_1RfM4LHlv5z8bwBIcwv3aUkb': 'lite',     // £9.99/month
  'price_1RfM4LHlv5z8bwBIKLFadfjp': 'full',     // £19.99/month - THIS IS KEY!
  // Add your actual price IDs here
} as const;
```

**2. Deploy Updated Function**
```bash
cd apps/athro-dashboard
supabase functions deploy stripe-webhook
```

**3. Set Environment Variables**
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_your_key"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_secret"
supabase secrets set STRIPE_LITE_PRICE_ID="price_1RfM4LHlv5z8bwBIcwv3aUkb"
supabase secrets set STRIPE_PREMIUM_PRICE_ID="price_1RfM4LHlv5z8bwBIKLFadfjp"
```

### **Option B: Use Standalone Webhook Server**

**1. Start the webhook server:**
```bash
cd webhook-server
npm install
npm start
```

**2. Update Stripe webhook endpoint to:**
```
https://your-domain.com/webhook
```

---

## **🧪 TESTING & VERIFICATION**

### **Test the Fix:**

**1. Make a test payment (use Stripe test cards):**
   - Card: `4242424242424242`
   - Expiry: Any future date
   - CVC: Any 3 digits

**2. Monitor webhook events:**
```bash
# Watch Supabase logs
supabase logs --project-ref klxmxaeforrhzkmvsczs --follow

# Look for these logs:
# ✅ Webhook signature verified
# ✅ Mapped to FULL tier
# ✅ Updated user tier to full
```

**3. Verify user tier update:**
```sql
-- Check recent tier changes
SELECT 
    id, email, user_tier, subscription_status, updated_at
FROM profiles 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

---

## **🚨 CRITICAL ACTIONS NEEDED**

### **Immediate (Next 15 minutes):**
1. ✅ Run emergency tier fix for current user
2. ✅ Verify webhook endpoint in Stripe Dashboard  
3. ✅ Check webhook secret configuration

### **Today (Next 2 hours):**
1. ✅ Fix price ID mapping in webhook
2. ✅ Deploy updated webhook function
3. ✅ Test with small payment
4. ✅ Verify tier updates work

### **This Week:**
1. ✅ Monitor all payments for proper tier updates
2. ✅ Set up alerting for webhook failures
3. ✅ Create automated tier verification

---

## **🎯 SUCCESS CRITERIA**

### **After the fix:**
- ✅ User who paid £19.99 shows "AthroAI Full" tier
- ✅ All premium dashboard features unlocked
- ✅ No blocked cards for full account
- ✅ Future payments automatically update tiers
- ✅ Webhook logs show successful processing

### **Monitoring:**
```javascript
// Browser console verification
console.log('Current user tier:', window.userTier);

// Check database directly
// SQL: SELECT user_tier FROM profiles WHERE id = 'user-id';
```

---

## **📞 ESCALATION**

**If fixes don't work:**
1. **Immediate**: Manually update user tier in database
2. **Short-term**: Process payments manually until webhook fixed  
3. **Long-term**: Consider alternative payment processors

**Contact Points:**
- Stripe Dashboard → Webhooks → Test webhook delivery
- Supabase Dashboard → Functions → Check function logs
- This system: Emergency JavaScript functions available

---

## **💡 PREVENTION**

### **Future Payment Testing:**
```bash
# Always test payment flow with these steps:
1. Register test user
2. Complete payment  
3. Verify tier update in database
4. Check all features unlock
5. Monitor webhook logs
```

### **Monitoring Setup:**
- Set up Supabase alerts for failed tier updates
- Create daily reports of payment vs tier mismatches
- Add webhook failure notifications

**This issue must be resolved immediately to prevent customer loss!** 🚨 