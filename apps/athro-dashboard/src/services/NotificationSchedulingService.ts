import { supabase } from './supabaseClient';

export interface NotificationPreferences {
  // Delivery Methods
  push_enabled: boolean;
  email_enabled: boolean;
  inapp_enabled: boolean;
  
  // Calendar Reminders
  calendar_reminders_enabled: boolean;
  calendar_reminder_minutes: 5 | 10 | 15;
  
  // Hints & Tips
  hints_tips_enabled: boolean;
  athro_unused_days: number;
  study_tools_unused_days: number;
  resources_upload_nudge_days: number;
  
  // Low Token Warning
  low_token_warning_enabled: boolean;
  low_token_threshold_percentage: number;
  
  // Night Silencing
  night_silence_enabled: boolean;
  night_silence_start: string;
  night_silence_end: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: 'study' | 'exam' | 'assignment' | 'revision' | 'break';
  subject?: string;
  notification_scheduled: boolean;
  notification_sent: boolean;
}

export interface NotificationQueueItem {
  id?: string;
  user_id: string;
  notification_type: 'calendar_reminder' | 'athro_tip' | 'study_tool_reminder' | 'resource_upload_nudge' | 'low_token_warning' | 'achievement' | 'system';
  deliver_via_push: boolean;
  deliver_via_email: boolean;
  deliver_via_inapp: boolean;
  title: string;
  message: string;
  action_url?: string;
  icon_type: 'info' | 'warning' | 'success' | 'reminder' | 'tip';
  scheduled_for: string;
  related_event_id?: string;
  athro_id?: string;
  subject?: string;
  metadata?: Record<string, any>;
}

export interface ActivityTrackingData {
  user_id: string;
  activity_type: 'athro_usage' | 'study_tool_usage' | 'resource_upload' | 'login' | 'study_session';
  athro_id?: string;
  tool_type?: string;
  subject?: string;
  metadata?: Record<string, any>;
}

export class NotificationSchedulingService {
  private static instance: NotificationSchedulingService;

  private constructor() {
    this.initializeScheduler();
  }

  public static getInstance(): NotificationSchedulingService {
    if (!NotificationSchedulingService.instance) {
      NotificationSchedulingService.instance = new NotificationSchedulingService();
    }
    return NotificationSchedulingService.instance;
  }

  private async initializeScheduler(): Promise<void> {
    console.log('🔔 Initializing Notification Scheduler...');
    
    // Start the notification processing loop
    this.startNotificationProcessor();
    
    // Schedule daily hints & tips check
    this.scheduleDailyHintsCheck();
  }

  // ===============================
  // CALENDAR REMINDER LOGIC
  // ===============================

  public async scheduleCalendarReminder(event: CalendarEvent): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(event.user_id);
      
      if (!preferences.calendar_reminders_enabled) {
        console.log('📅 Calendar reminders disabled for user');
        return;
      }

      // Calculate reminder time
      const eventStartTime = new Date(event.start_time);
      const reminderTime = new Date(eventStartTime.getTime() - (preferences.calendar_reminder_minutes * 60 * 1000));
      
      // Apply night silencing
      const finalReminderTime = await this.calculateDeliveryTime(event.user_id, reminderTime);

      // Create notification
      const notification: NotificationQueueItem = {
        user_id: event.user_id,
        notification_type: 'calendar_reminder',
        deliver_via_push: preferences.push_enabled,
        deliver_via_email: preferences.email_enabled,
        deliver_via_inapp: preferences.inapp_enabled,
        title: `📅 Upcoming: ${event.title}`,
        message: `Your ${event.event_type} session "${event.title}" starts in ${preferences.calendar_reminder_minutes} minutes${event.subject ? ` (${event.subject})` : ''}.`,
        action_url: '/calendar',
        icon_type: 'reminder',
        scheduled_for: finalReminderTime.toISOString(),
        related_event_id: event.id,
        subject: event.subject,
        metadata: {
          event_type: event.event_type,
          original_reminder_time: reminderTime.toISOString(),
          minutes_before: preferences.calendar_reminder_minutes
        }
      };

      await this.addToNotificationQueue(notification);

      // Mark event as having notification scheduled
      await supabase
        .from('calendar_events')
        .update({ notification_scheduled: true })
        .eq('id', event.id);

      console.log(`📅 Calendar reminder scheduled for ${event.title} at ${finalReminderTime.toISOString()}`);
    } catch (error) {
      console.error('❌ Failed to schedule calendar reminder:', error);
    }
  }

  public async rescheduleCalendarReminder(eventId: string, newStartTime: Date): Promise<void> {
    try {
      // Cancel existing notification
      await supabase
        .from('notifications_queue')
        .update({ delivery_status: 'cancelled' })
        .eq('related_event_id', eventId)
        .eq('notification_type', 'calendar_reminder');

      // Get updated event
      const { data: event } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (event) {
        event.start_time = newStartTime.toISOString();
        await this.scheduleCalendarReminder(event);
      }
    } catch (error) {
      console.error('❌ Failed to reschedule calendar reminder:', error);
    }
  }

  // ===============================
  // HINTS & TIPS LOGIC
  // ===============================

  private async scheduleDailyHintsCheck(): Promise<void> {
    // Schedule to run daily at 9 AM
    const checkHints = async () => {
      console.log('🧠 Running daily hints & tips check...');
      await this.checkAthroInactivity();
      await this.checkStudyToolInactivity();
      await this.checkResourceUploadNudge();
    };

    // Run immediately for testing
    checkHints();

    // Schedule for daily execution (in a real app, use a proper cron job)
    setInterval(checkHints, 24 * 60 * 60 * 1000); // 24 hours
  }

  private async checkAthroInactivity(): Promise<void> {
    try {
      // Get all users with hints enabled
      const { data: users } = await supabase
        .from('notification_preferences')
        .select('user_id, athro_unused_days, hints_tips_enabled, push_enabled, email_enabled, inapp_enabled')
        .eq('hints_tips_enabled', true);

      if (!users) return;

      for (const user of users) {
        // Check each athro for inactivity
        const athroIds = ['athro-arts', 'athro-astrology', 'athro-business', 'athro-chemistry', 'athro-computer-science'];
        
        for (const athroId of athroIds) {
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
            : 999; // Never used

          if (daysSinceLastUse >= user.athro_unused_days) {
            await this.scheduleAthroTipNotification(user.user_id, athroId, daysSinceLastUse, {
              push_enabled: user.push_enabled,
              email_enabled: user.email_enabled,
              inapp_enabled: user.inapp_enabled
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to check athro inactivity:', error);
    }
  }

  private async scheduleAthroTipNotification(userId: string, athroId: string, daysSinceLastUse: number, deliveryPrefs: any): Promise<void> {
    const athroNames: Record<string, string> = {
      'athro-arts': 'Arts & Literature',
      'athro-astrology': 'Astrology & Astronomy',
      'athro-business': 'Business Studies',
      'athro-chemistry': 'Chemistry',
      'athro-computer-science': 'Computer Science'
    };

    const athroName = athroNames[athroId] || athroId;
    const deliveryTime = await this.calculateDeliveryTime(userId, new Date());

    const tips = [
      `Ready to explore ${athroName}? Your personalized tutor is waiting to help you master new concepts! 🌟`,
      `${athroName} hasn't been visited in ${daysSinceLastUse} days. Why not dive back in and discover something amazing? 🚀`,
      `Your ${athroName} Athro has some fresh insights for you! Perfect time for a quick learning session. 📚`,
      `Missing ${athroName}? Your AI tutor is ready to help you tackle any challenging topics! 💡`
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    const notification: NotificationQueueItem = {
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
    };

    await this.addToNotificationQueue(notification);
  }

  private async checkStudyToolInactivity(): Promise<void> {
    try {
      const { data: users } = await supabase
        .from('notification_preferences')
        .select('user_id, study_tools_unused_days, hints_tips_enabled, push_enabled, email_enabled, inapp_enabled')
        .eq('hints_tips_enabled', true);

      if (!users) return;

      for (const user of users) {
        const { data: lastActivity } = await supabase
          .from('user_activity_tracking')
          .select('created_at, tool_type')
          .eq('user_id', user.user_id)
          .eq('activity_type', 'study_tool_usage')
          .order('created_at', { ascending: false })
          .limit(1);

        const daysSinceLastUse = lastActivity && lastActivity[0] 
          ? Math.floor((Date.now() - new Date(lastActivity[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastUse >= user.study_tools_unused_days) {
          await this.scheduleStudyToolReminderNotification(user.user_id, daysSinceLastUse, {
            push_enabled: user.push_enabled,
            email_enabled: user.email_enabled,
            inapp_enabled: user.inapp_enabled
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to check study tool inactivity:', error);
    }
  }

  private async scheduleStudyToolReminderNotification(userId: string, daysSinceLastUse: number, deliveryPrefs: any): Promise<void> {
    const deliveryTime = await this.calculateDeliveryTime(userId, new Date());

    const messages = [
      `Ready to boost your learning? Try creating some flashcards or taking a quiz! 📝`,
      `Your study tools are missing you! Time to create some notes or practice with flashcards. 🎯`,
      `${daysSinceLastUse} days without using study tools? Let's get back on track with some active learning! ⚡`,
      `Quick study session? Generate a quiz or review your notes to keep your momentum going! 🚀`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const notification: NotificationQueueItem = {
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
    };

    await this.addToNotificationQueue(notification);
  }

  private async checkResourceUploadNudge(): Promise<void> {
    try {
      const { data: users } = await supabase
        .from('notification_preferences')
        .select('user_id, resources_upload_nudge_days, hints_tips_enabled, push_enabled, email_enabled, inapp_enabled')
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
          await this.scheduleResourceUploadNudge(user.user_id, daysSinceLastUpload, {
            push_enabled: user.push_enabled,
            email_enabled: user.email_enabled,
            inapp_enabled: user.inapp_enabled
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to check resource upload activity:', error);
    }
  }

  private async scheduleResourceUploadNudge(userId: string, daysSinceLastUpload: number, deliveryPrefs: any): Promise<void> {
    const deliveryTime = await this.calculateDeliveryTime(userId, new Date());

    const messages = [
      `📂 Got new study materials? Upload them to unlock personalized learning with your Athros! `,
      `Time to upload some resources! The more you share, the smarter your AI tutors become. 🧠`,
      `${daysSinceLastUpload} days since your last upload. Ready to add some fresh content to your library? 📚`,
      `Upload notes, textbooks, or practice papers to get tailored study sessions from your Athros! 🎯`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const notification: NotificationQueueItem = {
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
    };

    await this.addToNotificationQueue(notification);
  }

  // ===============================
  // LOW TOKEN WARNING LOGIC
  // ===============================

  public async checkTokenUsageAndWarn(userId: string, tokensUsed: number, tokensRemaining: number, usageType: string): Promise<void> {
    try {
      // Log token usage
      await this.trackTokenUsage(userId, tokensUsed, tokensRemaining, usageType);

      const preferences = await this.getUserPreferences(userId);
      
      if (!preferences.low_token_warning_enabled) {
        return;
      }

      // Calculate total tokens (estimate based on typical plans)
      const totalTokens = tokensRemaining + tokensUsed;
      const usagePercentage = ((totalTokens - tokensRemaining) / totalTokens) * 100;
      const remainingPercentage = (tokensRemaining / totalTokens) * 100;

      if (remainingPercentage <= preferences.low_token_threshold_percentage) {
        await this.scheduleLowTokenWarning(userId, tokensRemaining, remainingPercentage, preferences);
      }
    } catch (error) {
      console.error('❌ Failed to check token usage:', error);
    }
  }

  private async scheduleLowTokenWarning(userId: string, tokensRemaining: number, percentage: number, preferences: NotificationPreferences): Promise<void> {
    // Check if we've already sent a warning recently (don't spam)
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

    const deliveryTime = await this.calculateDeliveryTime(userId, new Date());

    let urgencyLevel = 'low';
    let icon: 'warning' | 'info' = 'warning';
    let title = '⚠️ Low Token Warning';
    
    if (percentage <= 5) {
      urgencyLevel = 'critical';
      title = '🚨 Critical: Tokens Almost Depleted';
    } else if (percentage <= 10) {
      urgencyLevel = 'high';
      title = '⚠️ Token Warning: Running Low';
    }

    const message = `You have ${tokensRemaining} tokens remaining (${Math.round(percentage)}%). Consider upgrading your plan to continue learning without interruption.`;

    const notification: NotificationQueueItem = {
      user_id: userId,
      notification_type: 'low_token_warning',
      deliver_via_push: preferences.push_enabled,
      deliver_via_email: preferences.email_enabled,
      deliver_via_inapp: true, // Always show in-app for token warnings
      title,
      message,
      action_url: '/settings?tab=subscription',
      icon_type: icon,
      scheduled_for: deliveryTime.toISOString(),
      metadata: {
        tokens_remaining: tokensRemaining,
        percentage_remaining: percentage,
        urgency_level: urgencyLevel
      }
    };

    await this.addToNotificationQueue(notification);
  }

  // ===============================
  // ACTIVITY TRACKING
  // ===============================

  public async trackActivity(data: ActivityTrackingData): Promise<void> {
    try {
      await supabase
        .from('user_activity_tracking')
        .insert({
          user_id: data.user_id,
          activity_type: data.activity_type,
          athro_id: data.athro_id,
          tool_type: data.tool_type,
          subject: data.subject,
          metadata: data.metadata || {}
        });

      console.log(`📊 Activity tracked: ${data.activity_type} for user ${data.user_id}`);
    } catch (error) {
      console.error('❌ Failed to track activity:', error);
    }
  }

  private async trackTokenUsage(userId: string, tokensUsed: number, tokensRemaining: number, usageType: string): Promise<void> {
    try {
      await supabase
        .from('token_usage_log')
        .insert({
          user_id: userId,
          tokens_used: tokensUsed,
          tokens_remaining: tokensRemaining,
          usage_type: usageType
        });
    } catch (error) {
      console.error('❌ Failed to track token usage:', error);
    }
  }

  // ===============================
  // NOTIFICATION DELIVERY
  // ===============================

  private async startNotificationProcessor(): Promise<void> {
    const processNotifications = async () => {
      try {
        // Get pending notifications that are ready to be sent
        const { data: pendingNotifications } = await supabase
          .from('notifications_queue')
          .select('*')
          .eq('delivery_status', 'pending')
          .lte('scheduled_for', new Date().toISOString())
          .order('scheduled_for', { ascending: true })
          .limit(50);

        if (pendingNotifications && pendingNotifications.length > 0) {
          console.log(`📨 Processing ${pendingNotifications.length} pending notifications`);
          
          for (const notification of pendingNotifications) {
            await this.deliverNotification(notification);
          }
        }
      } catch (error) {
        console.error('❌ Failed to process notifications:', error);
      }
    };

    // Process notifications every minute
    setInterval(processNotifications, 60 * 1000);
    
    // Process immediately on startup
    processNotifications();
  }

  private async deliverNotification(notification: any): Promise<void> {
    try {
      const deliveryPromises: Promise<void>[] = [];

      // Deliver via push notification
      if (notification.deliver_via_push) {
        deliveryPromises.push(this.sendPushNotification(notification));
      }

      // Deliver via email
      if (notification.deliver_via_email) {
        deliveryPromises.push(this.sendEmailNotification(notification));
      }

      // Deliver via in-app
      if (notification.deliver_via_inapp) {
        deliveryPromises.push(this.sendInAppNotification(notification));
      }

      // Wait for all deliveries
      await Promise.allSettled(deliveryPromises);

      // Mark as delivered
      await supabase
        .from('notifications_queue')
        .update({
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      console.log(`✅ Notification delivered: ${notification.title}`);
    } catch (error) {
      console.error('❌ Failed to deliver notification:', error);
      
      // Mark as failed
      await supabase
        .from('notifications_queue')
        .update({ delivery_status: 'failed' })
        .eq('id', notification.id);
    }
  }

  private async sendPushNotification(notification: any): Promise<void> {
    try {
      // Get user's push subscription
      const { data: subscription } = await supabase
        .from('notification_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', notification.user_id)
        .eq('is_active', true)
        .limit(1);

      if (!subscription || subscription.length === 0) {
        console.log('📱 No push subscription found for user');
        return;
      }

      // In a real implementation, you would send this to your push service
      // For now, we'll use the browser's Notification API if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/png/athro-astrology.png',
          badge: '/png/athro-astrology.png',
          tag: notification.notification_type,
          data: {
            action_url: notification.action_url,
            notification_id: notification.id
          }
        });
      }

      await this.logDelivery(notification.id, notification.user_id, 'push', 'sent');
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      await this.logDelivery(notification.id, notification.user_id, 'push', 'failed', error.message);
    }
  }

  private async sendEmailNotification(notification: any): Promise<void> {
    try {
      // In a real implementation, integrate with email service (Resend, SendGrid, etc.)
      console.log(`📧 Would send email: ${notification.title} to user ${notification.user_id}`);
      
      await this.logDelivery(notification.id, notification.user_id, 'email', 'sent');
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      await this.logDelivery(notification.id, notification.user_id, 'email', 'failed', error.message);
    }
  }

  private async sendInAppNotification(notification: any): Promise<void> {
    try {
      // In-app notifications are handled by the UI components
      // We just log that they're available
      console.log(`📱 In-app notification ready: ${notification.title}`);
      
      await this.logDelivery(notification.id, notification.user_id, 'inapp', 'sent');
    } catch (error) {
      console.error('❌ Failed to send in-app notification:', error);
      await this.logDelivery(notification.id, notification.user_id, 'inapp', 'failed', error.message);
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    return data || {
      push_enabled: true,
      email_enabled: true,
      inapp_enabled: true,
      calendar_reminders_enabled: true,
      calendar_reminder_minutes: 15,
      hints_tips_enabled: true,
      athro_unused_days: 30,
      study_tools_unused_days: 14,
      resources_upload_nudge_days: 7,
      low_token_warning_enabled: true,
      low_token_threshold_percentage: 10,
      night_silence_enabled: true,
      night_silence_start: '22:00',
      night_silence_end: '08:00'
    };
  }

  private async calculateDeliveryTime(userId: string, scheduledTime: Date): Promise<Date> {
    const preferences = await this.getUserPreferences(userId);
    
    if (!preferences.night_silence_enabled) {
      return scheduledTime;
    }

    const currentTime = scheduledTime.getHours() * 60 + scheduledTime.getMinutes();
    const silenceStart = this.timeStringToMinutes(preferences.night_silence_start);
    const silenceEnd = this.timeStringToMinutes(preferences.night_silence_end);

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

  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async addToNotificationQueue(notification: NotificationQueueItem): Promise<void> {
    await supabase
      .from('notifications_queue')
      .insert(notification);
  }

  private async logDelivery(notificationId: string, userId: string, method: string, status: string, error?: string): Promise<void> {
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

  // ===============================
  // PUBLIC API METHODS
  // ===============================

  public async getInAppNotifications(userId: string, limit: number = 10): Promise<any[]> {
    const { data } = await supabase
      .from('notifications_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('deliver_via_inapp', true)
      .eq('delivery_status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  public async markNotificationAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notification_delivery_log')
      .insert({
        notification_queue_id: notificationId,
        user_id: '', // Will be filled by RLS
        delivery_method: 'inapp',
        delivery_status: 'opened'
      });
  }
}

export default NotificationSchedulingService; 