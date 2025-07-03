# SMTP Email Setup Guide for AthroAI

## Overview
This guide will help you set up SMTP email handling instead of using Supabase's default email service. This gives you better control over email delivery, branding, and analytics.

## 🚀 Quick Setup (Recommended: Resend)

### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free)
3. Verify your domain or use their test domain initially

### Step 2: Get API Key
1. Go to Settings → API Keys
2. Create a new API key with "Sending access"
3. Copy the API key (starts with `re_`)

### Step 3: Configure Supabase Dashboard
Go to your Supabase project dashboard:
1. **Project Settings** → **Authentication** → **Email Templates**
2. **SMTP Settings**:
   ```
   Host: smtp.resend.com
   Port: 587 (TLS) or 465 (SSL)
   Username: resend
   Password: [Your Resend API Key]
   Sender Name: AthroAI
   Sender Email: noreply@yourdomain.com
   ```

### Step 4: Environment Variables
Add to your production environment:
```env
# Email Configuration
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
SMTP_FROM_NAME=AthroAI
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

## 📧 Alternative Providers

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_api_key_here
```

### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_aws_access_key_id
SMTP_PASS=your_aws_secret_access_key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your_mailgun_password
```

## 🎨 Custom Email Templates

### Creating Custom Templates
1. In Supabase Dashboard → Authentication → Email Templates
2. Customize these templates:
   - **Confirm signup**
   - **Magic Link**
   - **Change email address**
   - **Reset password**

### Example Email Template (Signup Confirmation)
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to AthroAI</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4fc38a, #e4c97e); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { background: #4fc38a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to AthroAI!</h1>
            <p>Your AI-powered learning companion</p>
        </div>
        <div class="content">
            <h2>Confirm your email address</h2>
            <p>Hi there! Thanks for signing up for AthroAI. Please confirm your email address to get started with your personalized learning experience.</p>
            <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2024 AthroAI. All rights reserved.</p>
            <p>Need help? Contact us at support@yourdomain.com</p>
        </div>
    </div>
</body>
</html>
```

## 🔧 Edge Function for Custom Email Logic

### Create Custom Email Function
```typescript
// supabase/functions/send-custom-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, templateType } = await req.json()

    // SMTP configuration
    const smtpConfig = {
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      username: Deno.env.get('SMTP_USER'),
      password: Deno.env.get('SMTP_PASS'),
      from: {
        name: Deno.env.get('SMTP_FROM_NAME') || 'AthroAI',
        email: Deno.env.get('SMTP_FROM_EMAIL') || 'noreply@athroai.com'
      }
    }

    // Send email using your preferred method
    // This is a simplified example - implement with your SMTP library

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
```

## 📊 Email Analytics & Monitoring

### Track Email Performance
```typescript
// Add to your email service
interface EmailAnalytics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
}

// Store analytics in Supabase
const trackEmailEvent = async (emailId: string, event: string) => {
  await supabase
    .from('email_events')
    .insert({
      email_id: emailId,
      event_type: event,
      timestamp: new Date().toISOString()
    })
}
```

## 🧪 Testing Your Setup

### 1. Test SMTP Connection
```bash
# Test with curl (replace with your values)
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "AthroAI <noreply@yourdomain.com>",
    "to": ["test@example.com"],
    "subject": "SMTP Test",
    "html": "<p>Your SMTP is working!</p>"
  }'
```

### 2. Test Supabase Integration
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Invite user" 
3. Enter a test email
4. Check if email is sent via your SMTP provider

## 🔒 Security Best Practices

### Environment Variables
- Never commit SMTP credentials to version control
- Use different SMTP accounts for development/production
- Rotate API keys regularly
- Enable 2FA on your SMTP provider account

### Rate Limiting
```typescript
// Implement rate limiting for email sends
const rateLimitEmail = async (userId: string) => {
  const { data: recentEmails } = await supabase
    .from('email_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
  
  if (recentEmails && recentEmails.length >= 5) {
    throw new Error('Email rate limit exceeded')
  }
}
```

## 🚀 Production Deployment

### Vercel Environment Variables
Add these to your Vercel project settings:
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_your_production_api_key
SMTP_FROM_NAME=AthroAI
SMTP_FROM_EMAIL=noreply@athroai.com
```

### Domain Setup
1. Add DNS records for your domain
2. Verify domain ownership with your SMTP provider
3. Set up SPF, DKIM, and DMARC records for better deliverability

### SPF Record Example
```
v=spf1 include:_spf.resend.com ~all
```

### DMARC Record Example
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

## 📞 Support

If you need help with any of these steps:
1. Check your SMTP provider's documentation
2. Test with a simple email first
3. Monitor your Supabase logs for authentication errors
4. Check spam folders during testing

## Next Steps
1. Choose your SMTP provider
2. Configure Supabase SMTP settings
3. Customize email templates
4. Test the integration
5. Monitor email delivery and analytics 