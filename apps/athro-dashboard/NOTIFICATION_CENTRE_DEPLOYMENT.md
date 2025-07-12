# 🔔 AthroAI Notification Centre - Production Deployment Guide

## Overview
Complete notification system with calendar reminders, personalized hints & tips, low token warnings, and night silencing. Fully production-ready with beautiful UI and robust backend.

## ✅ Quick Start

### 1. Database Setup
Apply the database schema in your Supabase SQL Editor:

```sql
-- Run the complete schema setup
-- File: notification_centre_database_setup.sql
```

**Copy and paste the entire content of `notification_centre_database_setup.sql` into your Supabase SQL Editor and execute.**

### 2. Deploy Edge Function
Deploy the notification scheduler as a Supabase Edge Function:

```bash
# Navigate to supabase directory
cd apps/athro-dashboard/supabase

# Deploy the notification scheduler function
supabase functions deploy notification-scheduler

# Set up environment variables
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

### 3. Configure Cron Job
Set up the notification scheduler to run every 5 minutes:

**Option A: Supabase Cron (Recommended)**
```sql
-- Add to your Supabase SQL Editor
SELECT cron.schedule(
  'notification-processor', 
  '*/5 * * * *', -- Every 5 minutes
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/notification-scheduler'',
    headers := ''{"Authorization": "Bearer your-anon-key"}''::jsonb
  );'
);
```

**Option B: External Cron Service**
Use services like:
- Uptime Robot (with webhook monitoring)
- GitHub Actions (scheduled workflow)
- Vercel Cron Jobs
- AWS CloudWatch Events

Example webhook URL:
```
https://your-project.supabase.co/functions/v1/notification-scheduler
```

### 4. Verify Setup
1. Check database tables are created
2. Test notification preferences UI
3. Verify edge function deployment
4. Confirm cron job is running

## 🎯 Features Included

### 📱 Delivery Methods
- **Push Notifications**: Browser/device notifications with service worker
- **Email Notifications**: Integration-ready (Resend/SendGrid)
- **In-App Notifications**: Beautiful toast notifications in UI

### 📅 Calendar Reminders
- **Smart Scheduling**: 5, 10, or 15 minutes before events
- **Dynamic Rescheduling**: Automatically adjusts when events change
- **Event Types**: Study sessions, exams, assignments, revision

### 🧠 Hints & Tips (Personalized)
- **Athro Inactivity**: Reminds users about unused Athros (customizable days)
- **Study Tool Reminders**: Encourages flashcard/quiz usage
- **Resource Upload Nudges**: Prompts to upload new materials

### ⚠️ Low Token Warnings
- **Threshold-based**: Configurable percentage (5%-50%)
- **Urgency Levels**: Normal, high, critical warnings
- **Smart Timing**: Respects night silence preferences

### 🌙 Night Silencing
- **Do Not Disturb**: 10 PM - 8 AM (customizable)
- **Delayed Delivery**: Notifications wait until morning
- **Cross-midnight Support**: Handles time zones correctly

## 🎨 UI Features

### Beautiful Theme Integration
- **AthroAI Colors**: Consistent `#e4c97e` and `#b5cbb2` palette
- **Gradient Cards**: Modern glass-morphism design
- **Interactive Sliders**: Smooth controls for timing preferences
- **Status Indicators**: Visual feedback for all settings

### Smart UX
- **Non-invasive**: Settings-only approach, no main UI clutter
- **Test Functionality**: Send test notifications instantly
- **Real-time Updates**: Live preference saving
- **Responsive Design**: Works on all devices

## 🔧 Configuration

### Environment Variables
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Push Notifications (VAPID)
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Email Service (Optional)
RESEND_API_KEY=your_resend_api_key
```

### Notification Types
```typescript
type NotificationType = 
  | 'calendar_reminder'     // 📅 Study session starting soon
  | 'athro_tip'            // 🧠 Athro hasn't been used in X days
  | 'study_tool_reminder'  // 📚 Time to create flashcards/quiz
  | 'resource_upload_nudge' // 📂 Upload new study materials
  | 'low_token_warning'    // ⚠️ Token balance low
  | 'achievement'          // 🏆 Milestone reached
  | 'system'              // 🔧 System updates
```

## 📊 Activity Tracking

### Automatically Tracked
- **Athro Usage**: Which Athros are used and when
- **Study Tools**: Quiz generation, flashcard creation, note-taking
- **Resource Uploads**: File uploads with type classification
- **Token Usage**: Real-time token consumption monitoring
- **Calendar Events**: Event creation and modifications

### Integration Points
```typescript
// Track Athro usage
ActivityTracker.getInstance().onAthroCardClick(userId, athroId, subject);

// Track study tool usage
ActivityTracker.getInstance().onQuizGenerated(userId, subject);

// Track token usage
ActivityTracker.getInstance().onChatMessage(userId, tokensUsed, remaining);

// Track resource uploads
ActivityTracker.getInstance().onFileUploaded(userId, fileType, subject);
```

## 🚀 Production Checklist

### Pre-deployment
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] VAPID keys generated
- [ ] Email service configured (optional)
- [ ] Edge function deployed
- [ ] Cron job scheduled

### Testing
- [ ] Notification preferences save correctly
- [ ] Test notifications work
- [ ] Calendar reminders schedule properly
- [ ] Night silencing respects time windows
- [ ] Activity tracking logs correctly
- [ ] Token warnings trigger appropriately

### Monitoring
- [ ] Edge function logs reviewed
- [ ] Database performance monitored
- [ ] Notification delivery rates tracked
- [ ] User engagement metrics collected

### Security
- [ ] RLS policies verified
- [ ] Service role key secured
- [ ] VAPID keys rotated regularly
- [ ] Rate limiting implemented
- [ ] User data privacy maintained

## 🐛 Troubleshooting

### Common Issues

**Notifications not sending**
1. Check edge function logs in Supabase
2. Verify cron job is running
3. Confirm notification preferences are saved
4. Check user permissions and RLS policies

**Calendar reminders not working**
1. Verify calendar events are being created
2. Check notification_preferences.calendar_reminders_enabled
3. Confirm reminder timing calculations
4. Review night silencing settings

**Activity tracking not recording**
1. Check user authentication
2. Verify database permissions
3. Review RLS policies for activity tracking
4. Confirm ActivityTracker integration

**Push notifications blocked**
1. Check browser notification permissions
2. Verify VAPID key configuration
3. Confirm service worker registration
4. Test with different browsers

### Performance Optimization

**Database Queries**
- Indexes are created automatically
- Use pagination for large result sets
- Consider archiving old notifications
- Monitor slow query log

**Edge Function Efficiency**
- Batch process notifications
- Implement exponential backoff for retries
- Use connection pooling
- Cache user preferences temporarily

**Client-side Performance**
- Lazy load notification preferences
- Debounce preference updates
- Use React.memo for expensive components
- Implement virtual scrolling for large lists

## 📈 Analytics & Insights

### Metrics to Track
- **Notification delivery rates** by type and method
- **User engagement** with different notification categories  
- **Opt-out rates** for specific notification types
- **Peak notification times** for optimization
- **Activity correlation** with notification effectiveness

### Dashboard Queries
```sql
-- Notification delivery success rate
SELECT 
  notification_type,
  delivery_method,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as successful,
  ROUND(COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM notification_delivery_log 
GROUP BY notification_type, delivery_method
ORDER BY success_rate DESC;

-- Most active users
SELECT 
  user_id,
  COUNT(*) as activity_count,
  COUNT(DISTINCT activity_type) as activity_types,
  MAX(created_at) as last_activity
FROM user_activity_tracking 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id 
ORDER BY activity_count DESC 
LIMIT 20;

-- Notification preferences distribution
SELECT 
  calendar_reminders_enabled,
  hints_tips_enabled,
  low_token_warning_enabled,
  night_silence_enabled,
  COUNT(*) as user_count
FROM notification_preferences 
GROUP BY calendar_reminders_enabled, hints_tips_enabled, low_token_warning_enabled, night_silence_enabled
ORDER BY user_count DESC;
```

## 🤝 Support

For issues or questions:
1. Check this deployment guide
2. Review Supabase function logs
3. Test with different user accounts
4. Verify database table contents
5. Monitor edge function performance

## 🎉 Success!

Your AthroAI Notification Centre is now fully deployed and operational! Users can now:
- ✨ Receive personalized study reminders
- 🎯 Get intelligent hints based on usage patterns
- ⚠️ Stay informed about token usage
- 🌙 Enjoy distraction-free quiet hours
- 📱 Choose their preferred notification methods

The system is designed to enhance learning engagement while respecting user preferences and study patterns. 