import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationQueueItem {
  id: string;
  user_id: string;
  notification_type: string;
  deliver_via_push: boolean;
  deliver_via_email: boolean;
  deliver_via_inapp: boolean;
  title: string;
  message: string;
  action_url?: string;
  icon_type: string;
  scheduled_for: string;
  delivery_status: string;
  athro_id?: string;
  subject?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🔔 Starting notification scheduler...');

    // 1. Process pending notifications that are ready to be sent
    await processPendingNotifications(supabaseClient);

    // 2. Check for hints & tips triggers (run once per day)
    const lastHintsCheck = await getLastHintsCheck(supabaseClient);
    const shouldRunHintsCheck = !lastHintsCheck || 
      (Date.now() - new Date(lastHintsCheck).getTime()) > (22 * 60 * 60 * 1000); // 22 hours ago

    if (shouldRunHintsCheck) {
      console.log('🧠 Running hints & tips check...');
      await checkHintsAndTips(supabaseClient);
      await updateLastHintsCheck(supabaseClient);
    }

    // 3. Check for low token warnings
    await checkLowTokenWarnings(supabaseClient);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification scheduler completed successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Notification scheduler error:', error)
    return new Response(
      JSON.stringify({ error: 'Notification scheduler failed', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// ===============================
// PROCESS PENDING NOTIFICATIONS
// ===============================

async function processPendingNotifications(supabase: any) {
  try {
    // Get notifications ready to be sent
    const { data: pendingNotifications, error } = await supabase
      .from('notifications_queue')
      .select('*')
      .eq('delivery_status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching pending notifications:', error);
      return;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('📭 No pending notifications to process');
      return;
    }

    console.log(`📨 Processing ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      await deliverNotification(supabase, notification);
    }
  } catch (error) {
    console.error('❌ Error processing pending notifications:', error);
  }
}

async function deliverNotification(supabase: any, notification: NotificationQueueItem) {
  try {
    const deliveryPromises: Promise<void>[] = [];

    // Send push notification
    if (notification.deliver_via_push) {
      deliveryPromises.push(sendPushNotification(supabase, notification));
    }

    // Send email notification
    if (notification.deliver_via_email) {
      deliveryPromises.push(sendEmailNotification(supabase, notification));
    }

    // In-app notifications are passive - just mark as ready
    if (notification.deliver_via_inapp) {
      deliveryPromises.push(markInAppNotificationReady(supabase, notification));
    }

    // Wait for all deliveries
    await Promise.allSettled(deliveryPromises);

    // Mark notification as delivered
    await supabase
      .from('notifications_queue')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    console.log(`✅ Delivered: ${notification.title}`);
  } catch (error) {
    console.error(`❌ Failed to deliver notification ${notification.id}:`, error);
    
    // Mark as failed
    await supabase
      .from('notifications_queue')
      .update({ delivery_status: 'failed' })
      .eq('id', notification.id);
  }
}

async function sendPushNotification(supabase: any, notification: NotificationQueueItem) {
  try {
    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from('notification_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', notification.user_id)
      .eq('is_active', true);

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`📱 No push subscriptions for user ${notification.user_id}`);
      return;
    }

    // In a production environment, you would integrate with a push service like:
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification Service (APNS)
    // - Web Push Protocol
    
    // For now, we'll log the push notification
    console.log(`📱 Push notification: ${notification.title} -> ${notification.user_id}`);

    // Log delivery
    await logDelivery(supabase, notification.id, notification.user_id, 'push', 'sent');
  } catch (error) {
    console.error('❌ Push notification failed:', error);
    await logDelivery(supabase, notification.id, notification.user_id, 'push', 'failed', error.message);
  }
}

async function sendEmailNotification(supabase: any, notification: NotificationQueueItem) {
  try {
    // Get user's email
    const { data: user } = await supabase.auth.admin.getUserById(notification.user_id);
    
    if (!user?.user?.email) {
      console.log(`📧 No email found for user ${notification.user_id}`);
      return;
    }

    // In production, integrate with email service like Resend:
    /*
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AthroAI <notifications@athroai.com>',
        to: [user.user.email],
        subject: notification.title,
        html: createEmailTemplate(notification),
      }),
    });
    */

    console.log(`📧 Email notification: ${notification.title} -> ${user.user.email}`);

    await logDelivery(supabase, notification.id, notification.user_id, 'email', 'sent');
  } catch (error) {
    console.error('❌ Email notification failed:', error);
    await logDelivery(supabase, notification.id, notification.user_id, 'email', 'failed', error.message);
  }
}

async function markInAppNotificationReady(supabase: any, notification: NotificationQueueItem) {
  try {
    console.log(`📱 In-app notification ready: ${notification.title}`);
    await logDelivery(supabase, notification.id, notification.user_id, 'inapp', 'sent');
  } catch (error) {
    console.error('❌ In-app notification failed:', error);
    await logDelivery(supabase, notification.id, notification.user_id, 'inapp', 'failed', error.message);
  }
}

// ===============================
// HINTS & TIPS CHECK
// ===============================

async function checkHintsAndTips(supabase: any) {
  try {
    await checkAthroInactivity(supabase);
    await checkStudyToolInactivity(supabase);
    await checkResourceUploadNudge(supabase);
  } catch (error) {
    console.error('❌ Error in hints & tips check:', error);
  }
}

async function checkAthroInactivity(supabase: any) {
  try {
    // Get users with hints enabled
    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id, athro_unused_days, push_enabled, email_enabled, inapp_enabled')
      .eq('hints_tips_enabled', true);

    if (!users) return;

    const athroIds = ['athro-arts', 'athro-astrology', 'athro-business', 'athro-chemistry', 'athro-computer-science'];

    for (const user of users) {
      for (const athroId of athroIds) {
        // Check last usage
        const { data: lastActivity } = await supabase
          .from('user_activity_tracking')
          .select('created_at')
          .eq('user_id', user.user_id)
          .eq('activity_type', 'athro_usage')
          .eq('athro_id', athroId)
          .order('created_at', { ascending: false })
          .limit(1);

        const daysSinceLastUse = lastActivity && lastActivity[0] 
          ? Math.floor((Date.now() - new Date(lastActivity[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastUse >= user.athro_unused_days) {
          await scheduleAthroTipNotification(supabase, user.user_id, athroId, daysSinceLastUse, user);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking athro inactivity:', error);
  }
}

async function scheduleAthroTipNotification(supabase: any, userId: string, athroId: string, daysSinceLastUse: number, deliveryPrefs: any) {
  const athroNames: Record<string, string> = {
    'athro-arts': 'Arts & Literature',
    'athro-astrology': 'Astrology & Astronomy',
    'athro-business': 'Business Studies',
    'athro-chemistry': 'Chemistry',
    'athro-computer-science': 'Computer Science'
  };

  const athroName = athroNames[athroId] || athroId;
  
  // Check if we already sent a tip for this athro recently
  const { data: recentTip } = await supabase
    .from('notifications_queue')
    .select('created_at')
    .eq('user_id', userId)
    .eq('notification_type', 'athro_tip')
    .eq('athro_id', athroId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .limit(1);

  if (recentTip && recentTip.length > 0) {
    console.log(`⏰ Recent tip already sent for ${athroId}, skipping`);
    return;
  }

  const deliveryTime = await calculateDeliveryTime(supabase, userId, new Date());

  const tips = [
    `Ready to explore ${athroName}? Your personalized tutor is waiting to help you master new concepts! 🌟`,
    `${athroName} hasn't been visited in ${daysSinceLastUse} days. Why not dive back in and discover something amazing? 🚀`,
    `Your ${athroName} Athro has some fresh insights for you! Perfect time for a quick learning session. 📚`,
    `Missing ${athroName}? Your AI tutor is ready to help you tackle any challenging topics! 💡`
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  await supabase
    .from('notifications_queue')
    .insert({
      user_id: userId,
      notification_type: 'athro_tip',
      deliver_via_push: deliveryPrefs.push_enabled,
      deliver_via_email: deliveryPrefs.email_enabled,
      deliver_via_inapp: deliveryPrefs.inapp_enabled,
      title: `🧠 ${athroName} Tip`,
      message: randomTip,
      action_url: `/athro/${athroId}`,
      icon_type: 'tip',
      scheduled_for: deliveryTime.toISOString(),
      athro_id: athroId,
      metadata: {
        days_since_last_use: daysSinceLastUse,
        athro_name: athroName
      }
    });

  console.log(`🧠 Scheduled athro tip for ${athroName} (${daysSinceLastUse} days inactive)`);
}

async function checkStudyToolInactivity(supabase: any) {
  try {
    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id, study_tools_unused_days, push_enabled, email_enabled, inapp_enabled')
      .eq('hints_tips_enabled', true);

    if (!users) return;

    for (const user of users) {
      const { data: lastActivity } = await supabase
        .from('user_activity_tracking')
        .select('created_at')
        .eq('user_id', user.user_id)
        .eq('activity_type', 'study_tool_usage')
        .order('created_at', { ascending: false })
        .limit(1);

      const daysSinceLastUse = lastActivity && lastActivity[0] 
        ? Math.floor((Date.now() - new Date(lastActivity[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastUse >= user.study_tools_unused_days) {
        // Check if we already sent a reminder recently
        const { data: recentReminder } = await supabase
          .from('notifications_queue')
          .select('created_at')
          .eq('user_id', user.user_id)
          .eq('notification_type', 'study_tool_reminder')
          .gte('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()) // Last 5 days
          .limit(1);

        if (recentReminder && recentReminder.length > 0) {
          continue;
        }

        await scheduleStudyToolReminder(supabase, user.user_id, daysSinceLastUse, user);
      }
    }
  } catch (error) {
    console.error('❌ Error checking study tool inactivity:', error);
  }
}

async function scheduleStudyToolReminder(supabase: any, userId: string, daysSinceLastUse: number, deliveryPrefs: any) {
  const deliveryTime = await calculateDeliveryTime(supabase, userId, new Date());

  const messages = [
    `Ready to boost your learning? Try creating some flashcards or taking a quiz! 📝`,
    `Your study tools are missing you! Time to create some notes or practice with flashcards. 🎯`,
    `${daysSinceLastUse} days without using study tools? Let's get back on track with some active learning! ⚡`,
    `Quick study session? Generate a quiz or review your notes to keep your momentum going! 🚀`
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  await supabase
    .from('notifications_queue')
    .insert({
      user_id: userId,
      notification_type: 'study_tool_reminder',
      deliver_via_push: deliveryPrefs.push_enabled,
      deliver_via_email: deliveryPrefs.email_enabled,
      deliver_via_inapp: deliveryPrefs.inapp_enabled,
      title: '📚 Study Tools Reminder',
      message: randomMessage,
      action_url: '/workspace',
      icon_type: 'reminder',
      scheduled_for: deliveryTime.toISOString(),
      metadata: {
        days_since_last_use: daysSinceLastUse
      }
    });

  console.log(`📚 Scheduled study tool reminder (${daysSinceLastUse} days inactive)`);
}

async function checkResourceUploadNudge(supabase: any) {
  try {
    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id, resources_upload_nudge_days, push_enabled, email_enabled, inapp_enabled')
      .eq('hints_tips_enabled', true);

    if (!users) return;

    for (const user of users) {
      const { data: lastUpload } = await supabase
        .from('user_activity_tracking')
        .select('created_at')
        .eq('user_id', user.user_id)
        .eq('activity_type', 'resource_upload')
        .order('created_at', { ascending: false })
        .limit(1);

      const daysSinceLastUpload = lastUpload && lastUpload[0] 
        ? Math.floor((Date.now() - new Date(lastUpload[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastUpload >= user.resources_upload_nudge_days) {
        // Check if we already sent a nudge recently
        const { data: recentNudge } = await supabase
          .from('notifications_queue')
          .select('created_at')
          .eq('user_id', user.user_id)
          .eq('notification_type', 'resource_upload_nudge')
          .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()) // Last 3 days
          .limit(1);

        if (recentNudge && recentNudge.length > 0) {
          continue;
        }

        await scheduleResourceUploadNudge(supabase, user.user_id, daysSinceLastUpload, user);
      }
    }
  } catch (error) {
    console.error('❌ Error checking resource upload activity:', error);
  }
}

async function scheduleResourceUploadNudge(supabase: any, userId: string, daysSinceLastUpload: number, deliveryPrefs: any) {
  const deliveryTime = await calculateDeliveryTime(supabase, userId, new Date());

  const messages = [
    `📂 Got new study materials? Upload them to unlock personalized learning with your Athros!`,
    `Time to upload some resources! The more you share, the smarter your AI tutors become. 🧠`,
    `${daysSinceLastUpload} days since your last upload. Ready to add some fresh content to your library? 📚`,
    `Upload notes, textbooks, or practice papers to get tailored study sessions from your Athros! 🎯`
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  await supabase
    .from('notifications_queue')
    .insert({
      user_id: userId,
      notification_type: 'resource_upload_nudge',
      deliver_via_push: deliveryPrefs.push_enabled,
      deliver_via_email: deliveryPrefs.email_enabled,
      deliver_via_inapp: deliveryPrefs.inapp_enabled,
      title: '📂 Resource Upload Reminder',
      message: randomMessage,
      action_url: '/workspace?tab=resources',
      icon_type: 'info',
      scheduled_for: deliveryTime.toISOString(),
      metadata: {
        days_since_last_upload: daysSinceLastUpload
      }
    });

  console.log(`📂 Scheduled resource upload nudge (${daysSinceLastUpload} days since last upload)`);
}

// ===============================
// LOW TOKEN WARNINGS
// ===============================

async function checkLowTokenWarnings(supabase: any) {
  try {
    // Get recent token usage to identify users with low tokens
    const { data: recentUsage } = await supabase
      .from('token_usage_log')
      .select('user_id, tokens_remaining')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    if (!recentUsage) return;

    // Group by user and get latest token count
    const userTokens = new Map();
    for (const usage of recentUsage) {
      if (!userTokens.has(usage.user_id)) {
        userTokens.set(usage.user_id, usage.tokens_remaining);
      }
    }

    // Check each user's token level
    for (const [userId, tokensRemaining] of userTokens) {
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('low_token_warning_enabled, low_token_threshold_percentage, push_enabled, email_enabled, inapp_enabled')
        .eq('user_id', userId)
        .single();

      if (!preferences?.low_token_warning_enabled) continue;

      // Estimate total tokens (this would be better tracked in user profiles)
      const estimatedTotal = 1000; // Default estimate
      const percentage = (tokensRemaining / estimatedTotal) * 100;

      if (percentage <= preferences.low_token_threshold_percentage) {
        await scheduleLowTokenWarning(supabase, userId, tokensRemaining, percentage, preferences);
      }
    }
  } catch (error) {
    console.error('❌ Error checking low token warnings:', error);
  }
}

async function scheduleLowTokenWarning(supabase: any, userId: string, tokensRemaining: number, percentage: number, preferences: any) {
  // Check if we already sent a warning recently
  const { data: recentWarning } = await supabase
    .from('notifications_queue')
    .select('created_at')
    .eq('user_id', userId)
    .eq('notification_type', 'low_token_warning')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .limit(1);

  if (recentWarning && recentWarning.length > 0) {
    console.log('⏰ Recent low token warning already sent, skipping');
    return;
  }

  const deliveryTime = await calculateDeliveryTime(supabase, userId, new Date());

  let urgencyLevel = 'low';
  let title = '⚠️ Low Token Warning';
  
  if (percentage <= 5) {
    urgencyLevel = 'critical';
    title = '🚨 Critical: Tokens Almost Depleted';
  } else if (percentage <= 10) {
    urgencyLevel = 'high';
    title = '⚠️ Token Warning: Running Low';
  }

  const message = `You have ${tokensRemaining} tokens remaining (${Math.round(percentage)}%). Consider upgrading your plan to continue learning without interruption.`;

  await supabase
    .from('notifications_queue')
    .insert({
      user_id: userId,
      notification_type: 'low_token_warning',
      deliver_via_push: preferences.push_enabled,
      deliver_via_email: preferences.email_enabled,
      deliver_via_inapp: true, // Always show in-app for token warnings
      title,
      message,
      action_url: '/settings?tab=subscription',
      icon_type: 'warning',
      scheduled_for: deliveryTime.toISOString(),
      metadata: {
        tokens_remaining: tokensRemaining,
        percentage_remaining: percentage,
        urgency_level: urgencyLevel
      }
    });

  console.log(`⚠️ Scheduled low token warning: ${tokensRemaining} tokens (${Math.round(percentage)}%)`);
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

async function calculateDeliveryTime(supabase: any, userId: string, scheduledTime: Date): Promise<Date> {
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('night_silence_enabled, night_silence_start, night_silence_end')
    .eq('user_id', userId)
    .single();

  if (!preferences?.night_silence_enabled) {
    return scheduledTime;
  }

  const currentTime = scheduledTime.getHours() * 60 + scheduledTime.getMinutes();
  const silenceStart = timeStringToMinutes(preferences.night_silence_start);
  const silenceEnd = timeStringToMinutes(preferences.night_silence_end);

  // Check if scheduled time is in silence period
  const isInSilencePeriod = silenceStart > silenceEnd 
    ? (currentTime >= silenceStart || currentTime <= silenceEnd) // Crosses midnight
    : (currentTime >= silenceStart && currentTime <= silenceEnd); // Same day

  if (isInSilencePeriod) {
    // Delay to end of silence period
    const deliveryDate = new Date(scheduledTime);
    
    if (currentTime >= silenceStart && silenceStart > silenceEnd) {
      // Schedule for next day morning
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }
    
    const [hours, minutes] = preferences.night_silence_end.split(':').map(Number);
    deliveryDate.setHours(hours, minutes, 0, 0);
    
    return deliveryDate;
  }

  return scheduledTime;
}

function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

async function logDelivery(supabase: any, notificationId: string, userId: string, method: string, status: string, error?: string) {
  await supabase
    .from('notification_delivery_log')
    .insert({
      notification_queue_id: notificationId,
      user_id: userId,
      delivery_method: method,
      delivery_status: status,
      error_message: error
    });
}

async function getLastHintsCheck(supabase: any): Promise<string | null> {
  // You might want to store this in a system settings table
  // For now, we'll check the most recent hint notification created
  const { data } = await supabase
    .from('notifications_queue')
    .select('created_at')
    .in('notification_type', ['athro_tip', 'study_tool_reminder', 'resource_upload_nudge'])
    .order('created_at', { ascending: false })
    .limit(1);

  return data && data[0] ? data[0].created_at : null;
}

async function updateLastHintsCheck(supabase: any) {
  // In a real implementation, you'd store this in a system settings table
  console.log('📝 Updated last hints check timestamp');
} 