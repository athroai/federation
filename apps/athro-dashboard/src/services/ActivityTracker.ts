import { supabase } from './supabaseClient';
import { NotificationSchedulingService } from './NotificationSchedulingService';

interface ActivityData {
  user_id: string;
  activity_type: 'athro_usage' | 'study_tool_usage' | 'resource_upload' | 'login' | 'study_session';
  athro_id?: string;
  tool_type?: string;
  subject?: string;
  metadata?: Record<string, any>;
}

export class ActivityTracker {
  private static instance: ActivityTracker;
  private notificationService: NotificationSchedulingService;

  private constructor() {
    this.notificationService = NotificationSchedulingService.getInstance();
  }

  public static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  // ===============================
  // ACTIVITY TRACKING METHODS
  // ===============================

  public async trackAthroUsage(userId: string, athroId: string, subject?: string): Promise<void> {
    try {
      await this.trackActivity({
        user_id: userId,
        activity_type: 'athro_usage',
        athro_id: athroId,
        subject: subject,
        metadata: {
          timestamp: new Date().toISOString(),
          session_id: this.generateSessionId()
        }
      });

      console.log(`📊 Tracked Athro usage: ${athroId} for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to track Athro usage:', error);
    }
  }

  public async trackStudyToolUsage(userId: string, toolType: string, subject?: string): Promise<void> {
    try {
      await this.trackActivity({
        user_id: userId,
        activity_type: 'study_tool_usage',
        tool_type: toolType,
        subject: subject,
        metadata: {
          timestamp: new Date().toISOString(),
          session_id: this.generateSessionId()
        }
      });

      console.log(`📊 Tracked study tool usage: ${toolType} for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to track study tool usage:', error);
    }
  }

  public async trackResourceUpload(userId: string, resourceType: string, subject?: string): Promise<void> {
    try {
      await this.trackActivity({
        user_id: userId,
        activity_type: 'resource_upload',
        subject: subject,
        metadata: {
          timestamp: new Date().toISOString(),
          resource_type: resourceType,
          session_id: this.generateSessionId()
        }
      });

      console.log(`📊 Tracked resource upload: ${resourceType} for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to track resource upload:', error);
    }
  }

  public async trackLogin(userId: string): Promise<void> {
    try {
      await this.trackActivity({
        user_id: userId,
        activity_type: 'login',
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          platform: navigator.platform
        }
      });

      console.log(`📊 Tracked login for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to track login:', error);
    }
  }

  public async trackStudySession(userId: string, duration: number, subject?: string): Promise<void> {
    try {
      await this.trackActivity({
        user_id: userId,
        activity_type: 'study_session',
        subject: subject,
        metadata: {
          timestamp: new Date().toISOString(),
          duration_minutes: duration,
          session_id: this.generateSessionId()
        }
      });

      console.log(`📊 Tracked study session: ${duration} minutes for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to track study session:', error);
    }
  }

  // ===============================
  // TOKEN USAGE TRACKING
  // ===============================

  public async trackTokenUsage(
    userId: string, 
    tokensUsed: number, 
    tokensRemaining: number, 
    usageType: string,
    athroId?: string,
    subject?: string
  ): Promise<void> {
    try {
      // Log token usage and check for low token warnings
      await this.notificationService.checkTokenUsageAndWarn(
        userId, 
        tokensUsed, 
        tokensRemaining, 
        usageType
      );

      console.log(`💰 Tracked token usage: ${tokensUsed} used, ${tokensRemaining} remaining for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to track token usage:', error);
    }
  }

  // ===============================
  // CALENDAR EVENT TRACKING
  // ===============================

  public async trackCalendarEvent(
    userId: string,
    eventId: string,
    title: string,
    startTime: Date,
    endTime: Date,
    eventType: 'study' | 'exam' | 'assignment' | 'revision' | 'break',
    subject?: string
  ): Promise<void> {
    try {
      // Store the event in our calendar table
      await supabase
        .from('calendar_events')
        .upsert({
          id: eventId,
          user_id: userId,
          title: title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          event_type: eventType,
          subject: subject,
          notification_scheduled: false,
          notification_sent: false
        });

      // Schedule reminder notification
      await this.notificationService.scheduleCalendarReminder({
        id: eventId,
        user_id: userId,
        title: title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: eventType,
        subject: subject,
        notification_scheduled: false,
        notification_sent: false
      });

      console.log(`📅 Tracked calendar event: ${title} for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to track calendar event:', error);
    }
  }

  public async updateCalendarEvent(
    eventId: string,
    updates: Partial<{
      title: string;
      start_time: Date;
      end_time: Date;
      event_type: 'study' | 'exam' | 'assignment' | 'revision' | 'break';
      subject: string;
    }>
  ): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.start_time) updateData.start_time = updates.start_time.toISOString();
      if (updates.end_time) updateData.end_time = updates.end_time.toISOString();
      if (updates.event_type) updateData.event_type = updates.event_type;
      if (updates.subject) updateData.subject = updates.subject;

      await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId);

      // If start time changed, reschedule the reminder
      if (updates.start_time) {
        await this.notificationService.rescheduleCalendarReminder(eventId, updates.start_time);
      }

      console.log(`📅 Updated calendar event: ${eventId}`);
    } catch (error) {
      console.error('❌ Failed to update calendar event:', error);
    }
  }

  // ===============================
  // ANALYTICS & INSIGHTS
  // ===============================

  public async getUserActivitySummary(userId: string, days: number = 30): Promise<{
    athro_usage: { [athroId: string]: number };
    study_tool_usage: { [toolType: string]: number };
    resource_uploads: number;
    study_sessions: number;
    total_study_time: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: activities } = await supabase
        .from('user_activity_tracking')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      const summary = {
        athro_usage: {} as { [athroId: string]: number },
        study_tool_usage: {} as { [toolType: string]: number },
        resource_uploads: 0,
        study_sessions: 0,
        total_study_time: 0
      };

      if (activities) {
        for (const activity of activities) {
          switch (activity.activity_type) {
            case 'athro_usage':
              if (activity.athro_id) {
                summary.athro_usage[activity.athro_id] = (summary.athro_usage[activity.athro_id] || 0) + 1;
              }
              break;
            case 'study_tool_usage':
              if (activity.tool_type) {
                summary.study_tool_usage[activity.tool_type] = (summary.study_tool_usage[activity.tool_type] || 0) + 1;
              }
              break;
            case 'resource_upload':
              summary.resource_uploads++;
              break;
            case 'study_session':
              summary.study_sessions++;
              if (activity.metadata?.duration_minutes) {
                summary.total_study_time += activity.metadata.duration_minutes;
              }
              break;
          }
        }
      }

      return summary;
    } catch (error) {
      console.error('❌ Failed to get user activity summary:', error);
      return {
        athro_usage: {},
        study_tool_usage: {},
        resource_uploads: 0,
        study_sessions: 0,
        total_study_time: 0
      };
    }
  }

  public async getInactiveAthros(userId: string, daysThreshold: number = 30): Promise<string[]> {
    try {
      const { data: recentActivity } = await supabase
        .from('user_activity_tracking')
        .select('athro_id')
        .eq('user_id', userId)
        .eq('activity_type', 'athro_usage')
        .gte('created_at', new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000).toISOString());

      const activeAthros = new Set(
        recentActivity?.map(a => a.athro_id).filter(Boolean) || []
      );

      const allAthros = ['athro-arts', 'athro-astrology', 'athro-business', 'athro-chemistry', 'athro-computer-science'];
      return allAthros.filter(athroId => !activeAthros.has(athroId));
    } catch (error) {
      console.error('❌ Failed to get inactive athros:', error);
      return [];
    }
  }

  // ===============================
  // PRIVATE METHODS
  // ===============================

  private async trackActivity(data: ActivityData): Promise<void> {
    await this.notificationService.trackActivity(data);
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ===============================
  // CONVENIENCE METHODS FOR COMPONENTS
  // ===============================

  // Easy-to-use wrapper methods for common tracking scenarios
  public async onAthroCardClick(userId: string, athroId: string, subject?: string): Promise<void> {
    await this.trackAthroUsage(userId, athroId, subject);
  }

  public async onQuizGenerated(userId: string, subject: string): Promise<void> {
    await this.trackStudyToolUsage(userId, 'quiz', subject);
  }

  public async onFlashcardCreated(userId: string, subject: string): Promise<void> {
    await this.trackStudyToolUsage(userId, 'flashcard', subject);
  }

  public async onNotesCreated(userId: string, subject: string): Promise<void> {
    await this.trackStudyToolUsage(userId, 'notes', subject);
  }

  public async onFileUploaded(userId: string, fileType: string, subject?: string): Promise<void> {
    await this.trackResourceUpload(userId, fileType, subject);
  }

  public async onUserLogin(userId: string): Promise<void> {
    await this.trackLogin(userId);
  }

  public async onChatMessage(userId: string, tokensUsed: number, tokensRemaining: number, athroId?: string): Promise<void> {
    await this.trackTokenUsage(userId, tokensUsed, tokensRemaining, 'chat', athroId);
  }
}

export default ActivityTracker; 