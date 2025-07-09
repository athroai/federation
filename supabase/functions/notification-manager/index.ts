import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { webpush } from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  type: 'push' | 'email' | 'schedule_reminder' | 'track' | 'subscribe' | 'snooze';
  data: any;
  userId?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Configure webpush
    webpush.setVapidDetails(
      'mailto:support@athroai.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    const { type, data, userId }: NotificationRequest = await req.json()

    switch (type) {
      case 'subscribe':
        return await handleSubscribe(supabase, data, userId)
      
      case 'push':
        return await handlePushNotification(supabase, data)
      
      case 'email':
        return await handleEmailNotification(supabase, data)
      
      case 'schedule_reminder':
        return await handleScheduleReminder(supabase, data, userId)
      
      case 'track':
        return await handleTrackNotification(supabase, data)
      
      case 'snooze':
        return await handleSnoozeReminder(supabase, data)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid notification type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

  } catch (error) {
    console.error('Notification handler error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Handle push subscription registration
async function handleSubscribe(supabase: any, data: any, userId?: string): Promise<Response> {
  const { subscription, preferences } = data

  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }
      userId = user.id
    }

    // Store or update push subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription,
        preferences: preferences,
        is_active: true,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription saved' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Subscribe error:', error)
    throw error
  }
}

// Handle sending push notifications
async function handlePushNotification(supabase: any, data: any): Promise<Response> {
  const { subscription, notification } = data

  try {
    const payload = JSON.stringify(notification)
    
    await webpush.sendNotification(subscription, payload)

    // Log notification sent
    await logNotification(supabase, {
      type: 'push',
      recipient: subscription.endpoint,
      title: notification.title,
      status: 'sent',
      metadata: notification.data
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Push notification error:', error)
    
    // Log failed notification
    await logNotification(supabase, {
      type: 'push',
      recipient: data.subscription?.endpoint || 'unknown',
      title: data.notification?.title || 'Unknown',
      status: 'failed',
      error: error.message
    })

    throw error
  }
}

// Handle email notifications using existing SMTP setup
async function handleEmailNotification(supabase: any, data: any): Promise<Response> {
  const { to, subject, template, templateData, scheduledTime } = data

  try {
    // Get email template
    const emailContent = await generateEmailFromTemplate(template, templateData)
    
    // Send email using SMTP (assuming you have SMTP configured)
    const emailResponse = await sendEmail({
      to,
      subject,
      html: emailContent,
      scheduledTime
    })

    // Log notification
    await logNotification(supabase, {
      type: 'email',
      recipient: to,
      title: subject,
      status: 'sent',
      metadata: { template, scheduledTime }
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Email notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Email notification error:', error)
    throw error
  }
}

// Handle reminder scheduling
async function handleScheduleReminder(supabase: any, data: any, userId?: string): Promise<Response> {
  try {
    if (!userId) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('User not authenticated')
      userId = user.id
    }

    const reminder = {
      ...data,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: savedReminder, error } = await supabase
      .from('study_reminders')
      .insert(reminder)
      .select()
      .single()

    if (error) throw error

    // Schedule the reminder (you might want to use a job queue in production)
    await scheduleReminderExecution(savedReminder)

    return new Response(
      JSON.stringify({ success: true, reminder: savedReminder }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Schedule reminder error:', error)
    throw error
  }
}

// Handle notification tracking
async function handleTrackNotification(supabase: any, data: any): Promise<Response> {
  try {
    const { error } = await supabase
      .from('notification_events')
      .insert({
        notification_id: data.notificationId,
        action: data.action,
        type: data.type,
        timestamp: new Date(data.timestamp).toISOString(),
        metadata: data.metadata
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Track notification error:', error)
    throw error
  }
}

// Handle snoozing reminders
async function handleSnoozeReminder(supabase: any, data: any): Promise<Response> {
  try {
    const { reminderId, snoozeMinutes } = data
    const newTime = new Date()
    newTime.setMinutes(newTime.getMinutes() + snoozeMinutes)

    const { error } = await supabase
      .from('study_reminders')
      .update({
        scheduled_time: newTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, newTime: newTime.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Snooze reminder error:', error)
    throw error
  }
}

// Generate email content from template
async function generateEmailFromTemplate(template: string, data: any): Promise<string> {
  const templates = {
    study_reminder: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Study Reminder - AthroAI</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #1a2e1a, #2f5a2f); padding: 30px; text-align: center; }
          .logo { color: #e4c97e; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .tagline { color: rgba(228, 201, 126, 0.9); font-size: 16px; }
          .content { padding: 40px 30px; }
          .title { color: #1a2e1a; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
          .cta-button { display: inline-block; background-color: #4fc38a; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .subjects { background: #f8fdf8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4fc38a; }
          .footer { background: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🧠 AthroAI</div>
            <div class="tagline">Your AI-Powered Learning Companion</div>
          </div>
          <div class="content">
            <h1 class="title">📚 ${data.title}</h1>
            <p class="message">${data.message}</p>
            ${data.subjects ? `
              <div class="subjects">
                <strong>📖 Focus Areas:</strong><br>
                ${data.subjects.map((s: string) => `• ${s}`).join('<br>')}
              </div>
            ` : ''}
            <a href="${Deno.env.get('APP_URL')}/workspace${data.athroId ? `?athroId=${data.athroId}` : ''}" class="cta-button">
              🚀 Start Study Session
            </a>
            <p class="message">
              <small>💡 <strong>Pro Tip:</strong> Consistent daily study sessions lead to better retention and faster progress!</small>
            </p>
          </div>
          <div class="footer">
            <p>© 2024 AthroAI. Helping students achieve their potential through personalized AI learning.</p>
            <p><a href="${Deno.env.get('APP_URL')}/dashboard?tab=settings&section=notifications">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    progress_update: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Progress - AthroAI</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #4fc38a, #e4c97e); padding: 30px; text-align: center; color: white; }
          .content { padding: 40px 30px; }
          .stats { display: flex; justify-content: space-around; margin: 30px 0; }
          .stat { text-align: center; padding: 20px; background: #f8fdf8; border-radius: 8px; flex: 1; margin: 0 10px; }
          .stat-number { font-size: 32px; font-weight: bold; color: #1a2e1a; }
          .stat-label { color: #4a5568; font-size: 14px; }
          .achievement { background: #fffef0; padding: 20px; border-radius: 8px; border-left: 4px solid #e4c97e; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Your Weekly Progress</h1>
            <p>${data.weekStart} - ${data.weekEnd}</p>
          </div>
          <div class="content">
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${data.studyTime}</div>
                <div class="stat-label">Minutes Studied</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.sessionsCompleted}</div>
                <div class="stat-label">Sessions Completed</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.subjectsStudied.length}</div>
                <div class="stat-label">Subjects Covered</div>
              </div>
            </div>
            
            ${data.achievements?.length > 0 ? `
              <div class="achievement">
                <strong>🏆 This Week's Achievements:</strong><br>
                ${data.achievements.map((a: string) => `• ${a}`).join('<br>')}
              </div>
            ` : ''}
            
            <p><strong>🎯 Top Subject:</strong> ${data.topSubject}</p>
            <p><strong>🔥 Current Streak:</strong> ${data.streak} days</p>
            
            <a href="${Deno.env.get('APP_URL')}/dashboard?tab=progress" 
               style="display: inline-block; background-color: #4fc38a; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; margin: 20px 0;">
              📈 View Detailed Progress
            </a>
          </div>
        </div>
      </body>
      </html>
    `,

    exam_alert: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Exam Alert - AthroAI</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #e74c3c, #ff7675); padding: 30px; text-align: center; color: white; }
          .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .content { padding: 40px 30px; }
          .cta-button { display: inline-block; background-color: #e74c3c; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 ${data.subject} Exam Alert!</h1>
            <p>Exam in ${data.daysUntil} days</p>
          </div>
          <div class="content">
            <div class="urgent">
              <strong>⚡ Exam Date:</strong> ${data.examDate}<br>
              <strong>⏰ Time Remaining:</strong> ${data.timeRemaining}
            </div>
            
            <h3>📋 Suggested Actions:</h3>
            <ul>
              <li>📚 Review key concepts and formulas</li>
              <li>📝 Take practice tests</li>
              <li>🧠 Create summary notes</li>
              <li>💡 Focus on weak areas</li>
              <li>🛌 Ensure good sleep schedule</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('APP_URL')}/workspace?subject=${encodeURIComponent(data.subject)}&mode=exam-prep" class="cta-button">
                📚 Start Exam Prep
              </a>
              <a href="${Deno.env.get('APP_URL')}/workspace?subject=${encodeURIComponent(data.subject)}&mode=quiz" class="cta-button">
                📝 Practice Test
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  return templates[template as keyof typeof templates] || templates.study_reminder
}

// Send email using existing SMTP setup
async function sendEmail(emailData: any): Promise<any> {
  // This would integrate with your existing SMTP service
  // For now, we'll use a placeholder that calls your SMTP API
  const response = await fetch(`${Deno.env.get('APP_URL')}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailData)
  })
  
  return response.json()
}

// Log notification for analytics
async function logNotification(supabase: any, logData: any): Promise<void> {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        ...logData,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log notification:', error)
    // Don't throw - logging failures shouldn't break the main functionality
  }
}

// Schedule reminder execution (simplified - in production use a job queue)
async function scheduleReminderExecution(reminder: any): Promise<void> {
  // In a real implementation, you'd use a job queue like Bull or a cron service
  // For now, we'll just log that the reminder was scheduled
  console.log('Reminder scheduled:', reminder.id, 'for', reminder.scheduled_time)
} 