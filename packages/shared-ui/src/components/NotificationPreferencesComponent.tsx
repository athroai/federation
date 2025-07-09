import React, { useState } from 'react';

interface NotificationPreferencesProps {
  onSave?: (preferences: NotificationPreferences) => void;
  initialPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  studyReminders: boolean;
  progressUpdates: boolean;
  weeklyReports: boolean;
}

export const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({
  onSave,
  initialPreferences = {
    emailNotifications: true,
    studyReminders: true,
    progressUpdates: true,
    weeklyReports: false
  }
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(newPreferences);
    onSave?.(newPreferences);
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px', color: '#e4c97e' }}>Notification Preferences</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b5cbb2' }}>
          <input
            type="checkbox"
            checked={preferences.emailNotifications}
            onChange={() => handleToggle('emailNotifications')}
            style={{ accentColor: '#e4c97e' }}
          />
          Email Notifications
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b5cbb2' }}>
          <input
            type="checkbox"
            checked={preferences.studyReminders}
            onChange={() => handleToggle('studyReminders')}
            style={{ accentColor: '#e4c97e' }}
          />
          Study Reminders
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b5cbb2' }}>
          <input
            type="checkbox"
            checked={preferences.progressUpdates}
            onChange={() => handleToggle('progressUpdates')}
            style={{ accentColor: '#e4c97e' }}
          />
          Progress Updates
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b5cbb2' }}>
          <input
            type="checkbox"
            checked={preferences.weeklyReports}
            onChange={() => handleToggle('weeklyReports')}
            style={{ accentColor: '#e4c97e' }}
          />
          Weekly Reports
        </label>
      </div>
    </div>
  );
};

export default NotificationPreferencesComponent; 