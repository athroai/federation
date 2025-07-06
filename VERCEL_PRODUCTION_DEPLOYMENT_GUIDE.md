# 🚀 **ATHRO FEDERATION - VERCEL PRODUCTION DEPLOYMENT GUIDE**

## **📋 OVERVIEW**

You have a **federated architecture** with two apps that need separate Vercel deployments:
- **Dashboard** (Main App): User interface, payments, auth
- **Workspace** (Remote Module): AI workspace, embedded in dashboard

This guide ensures **rock-solid production deployment** on Vercel.

---

## **⚡ QUICK DEPLOYMENT CHECKLIST**

### **🔧 PREPARATION (Do This First)**

- [ ] **Update Domain URLs** in both `vite.config.ts` files (Line 18-19)
- [ ] **Set up Supabase** production project
- [ ] **Set up Stripe** live/production account
- [ ] **Get OpenAI API** production key
- [ ] **Push latest code** to GitHub main branch

### **🚀 VERCEL DEPLOYMENT**

- [ ] **Create Dashboard Project** in Vercel
- [ ] **Create Workspace Project** in Vercel  
- [ ] **Configure environment variables** for both
- [ ] **Deploy and test** federation connection
- [ ] **Set up custom domains** (optional)

---

## **📖 STEP-BY-STEP DEPLOYMENT**

### **STEP 1: UPDATE DOMAIN CONFIGURATION**

**1.1 Update Dashboard Vite Config**

In `apps/athro-dashboard/vite.config.ts`, lines 18-19:
```typescript
// UPDATE THESE WITH YOUR ACTUAL VERCEL DOMAINS
const DASHBOARD_PROD_URL = 'https://your-dashboard-domain.vercel.app';
const WORKSPACE_PROD_URL = 'https://your-workspace-domain.vercel.app';
```

**1.2 Update Workspace Vite Config**

In `apps/athro-workspace-2/vite.config.ts`, line 18:
```typescript
// UPDATE THIS WITH YOUR ACTUAL DOMAIN
const WORKSPACE_PROD_URL = 'https://your-workspace-domain.vercel.app';
```

### **STEP 2: VERCEL PROJECT SETUP**

**2.1 Create Dashboard Project**

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. **Import Git Repository**: `athroai/federation`
3. **Project Settings**:
   ```
   Project Name: athro-dashboard
   Framework: Vite
   Root Directory: apps/athro-dashboard
   Build Command: npm run build:standalone
   Output Directory: dist
   Install Command: cd ../.. && npm install
   ```

**2.2 Create Workspace Project**

1. **New Project** (second project)
2. **Import Git Repository**: `athroai/federation` (same repo)
3. **Project Settings**:
   ```
   Project Name: athro-workspace  
   Framework: Vite
   Root Directory: apps/athro-workspace-2
   Build Command: npm run build
   Output Directory: dist
   Install Command: cd ../.. && npm install
   ```

### **STEP 3: ENVIRONMENT VARIABLES**

**3.1 Dashboard Environment Variables**

In Vercel Dashboard → Project → Settings → Environment Variables, add:

```bash
# REQUIRED - Update these values
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-KEY
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR-STRIPE-KEY
VITE_STRIPE_LITE_PRICE_ID=price_YOUR-LITE-PRICE
VITE_STRIPE_PREMIUM_PRICE_ID=price_YOUR-PREMIUM-PRICE

# REQUIRED - Update with your actual domains
VITE_DASHBOARD_URL=https://your-dashboard.vercel.app
VITE_WORKSPACE_URL=https://your-workspace.vercel.app
VITE_SUCCESS_URL=https://your-dashboard.vercel.app/upgrade-success
VITE_CANCEL_URL=https://your-dashboard.vercel.app/upgrade-cancelled

# OPTIONAL - For monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
VITE_GA_TRACKING_ID=G-YOUR-GA-ID
```

**3.2 Workspace Environment Variables**

In Vercel Dashboard → Workspace Project → Settings → Environment Variables, add:

```bash
# REQUIRED - Update these values
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-KEY
VITE_OPENAI_API_KEY=sk-YOUR-OPENAI-KEY

# REQUIRED - Update with your actual domains  
VITE_WORKSPACE_URL=https://your-workspace.vercel.app
VITE_DASHBOARD_URL=https://your-dashboard.vercel.app

# OPTIONAL - For enhanced features
VITE_AWS_ACCESS_KEY_ID=YOUR-AWS-KEY
VITE_AWS_SECRET_ACCESS_KEY=YOUR-AWS-SECRET
VITE_AWS_REGION=us-east-1
```

### **STEP 4: SUPABASE PRODUCTION SETUP**

**4.1 Create Production Supabase Project**

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. **Run Database Migrations**:
   - Upload all `.sql` files from your repo root
   - Run them in order (check dependencies)
3. **Configure Authentication**:
   - Enable email/password auth
   - Set site URL to your dashboard domain
   - Configure redirect URLs

**4.2 Update CORS Settings**

In Supabase → Settings → API:
```bash
Additional allowed origins:
https://your-dashboard.vercel.app
https://your-workspace.vercel.app
```

### **STEP 5: STRIPE PRODUCTION SETUP**

**5.1 Live Mode Configuration**

1. **Switch to Live Mode** in Stripe Dashboard
2. **Create Products**:
   - Lite Tier: Create product + recurring price
   - Premium Tier: Create product + recurring price
3. **Get Live Keys**:
   - Copy publishable key (`pk_live_...`)
   - Copy price IDs (`price_...`)

**5.2 Webhook Configuration**

1. **Create Webhook**: Stripe → Developers → Webhooks
2. **Endpoint URL**: `https://your-dashboard.vercel.app/api/stripe-webhook`
3. **Events**: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

### **STEP 6: DEPLOY AND TEST**

**6.1 Deploy Both Projects**

1. **Push to GitHub**: All your latest changes
2. **Dashboard Deploy**: Vercel auto-deploys from main branch
3. **Workspace Deploy**: Vercel auto-deploys from main branch
4. **Check Build Logs**: Ensure no errors

**6.2 Test Federation Connection**

1. **Open Dashboard**: https://your-dashboard.vercel.app
2. **Check Network Tab**: Look for workspace remoteEntry.js loading
3. **Test Workspace Features**: Make sure embedded workspace works
4. **Test Payment Flow**: Upgrade process end-to-end

---

## **🔒 SECURITY CHECKLIST**

### **Production Security Requirements**

- [ ] **HTTPS Enabled** (automatic with Vercel)
- [ ] **Environment Variables** set correctly
- [ ] **CORS Configured** for cross-origin federation
- [ ] **CSP Headers** configured (already in vercel.json)
- [ ] **API Keys** are production/live versions
- [ ] **Supabase RLS** policies active
- [ ] **Stripe Live Mode** enabled

---

## **📊 MONITORING SETUP**

### **Error Tracking**

1. **Sentry Setup** (Recommended):
   ```bash
   # Add to both apps' environment variables
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project
   ```

2. **Vercel Analytics** (Built-in):
   - Enable in Vercel project settings
   - Monitor performance and usage

### **Uptime Monitoring**

1. **URLs to Monitor**:
   - Dashboard: `https://your-dashboard.vercel.app`
   - Workspace: `https://your-workspace.vercel.app/assets/remoteEntry.js`
   - API Health: `https://your-dashboard.vercel.app/api/health`

---

## **⚡ PERFORMANCE OPTIMIZATION**

### **Built-in Optimizations**

- ✅ **Module Federation**: Shared dependencies
- ✅ **Asset Caching**: Long-term cache headers  
- ✅ **Code Splitting**: Automatic with Vite
- ✅ **Compression**: Automatic with Vercel
- ✅ **CDN**: Global edge network with Vercel

### **Custom Optimizations**

1. **Federation Caching**:
   - RemoteEntry.js cached for 5 minutes
   - Assets cached for 1 year
   
2. **Database Optimization**:
   - Use Supabase connection pooling
   - Enable read replicas if needed

---

## **🚨 TROUBLESHOOTING**

### **Common Issues & Solutions**

**Issue**: Federation loading fails
```bash
# Solution: Check CORS headers in workspace vercel.json
# Ensure dashboard domain is allowed
```

**Issue**: Environment variables not working
```bash
# Solution: Ensure variables are set in Vercel dashboard
# Check they're set for "Production" environment
```

**Issue**: Build fails with monorepo
```bash
# Solution: Use correct install command
Install Command: cd ../.. && npm install
```

**Issue**: Stripe webhook failures
```bash
# Solution: Check webhook URL and events
# Ensure endpoint URL is correct in Stripe dashboard
```

---

## **🎯 PRE-LAUNCH TESTING**

### **Critical Test Scenarios**

- [ ] **User Registration**: New user signup flow
- [ ] **Authentication**: Login/logout functionality  
- [ ] **Federation Loading**: Workspace loads in dashboard
- [ ] **Payment Upgrade**: Lite → Premium upgrade
- [ ] **Document Upload**: PDF processing works
- [ ] **AI Functionality**: OpenAI integration works
- [ ] **Cross-Device**: Works on mobile/desktop
- [ ] **Error Handling**: Graceful error states

---

## **🚀 LAUNCH CHECKLIST**

### **Final Pre-Launch Steps**

- [ ] **Domain Migration**: Update all URLs to production domains
- [ ] **DNS Configuration**: Point custom domains to Vercel
- [ ] **SSL Certificates**: Ensure HTTPS working
- [ ] **Performance Test**: Load testing with real traffic
- [ ] **User Acceptance**: Final testing with real users
- [ ] **Monitoring Active**: Error tracking and uptime monitoring
- [ ] **Backup Plan**: Rollback strategy ready
- [ ] **Support Ready**: Documentation and support contacts

### **Launch Day Monitoring**

1. **Watch Error Rates**: Monitor Sentry/Vercel logs
2. **Check Performance**: Response times and loading
3. **Monitor Federation**: Workspace loading successfully
4. **Track Payments**: Stripe webhook processing
5. **User Feedback**: Monitor support channels

---

## **📞 SUPPORT RESOURCES**

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Module Federation**: [webpack.js.org/concepts/module-federation](https://webpack.js.org/concepts/module-federation/)
- **Vite Federation**: [@originjs/vite-plugin-federation](https://github.com/originjs/vite-plugin-federation)

---

## **✅ SUCCESS METRICS**

Your deployment is **rock-solid** when:

- ✅ **Both apps deploy** without build errors
- ✅ **Federation works** across production domains  
- ✅ **Payments process** end-to-end successfully
- ✅ **Performance is fast** (<3s initial load)
- ✅ **Error rates low** (<1% error rate)
- ✅ **Monitoring active** and alerting properly

**🎉 Ready for Production Launch!** 