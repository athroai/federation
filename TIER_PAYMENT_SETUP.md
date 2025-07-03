# 🎯 **TIER-BASED PAYMENT & REDIRECT SYSTEM**

## **✅ IMPLEMENTED FEATURES**

### **💰 Payment Tiers**
- **Lite (£9.99/month)**: Workspace access only
- **Full (£19.99/month)**: Complete dashboard + workspace access

### **🔄 Auto-Redirects After Payment**
- **Lite users**: Redirected to workspace (`http://localhost:5210`)
- **Full users**: Redirected to dashboard (`/dashboard`)
- **Auto-redirect**: 3 seconds after payment verification

---

## **🚀 STRIPE DASHBOARD CONFIGURATION**

### **1. Configure Buy Button Success URLs**

You need to update your Stripe Buy Buttons with custom success URLs:

#### **Lite Buy Button (buy_btn_1RgB6MQYU340CsP0fwYsAc9u)**
```
Success URL: https://yourdomain.com/upgrade-success?tier=lite&user_id={CHECKOUT_SESSION_ID}
```

#### **Full Buy Button (buy_btn_1RgBCMQYU340CsP0PZu7Cg61)**
```
Success URL: https://yourdomain.com/upgrade-success?tier=full&user_id={CHECKOUT_SESSION_ID}
```

### **2. How to Update Buy Buttons:**
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Find your products (Lite & Full)
3. Click on each Buy Button
4. Update the **Success URL** with the URLs above
5. Save changes

---

## **🔧 WEBHOOK CONFIGURATION**

### **Option 1: Using Your Webhook Server (Recommended)**
```bash
# Update your webhook endpoint in Stripe Dashboard:
Endpoint URL: https://yourdomain.com/webhook
Events: checkout.session.completed, customer.subscription.*
```

### **Option 2: Using Supabase Edge Functions**
```bash
# If you prefer Supabase (but you said no Edge Functions):
Endpoint URL: https://your-project.supabase.co/functions/v1/stripe-webhook
```

---

## **📋 PRICE ID MAPPING**

I've updated the webhook server to handle your Buy Button price IDs:

```typescript
const PRICE_ID_TO_TIER = {
  'price_1RfM4LHlv5z8bwBIcwv3aUkb': 'lite',     // £9.99/month - Lite
  'price_1RfM4LHlv5z8bwBIKLFadfjp': 'full',     // £19.99/month - Full
  // Legacy price IDs (backup)
  'price_1Rfh1nQYU340CsP0kXM8I05h': 'lite',     
  'price_1RfgxvQYU340CsP0AcrSjH2O': 'full'      
};
```

**⚠️ IMPORTANT**: You need to verify these price IDs match your actual Stripe products.

---

## **🎮 HOW IT WORKS**

### **Payment Flow:**
1. **User clicks Buy Button** → Stripe Checkout opens
2. **Payment completes** → Stripe redirects to success URL with tier info
3. **UpgradeSuccess page** → Detects tier from URL
4. **Webhook processes** → Updates user tier in database
5. **Auto-redirect** → Sends user to appropriate platform:
   - **Lite**: Opens workspace in new tab
   - **Full**: Navigates to dashboard

### **Redirect Logic:**
```typescript
// Lite users: Workspace only
case 'lite':
  return 'http://localhost:5210'; // or VITE_WORKSPACE_URL

// Full users: Dashboard access  
case 'full':
  return '/dashboard';
```

---

## **🧪 TESTING CHECKLIST**

### **Before Testing:**
- [ ] Update Buy Button success URLs in Stripe Dashboard
- [ ] Configure webhook endpoint
- [ ] Start your webhook server (`npm run start` in webhook-server/)
- [ ] Verify price IDs in webhook server match your Stripe products

### **Test Flow:**
1. **Register new user** → Should work (already tested ✅)
2. **Click Lite Buy Button** → Should redirect to workspace after payment
3. **Click Full Buy Button** → Should redirect to dashboard after payment
4. **Check console logs** → Should show tier detection and redirect logic
5. **Verify database** → User tier should update correctly

---

## **📁 FILES MODIFIED**

1. ✅ **`UpgradeSuccess.tsx`** - Tier-based redirect logic
2. ✅ **`UpgradeModal.tsx`** - Updated Buy Buttons with user data
3. ✅ **`webhook-server/src/index.ts`** - Updated price ID mapping
4. ✅ **`StripeService.ts`** - Clean payment handling (no Edge Functions)

---

## **🔧 ENVIRONMENT VARIABLES**

Add to your `.env.local`:
```bash
# Workspace URL for Lite users
VITE_WORKSPACE_URL=http://localhost:5210

# Webhook server (if using)
WEBHOOK_URL=https://yourdomain.com/webhook
```

---

## **🚨 CRITICAL NEXT STEPS**

### **1. Get Actual Price IDs (URGENT)**
```bash
# Run this to get your actual price IDs:
stripe products list --expand=data.default_price
```

### **2. Update Buy Button Success URLs**
- This is ESSENTIAL for tier detection to work
- Without custom success URLs, the system can't detect which tier was purchased

### **3. Start Webhook Server**
```bash
cd webhook-server
npm install
npm start
```

### **4. Test Payment Flow**
- Use Stripe test cards
- Verify redirects work correctly
- Check database updates

---

## **💡 DEBUGGING COMMANDS**

```javascript
// In browser console after payment:
console.log('Current user tier:', userTier);
console.log('Redirect URL:', getTierRedirectUrl(userTier));

// Test redirect manually:
window.location.href = 'http://localhost:5210'; // Lite
// or
window.location.href = '/dashboard'; // Full
```

---

## **✅ SUCCESS CRITERIA**

After completing setup:
- ✅ **Lite users** → Automatically redirected to workspace
- ✅ **Full users** → Automatically redirected to dashboard  
- ✅ **Database updated** → User tier reflects purchase
- ✅ **No Edge Functions** → Pure Stripe + webhook approach
- ✅ **Auto-redirect** → 3-second delay then redirect

---

## **🆘 TROUBLESHOOTING**

### **User Not Redirecting:**
- Check Buy Button success URLs in Stripe Dashboard
- Verify tier parameter in URL: `?tier=lite` or `?tier=full`
- Check console for redirect logs

### **Wrong Tier in Database:**
- Verify price IDs in webhook server match Stripe products
- Check webhook is receiving events
- Look at webhook logs for errors

### **Redirect to Wrong Platform:**
- Check `getTierRedirectUrl()` logic in UpgradeSuccess.tsx
- Verify VITE_WORKSPACE_URL environment variable

---

Ready to test! 🚀 