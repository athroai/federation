# 🔗 **STRIPE WEBHOOK SETUP GUIDE**

## **🚨 CRITICAL: This Must Be Done for Payments to Work**

Your payment integration **will not work** until the Stripe webhook is properly configured. The 406 error you're seeing is because Stripe can't notify your system when payments complete.

---

## **📋 Step-by-Step Webhook Setup**

### **Step 1: Access Stripe Dashboard**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks** in the left sidebar
3. Click **"Add endpoint"**

### **Step 2: Configure Endpoint**
**Endpoint URL:** 
```
https://klxmxaeforrhzkmvsczs.supabase.co/functions/v1/stripe-webhook
```

**Events to select:** *(Click "Select events" button)*
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`  
- ✅ `invoice.payment_failed`

### **Step 3: Save and Test**
1. Click **"Add endpoint"**
2. Stripe will show you the webhook signing secret
3. **Important**: This should match what we set earlier: `whsec_A0gXRdCQsgZUjnVwhseZ8IMAs1t9ArHm`

---

## **🧪 Testing Your Setup**

### **After Webhook Configuration:**

1. **Try a payment** in your app
2. **Check logs immediately**: 
   ```bash
   supabase logs --project-ref klxmxaeforrhzkmvsczs --follow
   ```
3. **Look for webhook events** with our debug output:
   ```
   🔧 Price ID Mapping Debug:
     Received Price ID: price_1RfM4LHlv5z8bwBIcwv3aUkb
     Expected Premium Price ID: price_1RfM4LHlv5z8bwBIcwv3aUkb
   ✅ Mapped to FULL tier
   ```

### **In Browser Console:**
You can also test manually with our debug tool:
```javascript
// Check current user tier
athroDebug.checkUserTier('your-user-id')

// Force update tier (emergency fallback)
athroDebug.testTierUpdate('your-user-id', 'full')
```

---

## **🔍 What Should Happen**

### **Before Webhook Setup:**
- ❌ User stays on "free" tier after payment
- ❌ 406 errors in browser console
- ❌ No webhook events in Supabase logs

### **After Webhook Setup:**
- ✅ User automatically upgraded to "full" tier
- ✅ No more 406 errors  
- ✅ Webhook events visible in logs
- ✅ Price ID mapping shows correct tier

---

## **🚨 Troubleshooting**

### **If webhook still not working:**

1. **Check endpoint URL** in Stripe dashboard:
   - Should be: `https://klxmxaeforrhzkmvsczs.supabase.co/functions/v1/stripe-webhook`
   - NOT: `http://` (must be `https://`)

2. **Verify events are selected**:
   - Minimum required: `checkout.session.completed`
   - Recommended: All 5 events listed above

3. **Check webhook secret**:
   - Should start with `whsec_`
   - Must match what we configured in Supabase

4. **Test webhook delivery**:
   - In Stripe Dashboard → Webhooks → Your endpoint
   - Click "Send test webhook"
   - Should see 200 response

### **If user tier still not updating:**

```bash
# Check if webhook is receiving events
supabase logs --project-ref klxmxaeforrhzkmvsczs | grep "stripe-webhook"

# Look for our debug output
supabase logs --project-ref klxmxaeforrhzkmvsczs | grep "Price ID Mapping"
```

### **Emergency Manual Fix:**
If webhook fails, you can manually update user tier:
1. Open browser console on your app
2. Run: `athroDebug.testTierUpdate('your-user-id', 'full')`
3. Refresh page to see tier change

---

## **✅ Verification Checklist**

- [ ] **Webhook endpoint added** in Stripe Dashboard
- [ ] **Correct URL**: `https://klxmxaeforrhzkmvsczs.supabase.co/functions/v1/stripe-webhook`
- [ ] **Events selected**: `checkout.session.completed` (minimum)
- [ ] **Test payment made** and logs checked
- [ ] **User tier updates** from "free" to "full" after payment
- [ ] **No more 406 errors** in browser console

---

## **🎯 Expected Outcome**

Once properly configured:
1. **User clicks "Choose Premium"** → Stripe checkout opens
2. **User completes payment** → Stripe sends webhook to your function
3. **Webhook processes event** → Updates user tier in database
4. **User returns to success page** → Sees "Welcome to Athro Full!"
5. **Dashboard refreshes** → All premium features unlocked

**This is the final step to get your payment system working!** 🚀 