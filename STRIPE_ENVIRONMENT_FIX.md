# 🔧 **STRIPE ENVIRONMENT CONFIGURATION FIX**

## **Issue Summary**
Your Stripe payment integration isn't working because environment variables are misconfigured between frontend and backend systems.

## **Root Cause**
- **Frontend expects**: `VITE_STRIPE_LITE_PRICE_ID` + `VITE_STRIPE_PREMIUM_PRICE_ID`  
- **Webhook expects**: `STRIPE_LITE_PRICE_ID` + `STRIPE_PREMIUM_PRICE_ID`
- **Current setup**: Only has single `VITE_STRIPE_PRICE_ID`

When users make payments, the webhook can't match price IDs to tiers, causing incorrect user tier assignments.

---

## **🚀 QUICK FIX (5 minutes)**

### **Step 1: Run the Setup Script**
```bash
# Make script executable (if not already)
chmod +x scripts/setup-stripe-environment.sh

# Run the automated setup
./scripts/setup-stripe-environment.sh
```

The script will:
- ✅ Configure Supabase Edge Function environment variables
- ✅ Create local environment file with correct variables  
- ✅ Deploy updated Edge Functions
- ✅ Provide next steps guidance

### **Step 2: Configure Stripe Webhook (Manual)**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

### **Step 3: Update Local Environment**
Edit `apps/athro-dashboard/.env.local` and add your Supabase credentials:
```bash
# Update these with your actual values
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## **🔍 MANUAL SETUP (Alternative)**

If you prefer manual setup:

### **Frontend Environment Variables**
Add to `apps/athro-dashboard/.env.local`:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
VITE_STRIPE_LITE_PRICE_ID=price_your_lite_price
VITE_STRIPE_PREMIUM_PRICE_ID=price_your_premium_price
```

### **Supabase Edge Function Variables**
```bash
# Set in Supabase (requires Supabase CLI)
supabase secrets set STRIPE_SECRET_KEY="sk_test_your_secret_key"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
supabase secrets set STRIPE_LITE_PRICE_ID="price_your_lite_price"
supabase secrets set STRIPE_PREMIUM_PRICE_ID="price_your_premium_price"

# Deploy functions to apply changes
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

---

## **🧪 TESTING YOUR FIX**

### **1. Check Environment Variables**
```bash
# List Supabase secrets
supabase secrets list

# Should show:
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 
# STRIPE_LITE_PRICE_ID, STRIPE_PREMIUM_PRICE_ID
```

### **2. Test Payment Flow**
1. Start your development server
2. Open upgrade modal
3. Attempt to create checkout session
4. Check browser console for price ID logs
5. Check Supabase function logs: `supabase logs`

### **3. Test Webhook Processing**
1. Make a test payment in Stripe
2. Check Supabase function logs for webhook events
3. Verify user tier updates in your database
4. Look for the debug logs: "🔧 Price ID Mapping Debug"

---

## **📋 VERIFICATION CHECKLIST**

- [ ] **Frontend Variables Set**: `VITE_STRIPE_LITE_PRICE_ID` and `VITE_STRIPE_PREMIUM_PRICE_ID`
- [ ] **Backend Variables Set**: `STRIPE_LITE_PRICE_ID` and `STRIPE_PREMIUM_PRICE_ID`
- [ ] **Webhook Endpoint Configured**: In Stripe Dashboard
- [ ] **Edge Functions Deployed**: Latest version with environment variables
- [ ] **Payment Flow Works**: Can create checkout sessions
- [ ] **Tier Updates Work**: Users get correct tier after payment

---

## **🔧 TROUBLESHOOTING**

### **"Price ID not matching" Issues**
```bash
# Check the actual price IDs in Stripe Dashboard
# Products → View product → Pricing → Copy price ID

# Compare with your environment variables
echo $VITE_STRIPE_LITE_PRICE_ID
echo $VITE_STRIPE_PREMIUM_PRICE_ID
```

### **Webhook Not Receiving Events**
1. Check webhook endpoint URL is correct
2. Verify webhook secret matches
3. Check Stripe webhook delivery logs
4. View Supabase function logs: `supabase logs --project-ref YOUR_REF`

### **Users Getting Wrong Tier**
Check webhook logs for these debug messages:
```
🔧 Price ID Mapping Debug:
  Received Price ID: price_xxx
  Expected Lite Price ID: price_yyy
  Expected Premium Price ID: price_zzz
```

### **Environment Variables Missing**
If you see "❌ Missing price ID environment variables":
```bash
# Re-run the setup script
./scripts/setup-stripe-environment.sh

# Or set manually
supabase secrets set STRIPE_LITE_PRICE_ID="your_price_id"
supabase secrets set STRIPE_PREMIUM_PRICE_ID="your_price_id"
```

---

## **📁 FILES MODIFIED**

1. ✅ **`env.production.template`** - Updated with separate price IDs
2. ✅ **`stripe-webhook/index.ts`** - Improved price ID mapping logic
3. ✅ **`scripts/setup-stripe-environment.sh`** - Automated setup script

---

## **🎯 EXPECTED OUTCOME**

After applying this fix:

1. **Payment Flow**: Users can successfully upgrade to Lite/Premium tiers
2. **Correct Tiers**: Webhook properly maps price IDs to user tiers
3. **Debug Visibility**: Clear logging shows what's happening
4. **Error Handling**: Unknown price IDs default to 'free' instead of 'lite'

---

## **💡 DEVELOPMENT TIPS**

### **Quick Debug Commands**
```bash
# View Supabase function logs in real-time
supabase logs --follow

# Check current secrets
supabase secrets list

# Test webhook locally (if using Supabase CLI)
supabase functions serve stripe-webhook --debug
```

### **Environment File Locations**
- **Development**: `apps/athro-dashboard/.env.local`
- **Production Template**: `apps/athro-dashboard/env.production.template`
- **Vercel/Production**: Set in deployment platform

---

## **🆘 SUPPORT**

If you're still having issues:

1. **Check Logs**: Run `supabase logs` and look for webhook errors
2. **Verify Price IDs**: Double-check they match exactly in Stripe Dashboard  
3. **Test Webhook**: Use Stripe's webhook testing tool
4. **Environment**: Ensure all variables are set correctly

The webhook now includes detailed logging to help debug price ID mapping issues! 