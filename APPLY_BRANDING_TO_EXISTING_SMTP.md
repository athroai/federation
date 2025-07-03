# Apply AthroAI Branding to Your Existing SMTP Setup

## 🎨 No Problem! Let's Add Beautiful Branding

Since you've already set up SMTP, we just need to apply the beautiful AthroAI branding to your email templates.

## **Quick Setup Steps:**

### 1. Access Supabase Email Templates
1. Go to your **Supabase Dashboard**
2. Navigate to: **Project Settings** → **Authentication** → **Email Templates**
3. You'll see templates for:
   - Confirm signup
   - Magic Link  
   - Reset password
   - Change email address

### 2. Apply AthroAI Welcome Template (Confirm Signup)

**Copy this entire template** into your "Confirm signup" template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to AthroAI</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
        .header { background-color: #1a2e1a; padding: 40px 30px; text-align: center; border-bottom: 3px solid #e4c97e; }
        .logo-container { margin-bottom: 15px; }
        .logo-img { max-width: 80px; height: auto; margin-bottom: 10px; }
        .logo-text { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #e4c97e; margin-bottom: 10px; }
        .subtitle { color: rgba(228, 201, 126, 0.9); font-size: 16px; font-weight: 400; }
        .content { padding: 40px 30px; background: white; }
        .greeting { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 600; color: #1a2e1a; margin-bottom: 20px; text-align: center; }
        .message { font-size: 16px; color: #4a5568; margin-bottom: 30px; text-align: center; line-height: 1.7; }
        .cta-button { display: inline-block; background-color: #1a2e1a; color: #e4c97e; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; width: 100%; max-width: 300px; margin: 20px auto; display: block; box-shadow: 0 4px 12px rgba(26, 46, 26, 0.3); border: 2px solid #e4c97e; }
        .cta-button:hover { background-color: #e4c97e; color: #1a2e1a; }
        .features { background: #f8fdf8; padding: 30px; margin: 30px 0; border-radius: 8px; border-left: 4px solid #1a2e1a; }
        .features h3 { font-family: 'Playfair Display', serif; color: #1a2e1a; margin-bottom: 15px; font-size: 18px; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { padding: 8px 0; position: relative; padding-left: 25px; color: #4a5568; }
        .feature-list li::before { content: '✓'; position: absolute; left: 0; color: #e4c97e; font-weight: bold; }
        .security-note { background: #fffef0; padding: 20px; border-radius: 8px; border-left: 4px solid #e4c97e; margin: 20px 0; font-size: 14px; color: #744210; }
        .footer { background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 600; color: #1a2e1a; margin-bottom: 15px; }
        .footer-text { font-size: 14px; color: #718096; margin-bottom: 15px; }
        .footer-link { color: #1a2e1a; text-decoration: none; }
        @media (max-width: 600px) { .email-container { margin: 10px; border-radius: 8px; } .header, .content, .footer { padding: 20px; } .logo-text { font-size: 24px; } .greeting { font-size: 20px; } }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo-container">
                <img src="https://yourdomain.com/athro4.png" alt="AthroAI Logo" class="logo-img">
                <div class="logo-text">AthroAI</div>
            </div>
            <div class="subtitle">Your AI-Powered Learning Companion</div>
        </div>
        <div class="content">
            <h1 class="greeting">Welcome to the Future of Learning! 🚀</h1>
            <p class="message">Hi there! We're thrilled you've joined the AthroAI family. You're about to experience a revolutionary approach to personalized learning that adapts to your unique style and goals.</p>
            <a href="{{ .ConfirmationURL }}" class="cta-button">Confirm Your Email & Get Started</a>
            <div class="features">
                <h3>What awaits you in AthroAI:</h3>
                <ul class="feature-list">
                    <li>AI-powered study plans tailored to your subjects and goals</li>
                    <li>Interactive mind maps and visual learning tools</li>
                    <li>Smart flashcards with spaced repetition</li>
                    <li>Wellbeing tracking and mindfulness integration</li>
                    <li>Progress analytics and achievement tracking</li>
                    <li>Seamless document management and note-taking</li>
                </ul>
            </div>
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This confirmation link will expire in 24 hours for your security. If you didn't create an AthroAI account, you can safely ignore this email.
            </div>
            <p class="message">Ready to transform your learning journey? Click the button above to confirm your email and dive into your personalized AI learning experience!</p>
        </div>
        <div class="footer">
            <div class="footer-logo">AthroAI</div>
            <p class="footer-text">Empowering students with AI-driven personalized learning</p>
            <p class="footer-text">Need help? Reach out to us at <a href="mailto:support@athroai.com" class="footer-link">support@athroai.com</a></p>
            <p class="footer-text">© 2024 AthroAI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 3. Apply Password Reset Template

**Copy this into your "Reset password" template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your AthroAI Password</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
        .header { background-color: #1a2e1a; padding: 40px 30px; text-align: center; border-bottom: 3px solid #e4c97e; }
        .logo-container { margin-bottom: 15px; }
        .logo-img { max-width: 80px; height: auto; margin-bottom: 10px; }
        .logo-text { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #e4c97e; margin-bottom: 10px; }
        .subtitle { color: rgba(228, 201, 126, 0.9); font-size: 16px; font-weight: 400; }
        .content { padding: 40px 30px; background: white; }
        .icon { text-align: center; margin-bottom: 20px; font-size: 48px; }
        .greeting { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 600; color: #1a2e1a; margin-bottom: 20px; text-align: center; }
        .message { font-size: 16px; color: #4a5568; margin-bottom: 30px; text-align: center; line-height: 1.7; }
        .cta-button { display: inline-block; background-color: #1a2e1a; color: #e4c97e; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; width: 100%; max-width: 300px; margin: 20px auto; display: block; box-shadow: 0 4px 12px rgba(26, 46, 26, 0.3); border: 2px solid #e4c97e; }
        .cta-button:hover { background-color: #e4c97e; color: #1a2e1a; }
        .security-warning { background: #fffef0; padding: 20px; border-radius: 8px; border-left: 4px solid #e4c97e; margin: 30px 0; font-size: 14px; color: #744210; }
        .security-tips { background: #f8fdf8; padding: 20px; border-radius: 8px; border-left: 4px solid #1a2e1a; margin: 20px 0; }
        .security-tips h3 { font-family: 'Playfair Display', serif; color: #1a2e1a; margin-bottom: 15px; font-size: 16px; }
        .tips-list { list-style: none; padding: 0; }
        .tips-list li { padding: 5px 0; position: relative; padding-left: 25px; color: #2f5a2f; font-size: 14px; }
        .tips-list li::before { content: '🔒'; position: absolute; left: 0; }
        .footer { background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 600; color: #1a2e1a; margin-bottom: 15px; }
        .footer-text { font-size: 14px; color: #718096; margin-bottom: 15px; }
        .footer-link { color: #1a2e1a; text-decoration: none; }
        @media (max-width: 600px) { .email-container { margin: 10px; border-radius: 8px; } .header, .content, .footer { padding: 20px; } .logo-text { font-size: 24px; } .greeting { font-size: 20px; } }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo-container">
                <img src="https://yourdomain.com/athro4.png" alt="AthroAI Logo" class="logo-img">
                <div class="logo-text">AthroAI</div>
            </div>
            <div class="subtitle">Your AI-Powered Learning Companion</div>
        </div>
        <div class="content">
            <div class="icon">🔐</div>
            <h1 class="greeting">Reset Your Password</h1>
            <p class="message">We received a request to reset your AthroAI password. No worries - it happens to the best of us! Click the button below to create a new secure password.</p>
            <a href="{{ .ConfirmationURL }}" class="cta-button">Reset My Password</a>
            <div class="security-warning">
                <strong>⏰ Time Sensitive:</strong> This password reset link will expire in 1 hour for your security. If you need a new link after it expires, please request another password reset.
            </div>
            <div class="security-tips">
                <h3>🛡️ Password Security Tips:</h3>
                <ul class="tips-list">
                    <li>Use at least 8 characters with a mix of letters, numbers, and symbols</li>
                    <li>Avoid using personal information like birthdays or names</li>
                    <li>Consider using a unique passphrase or password manager</li>
                    <li>Don't reuse passwords from other accounts</li>
                </ul>
            </div>
            <p class="message"><strong>Didn't request this?</strong> If you didn't ask to reset your password, you can safely ignore this email. Your account remains secure and no changes have been made.</p>
        </div>
        <div class="footer">
            <div class="footer-logo">AthroAI</div>
            <p class="footer-text">Keeping your learning journey secure and personalized</p>
            <p class="footer-text">Need help? Contact our support team at <a href="mailto:support@athroai.com" class="footer-link">support@athroai.com</a></p>
            <p class="footer-text">© 2024 AthroAI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

## **📝 Important Logo Setup:**

**Before using these templates, you need to host the athro4.png logo:**

1. **Upload `athro4.png` to your web server** (where you host your domain)
2. **Replace `https://yourdomain.com/athro4.png`** in both templates with your actual logo URL
3. **Alternative:** You can also upload to a CDN like Cloudinary or use a direct GitHub raw URL

**Example logo URLs:**
- `https://yourdomain.com/assets/athro4.png`
- `https://cdn.yoursite.com/images/athro4.png` 
- Or remove the `<img>` tag if you prefer text-only branding

## **✅ Steps Summary:**

1. **Host the athro4.png logo** on your domain
2. **Update logo URLs** in both templates above
3. **Copy templates** into Supabase Email Templates
4. **Save each template** 
5. **Test with a user signup** to see the beautiful branding

## **🎯 What You'll Get:**

- ✨ **Clean AthroAI branding** with dark green (#1a2e1a) and gold (#e4c97e)
- 🖼️ **Professional logo display** using your athro4.png
- 📱 **Mobile-responsive** design
- 🔒 **Security-focused** messaging
- 🚀 **Motivational content** about AthroAI features
- 🎨 **No gradients** - solid, professional colors

## **🧪 Testing:**

1. Create a test user account
2. Check email delivery 
3. Verify the beautiful AthroAI branding appears
4. Test the confirmation flow

**Your existing SMTP setup is perfect - now it just looks amazing with proper branding!** 🎉 