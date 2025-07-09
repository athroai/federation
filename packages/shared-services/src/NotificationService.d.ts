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
export declare class NotificationService {
    private static instance;
    private eventBus;
    private swRegistration;
    private vapidPublicKey;
    private pushSubscription;
    private preferences;
    private studyReminders;
    private activeTimers;
    private constructor();
    static getInstance(): NotificationService;
    private initializeService;
    private registerServiceWorker;
    requestPushPermission(): Promise<boolean>;
    private subscribeToPush;
    private urlB64ToUint8Array;
    private sendSubscriptionToBackend;
    scheduleStudyReminder(reminder: Omit<StudyReminder, 'id'>): Promise<string>;
    private scheduleReminder;
    private triggerReminder;
    createSmartStudySchedule(userPreferences: {
        subjects: string[];
        studyTimes: {
            start: string;
            end: string;
            days: string[];
        }[];
        reminderFrequency: 'daily' | 'twice_daily' | 'weekly';
        examDates?: {
            subject: string;
            date: Date;
        }[];
    }): Promise<void>;
    sendProgressNotification(data: {
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
    }): Promise<void>;
    private sendPushNotification;
    private sendEmailNotification;
    private showInAppNotification;
    private subscribeToEvents;
    private handleStudySessionCompleted;
    private rescheduleRecurringReminder;
    private snoozeReminder;
    private handleStartStudySession;
    updatePreferences(newPreferences: Partial<NotificationPreferences>): void;
    getPreferences(): NotificationPreferences;
    private loadPreferences;
    private savePreferences;
    private loadUserPreferences;
    private initializeStudyReminders;
    private saveReminders;
    private generateId;
    private getNextReminderTime;
    private getUserId;
    private getUserEmail;
    destroy(): void;
}
export declare const notificationService: NotificationService;
