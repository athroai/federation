import { EventBusService } from './EventBusService';

// Notification Types
export interface NotificationPreferences {
  webPush: {
    enabled: boolean;
    studyReminders: boolean;
    progressUpdates: boolean;
    lowTokenWarnings: boolean;
  };
  email: {
    enabled: boolean;
    studyReminders: boolean;
    progressUpdates: boolean;
    lowTokenWarnings: boolean;
  };
  inApp: {
    enabled: boolean;
    studyReminders: boolean;
    progressUpdates: boolean;
    lowTokenWarnings: boolean;
  };
}

export interface StudyReminder {
  id: string;
  userId: string;
  type: 'daily_study' | 'subject_review' | 'exam_prep' | 'break_reminder' | 'streak_motivation';
  title: string;
  message: string;
  scheduledTime: Date;
  recurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  subjects?: string[];
  athroId?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  tag?: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  template: 'study_reminder' | 'progress_update' | 'exam_alert' | 'achievement' | 'daily_digest';
  data: Record<string, any>;
  scheduledTime?: Date;
}

// Notification Service Class
export class NotificationService {
  private static instance: NotificationService;
  public eventBus: EventBusService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string;
  private pushSubscription: PushSubscription | null = null;
  private preferences: NotificationPreferences;
  private studyReminders: Map<string, StudyReminder> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.eventBus = EventBusService.getInstance();
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
    this.preferences = this.loadPreferences();
    this.initializeService();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize the notification service
  private async initializeService(): Promise<void> {
    try {
      // Register service worker for push notifications
      await this.registerServiceWorker();
      
      // Load user preferences
      await this.loadUserPreferences();
      
      // Initialize study reminders
      await this.initializeStudyReminders();
      
      // Subscribe to relevant events
      this.subscribeToEvents();
      
      console.log('🔔 NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error);
    }
  }

  // Register Service Worker for Push Notifications
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('❌ Push notifications not supported in this browser');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw-notifications.js');
      this.swRegistration = registration;
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      console.log('✅ Service Worker registered for notifications');
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  // Request permission and subscribe to push notifications
  public async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('❌ This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        await this.subscribeToPush();
        
        // Update preferences
        this.preferences.webPush.enabled = true;
        this.savePreferences();
        
        // Show welcome notification
        this.showInAppNotification({
          type: 'success',
          title: 'Notifications Enabled! 🔔',
          message: 'You\'ll now receive study reminders and progress updates',
          duration: 5000
        });

        return true;
      } else {
        console.warn('❌ Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting push permission:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  private async subscribeToPush(): Promise<void> {
    if (!this.swRegistration || !this.vapidPublicKey) {
      throw new Error('Service worker not registered or VAPID key missing');
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(this.vapidPublicKey)
      });

      this.pushSubscription = subscription;

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);
      
      console.log('✅ Push subscription successful');
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      throw error;
    }
  }

  // Convert VAPID key to Uint8Array
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Send subscription to backend
  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      // Get auth token from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase credentials not found');
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No auth session found');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/notifications-subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          preferences: this.preferences
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to send subscription to backend: ${response.status} ${errorData}`);
      }

      console.log('✅ Push notification subscription registered successfully');
    } catch (error) {
      console.error('❌ Failed to send subscription to backend:', error);
    }
  }

  // Smart Study Reminder System
  public async scheduleStudyReminder(reminder: Omit<StudyReminder, 'id'>): Promise<string> {
    const id = this.generateId();
    const fullReminder: StudyReminder = {
      ...reminder,
      id
    };

    this.studyReminders.set(id, fullReminder);
    this.saveReminders();

    // Schedule the reminder
    await this.scheduleReminder(fullReminder);

    return id;
  }

  private async scheduleReminder(reminder: StudyReminder): Promise<void> {
    const now = new Date();
    const timeUntilReminder = reminder.scheduledTime.getTime() - now.getTime();

    if (timeUntilReminder <= 0) {
      // Past due - skip or reschedule
      if (reminder.recurring) {
        this.rescheduleRecurringReminder(reminder);
      }
      return;
    }

    const timeoutId = setTimeout(async () => {
      await this.triggerReminder(reminder);
      
      // Handle recurring reminders
      if (reminder.recurring && reminder.recurringPattern) {
        this.rescheduleRecurringReminder(reminder);
      } else {
        this.studyReminders.delete(reminder.id);
        this.saveReminders();
      }
    }, timeUntilReminder);

    this.activeTimers.set(reminder.id, timeoutId);
  }

  private async triggerReminder(reminder: StudyReminder): Promise<void> {
    try {
      // Send push notification
      if (this.preferences.webPush.enabled && this.preferences.webPush.studyReminders) {
        await this.sendPushNotification({
          title: reminder.title,
          body: reminder.message,
          icon: '/icons/study-reminder.png',
          badge: '/icons/badge.png',
          data: {
            type: 'study_reminder',
            reminderId: reminder.id,
            athroId: reminder.athroId,
            subjects: reminder.subjects
          },
          actions: [
            {
              action: 'start_study',
              title: 'Start Studying',
              icon: '/icons/play.png'
            },
            {
              action: 'snooze',
              title: 'Remind me in 15min',
              icon: '/icons/snooze.png'
            }
          ],
          requireInteraction: true,
          tag: `study-reminder-${reminder.id}`
        });
      }

      // Send email notification
      if (this.preferences.email.enabled && this.preferences.email.studyReminders) {
        await this.sendEmailNotification({
          to: await this.getUserEmail(),
          subject: reminder.title,
          template: 'study_reminder',
          data: {
            title: reminder.title,
            message: reminder.message,
            subjects: reminder.subjects,
            athroId: reminder.athroId,
            scheduledTime: reminder.scheduledTime.toISOString()
          }
        });
      }

      // Send in-app notification
      this.showInAppNotification({
        type: 'info',
        title: reminder.title,
        message: reminder.message,
        duration: 0, // Persistent until user action
        actions: [
          {
            label: 'Start Study Session',
            action: () => this.handleStartStudySession(reminder)
          },
          {
            label: 'Snooze 15min',
            action: () => this.snoozeReminder(reminder.id, 15)
          }
        ]
      });

      // Track reminder engagement
      this.eventBus.publish('notification.reminder.triggered', {
        reminderId: reminder.id,
        type: reminder.type,
        athroId: reminder.athroId,
        subjects: reminder.subjects
      });

    } catch (error) {
      console.error('❌ Failed to trigger reminder:', error);
    }
  }

  // Smart reminder scheduling based on user behavior
  public async createSmartStudySchedule(userPreferences: {
    subjects: string[];
    studyTimes: { start: string; end: string; days: string[] }[];
    reminderFrequency: 'daily' | 'twice_daily' | 'weekly';
    examDates?: { subject: string; date: Date }[];
  }): Promise<void> {
    const reminders: Array<Omit<StudyReminder, 'id'>> = [];

    // Daily study reminders
    if (userPreferences.reminderFrequency === 'daily' || userPreferences.reminderFrequency === 'twice_daily') {
      for (const timeSlot of userPreferences.studyTimes) {
        for (const day of timeSlot.days) {
          const reminderTime = this.getNextReminderTime(day, timeSlot.start);
          
          reminders.push({
            userId: await this.getUserId(),
            type: 'daily_study',
            title: '📚 Time to Study!',
            message: `Ready for your ${timeSlot.start} study session? Let's make progress today!`,
            scheduledTime: reminderTime,
            recurring: true,
            recurringPattern: 'daily',
            subjects: userPreferences.subjects,
            isActive: true
          });

          // Add second reminder for twice daily
          if (userPreferences.reminderFrequency === 'twice_daily') {
            const secondReminderTime = new Date(reminderTime);
            secondReminderTime.setHours(secondReminderTime.getHours() + 6);
            
            reminders.push({
              userId: await this.getUserId(),
              type: 'daily_study',
              title: '🎯 Second Study Session!',
              message: 'Time for your afternoon study boost! Keep the momentum going.',
              scheduledTime: secondReminderTime,
              recurring: true,
              recurringPattern: 'daily',
              subjects: userPreferences.subjects,
              isActive: true
            });
          }
        }
      }
    }

    // Exam preparation reminders
    if (userPreferences.examDates) {
      for (const exam of userPreferences.examDates) {
        const examDate = new Date(exam.date);
        
        // 2 weeks before exam
        const twoWeeksBefore = new Date(examDate);
        twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
        
        reminders.push({
          userId: await this.getUserId(),
          type: 'exam_prep',
          title: `🎓 ${exam.subject} Exam in 2 Weeks!`,
          message: 'Time to create a focused study plan. Let\'s start preparing!',
          scheduledTime: twoWeeksBefore,
          recurring: false,
          subjects: [exam.subject],
          isActive: true
        });

        // 1 week before exam
        const oneWeekBefore = new Date(examDate);
        oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
        
        reminders.push({
          userId: await this.getUserId(),
          type: 'exam_prep',
          title: `⚡ ${exam.subject} Exam Next Week!`,
          message: 'Final week prep! Time for intensive review and practice.',
          scheduledTime: oneWeekBefore,
          recurring: false,
          subjects: [exam.subject],
          isActive: true
        });

        // Day before exam
        const dayBefore = new Date(examDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(18, 0, 0, 0); // 6 PM day before
        
        reminders.push({
          userId: await this.getUserId(),
          type: 'exam_prep',
          title: `🚀 ${exam.subject} Exam Tomorrow!`,
          message: 'Final review time! Stay calm, review key concepts, and get good rest.',
          scheduledTime: dayBefore,
          recurring: false,
          subjects: [exam.subject],
          isActive: true
        });
      }
    }

    // Schedule all reminders
    for (const reminder of reminders) {
      await this.scheduleStudyReminder(reminder);
    }

    console.log(`✅ Scheduled ${reminders.length} smart study reminders`);
  }

  // Progressive notifications based on study streaks
  public async sendProgressNotification(data: {
    type: 'streak_milestone' | 'subject_mastery' | 'weekly_summary' | 'achievement_unlocked';
    streak?: number;
    subject?: string;
    achievement?: string;
    weeklyStats?: {
      studyTime: number;
      sessionsCompleted: number;
      subjectsStudied: string[];
      topSubject: string;
    };
  }): Promise<void> {
    let title = '';
    let message = '';
    let icon = '/icons/achievement.png';

    switch (data.type) {
      case 'streak_milestone':
        title = `🔥 ${data.streak} Day Study Streak!`;
        message = `Amazing! You've studied for ${data.streak} consecutive days. Keep the momentum going!`;
        icon = '/icons/streak.png';
        break;

      case 'subject_mastery':
        title = `🎯 ${data.subject} Mastery Level Up!`;
        message = `Congratulations! Your understanding of ${data.subject} has significantly improved.`;
        icon = '/icons/mastery.png';
        break;

      case 'weekly_summary':
        if (data.weeklyStats) {
          title = '📊 Your Weekly Study Summary';
          message = `This week: ${data.weeklyStats.studyTime} minutes studied, ${data.weeklyStats.sessionsCompleted} sessions completed. Top subject: ${data.weeklyStats.topSubject}!`;
        }
        icon = '/icons/summary.png';
        break;

      case 'achievement_unlocked':
        title = `🏆 Achievement Unlocked!`;
        message = `You've earned: ${data.achievement}`;
        icon = '/icons/trophy.png';
        break;
    }

    // Send all notification types
    await Promise.all([
      this.sendPushNotification({
        title,
        body: message,
        icon,
        badge: '/icons/badge.png',
        data: { ...data },
        tag: `progress-${data.type}`
      }),
      this.showInAppNotification({
        type: 'success',
        title,
        message,
        duration: 8000
      })
    ]);
  }

  // Send push notification
  private async sendPushNotification(notification: PushNotification): Promise<void> {
    if (!this.preferences.webPush.enabled || !this.pushSubscription) {
      return;
    }

    try {
      await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: this.pushSubscription.toJSON(),
          notification
        })
      });
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
    }
  }

  // Send email notification
  private async sendEmailNotification(email: EmailNotification): Promise<void> {
    if (!this.preferences.email.enabled) {
      return;
    }

    try {
      await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(email)
      });
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
    }
  }

  // Show in-app notification
  private showInAppNotification(notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    actions?: Array<{ label: string; action: () => void }>;
  }): void {
    this.eventBus.publish('notification.display.requested', notification);
  }

  // Subscribe to relevant events
  private subscribeToEvents(): void {
    // Study session completed
    this.eventBus.subscribe('study.session.completed', (payload) => {
      this.handleStudySessionCompleted(payload.payload);
    });

    // User achievement
    this.eventBus.subscribe('user.achievement.unlocked', (payload) => {
      this.sendProgressNotification({
        type: 'achievement_unlocked',
        achievement: payload.payload.achievement
      });
    });

    // Low token warning
    this.eventBus.subscribe('user.tokens.low', (payload) => {
      if (this.preferences.webPush.lowTokenWarnings) {
        this.showInAppNotification({
          type: 'warning',
          title: '⚠️ Low Token Warning',
          message: `You have ${payload.payload.tokensRemaining} tokens remaining. Consider upgrading to continue studying.`,
          duration: 0
        });
      }
    });
  }

  // Handle study session completion
  private async handleStudySessionCompleted(sessionData: any): Promise<void> {
    // Check for streak milestones
    if (sessionData.newStreak && sessionData.newStreak % 5 === 0) {
      await this.sendProgressNotification({
        type: 'streak_milestone',
        streak: sessionData.newStreak
      });
    }

    // Schedule next study reminder if user has recurring reminders
    const activeReminders = Array.from(this.studyReminders.values()).filter(
      r => r.isActive && r.recurring && r.subjects?.includes(sessionData.subject)
    );

    for (const reminder of activeReminders) {
      // Adjust next reminder based on completion
      this.rescheduleRecurringReminder(reminder);
    }
  }

  // Utility methods
  private rescheduleRecurringReminder(reminder: StudyReminder): void {
    if (!reminder.recurringPattern) return;

    const nextTime = new Date(reminder.scheduledTime);
    
    switch (reminder.recurringPattern) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + 1);
        break;
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + 7);
        break;
      case 'monthly':
        nextTime.setMonth(nextTime.getMonth() + 1);
        break;
    }

    reminder.scheduledTime = nextTime;
    this.studyReminders.set(reminder.id, reminder);
    this.saveReminders();
    this.scheduleReminder(reminder);
  }

  private snoozeReminder(reminderId: string, minutes: number): void {
    const reminder = this.studyReminders.get(reminderId);
    if (!reminder) return;

    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);
    
    reminder.scheduledTime = snoozeTime;
    this.scheduleReminder(reminder);
  }

  private handleStartStudySession(reminder: StudyReminder): void {
    // Navigate to study session
    if (reminder.athroId) {
      window.location.href = `/workspace?athroId=${reminder.athroId}`;
    } else if (reminder.subjects && reminder.subjects.length > 0) {
      window.location.href = `/workspace?subject=${reminder.subjects[0]}`;
    } else {
      window.location.href = '/workspace';
    }
  }

  // Preference management
  public updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  private loadPreferences(): NotificationPreferences {
    const saved = localStorage.getItem('athro_notification_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('❌ Failed to parse notification preferences:', error);
      }
    }

    // Default preferences
    return {
      webPush: {
        enabled: false,
        studyReminders: true,
        progressUpdates: true,
        lowTokenWarnings: true
      },
      email: {
        enabled: true,
        studyReminders: true,
        progressUpdates: true,
        lowTokenWarnings: true
      },
      inApp: {
        enabled: true,
        studyReminders: true,
        progressUpdates: true,
        lowTokenWarnings: true
      }
    };
  }

  private savePreferences(): void {
    localStorage.setItem('athro_notification_preferences', JSON.stringify(this.preferences));
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      // Get auth token from Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('⚠️ Supabase credentials not found, skipping server preference sync');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('ℹ️ No auth session, using local preferences only');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/notifications-preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const { preferences: serverPreferences } = await response.json();
        if (serverPreferences) {
          // Map server preferences to local format
          this.preferences = {
            webPush: {
              enabled: serverPreferences.push_enabled || false,
              studyReminders: serverPreferences.reminder_notifications || true,
              progressUpdates: serverPreferences.achievement_notifications || true,
              lowTokenWarnings: serverPreferences.system_notifications || true
            },
            email: {
              enabled: serverPreferences.email_enabled || true,
              studyReminders: serverPreferences.reminder_notifications || true,
              progressUpdates: serverPreferences.achievement_notifications || true,
              lowTokenWarnings: serverPreferences.system_notifications || true
            },
            inApp: {
              enabled: true, // Always enabled for in-app
              studyReminders: serverPreferences.reminder_notifications || true,
              progressUpdates: serverPreferences.achievement_notifications || true,
              lowTokenWarnings: serverPreferences.system_notifications || true
            }
          };
          this.savePreferences();
        }
      }
    } catch (error) {
      console.error('❌ Failed to load user preferences from server:', error);
    }
  }

  private async initializeStudyReminders(): Promise<void> {
    const saved = localStorage.getItem('athro_study_reminders');
    if (saved) {
      try {
        const reminders: StudyReminder[] = JSON.parse(saved);
        for (const reminder of reminders) {
          this.studyReminders.set(reminder.id, reminder);
          await this.scheduleReminder(reminder);
        }
      } catch (error) {
        console.error('❌ Failed to load study reminders:', error);
      }
    }
  }

  private saveReminders(): void {
    const reminders = Array.from(this.studyReminders.values());
    localStorage.setItem('athro_study_reminders', JSON.stringify(reminders));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getNextReminderTime(dayName: string, timeString: string): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    
    const now = new Date();
    const today = now.getDay();
    const daysUntilTarget = (targetDay - today + 7) % 7;
    
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);
    
    const [hours, minutes] = timeString.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for next week
    if (daysUntilTarget === 0 && now.getTime() > targetDate.getTime()) {
      targetDate.setDate(targetDate.getDate() + 7);
    }
    
    return targetDate;
  }

  private async getUserId(): Promise<string> {
    // Implementation would depend on your auth system
    return 'current_user_id';
  }

  private async getUserEmail(): Promise<string> {
    // Implementation would depend on your auth system
    return 'user@example.com';
  }

  // Cleanup
  public destroy(): void {
    // Clear all active timers
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 