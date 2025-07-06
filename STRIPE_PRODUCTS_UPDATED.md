# 🆕 STRIPE PRODUCTS UPDATED - NEW PRICING STRUCTURE

## ✅ **NEW STRIPE PRODUCTS IMPLEMENTED**

The pricing changes required new Stripe products with updated price IDs and buy button URLs.

---

## 💰 **NEW STRIPE PRODUCT DETAILS**

### **Lite Tier - £7.99/month**
- **Buy Button URL**: `https://buy.stripe.com/test_6oU5kF3PU9QqbiJdUpew803`
- **Buy Button ID**: `buy_btn_1Rh8DUQYU340CsP0B5BleIGI`
- **Price ID**: `price_1Rh7kCQYU340CsP0NGbx0Qnj`
- **Features**: 1,000,000 tokens/month, Full workspace & dashboard access

### **Full Tier (AthroAI) - £14.99/month**  
- **Buy Button URL**: `https://buy.stripe.com/test_6oUfZj86a7Ii9aBaIdew802`
- **Buy Button ID**: `buy_btn_1Rh7s0QYU340CsP0POfp9y98`
- **Price ID**: `price_1Rh7lMQYU340CsP0yJy4VaTu`
- **Features**: 1,602,000 tokens/month, All features + token top-ups

---

## 🔧 **FILES UPDATED**

### **Webhook Servers**:
✅ `webhook-server/src/index.ts`
- Updated PRICE_ID_TO_TIER mapping with new price IDs
- Maintained legacy price IDs for backwards compatibility

✅ `apps/athro-dashboard/supabase/functions/stripe-webhook/index.ts`
- Updated Edge Function with new price IDs
- Maintained legacy support

### **Stripe Service**:
✅ `apps/athro-dashboard/src/services/StripeService.ts`
- Updated buyButtonUrls with new Stripe buy button URLs
- Updated for new £7.99 and £14.99 pricing

---

## 📋 **PRICE ID MAPPING**

### **Current (Active)**:
```typescript
const PRICE_ID_TO_TIER = {
  'price_1Rh7kCQYU340CsP0NGbx0Qnj': 'lite',     // £7.99/month - NEW
  'price_1Rh7lMQYU340CsP0yJy4VaTu': 'full',     // £14.99/month - NEW
  // Legacy (for backwards compatibility)
  'price_1RfM4LHlv5z8bwBIcwv3aUkb': 'lite',     // OLD
  'price_1RfM4LHlv5z8bwBIKLFadfjp': 'full',     // OLD
}
```

### **Buy Button URLs**:
```typescript
const buyButtonUrls = {
  lite: 'https://buy.stripe.com/test_6oU5kF3PU9QqbiJdUpew803',
  premium: 'https://buy.stripe.com/test_6oUfZj86a7Ii9aBaIdew802'
}
```

---

## 🧪 **TESTING CHECKLIST**

### **Webhook Processing**:
- [ ] New Lite payments (price_1Rh7kCQYU340CsP0NGbx0Qnj) → 'lite' tier
- [ ] New Full payments (price_1Rh7lMQYU340CsP0yJy4VaTu) → 'full' tier
- [ ] Legacy payments still work (backwards compatibility)
- [ ] Database tier updates correctly

### **Buy Button URLs**:
- [ ] Lite buy button redirects to correct Stripe checkout
- [ ] Full buy button redirects to correct Stripe checkout
- [ ] Pricing displays £7.99 and £14.99 correctly
- [ ] Success/cancel flows work properly

### **User Experience**:
- [ ] Users can purchase Lite tier at £7.99/month
- [ ] Users can purchase Full tier at £14.99/month
- [ ] Existing customers with old price IDs continue to work
- [ ] New customers get new price IDs

---

## 🚀 **DEPLOYMENT NOTES**

### **Environment Variables**:
No additional environment variables needed. The price IDs and URLs are hardcoded in the application.

### **Stripe Dashboard**:
- ✅ New products created with correct pricing
- ✅ Buy buttons configured with proper success URLs
- ✅ Webhook endpoints configured for new price IDs

### **Backwards Compatibility**:
- ✅ Legacy price IDs maintained in webhook mapping
- ✅ Existing customers continue to work
- ✅ Smooth transition for new customers

---

## 📞 **SUPPORT NOTES**

### **Price ID Reference**:
- **Current Lite**: `price_1Rh7kCQYU340CsP0NGbx0Qnj`
- **Current Full**: `price_1Rh7lMQYU340CsP0yJy4VaTu`
- **Old Lite**: `price_1RfM4LHlv5z8bwBIcwv3aUkb`
- **Old Full**: `price_1RfM4LHlv5z8bwBIKLFadfjp`

### **User-Facing Pricing**:
- ✅ Free: "Free" 
- ✅ Lite: "£7.99/month"
- ✅ AthroAI: "£14.99/month"
- ✅ Top-ups: "£2.00 per pack"

The system now uses the updated Stripe products while maintaining backwards compatibility for existing customers. 