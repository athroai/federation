import React, { useState, useEffect, useCallback } from 'react';
import { NotificationService, NotificationPreferences, StudyReminder } from '@athro/shared-services';

// Enhanced notification interface
export interface EnhancedNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'reminder' | 'achievement';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface NotificationCenterProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  position = 'top-right',
  maxNotifications = 5
}) => {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationService] = useState(() => NotificationService.getInstance());

  // Add notification
  const addNotification = useCallback((notification: Omit<EnhancedNotification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: EnhancedNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    setUnreadCount(prev => prev + 1);

    // Auto-remove non-persistent notifications
    if (!notification.persistent && notification.duration !== 0) {
      const timeout = notification.duration || 5000;
      setTimeout(() => {
        removeNotification(id);
      }, timeout);
    }

    return id;
  }, [maxNotifications]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Subscribe to notification service events
  useEffect(() => {
    const subscriptionId = notificationService.eventBus.subscribe('notification.display.requested', (payload) => {
      addNotification(payload.payload);
    });

    return () => {
      notificationService.eventBus.unsubscribe(subscriptionId);
    };
  }, [addNotification, notificationService.eventBus]);

  // Get position classes
  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    const iconClasses = "w-6 h-6 flex-shrink-0";
    
    switch (type) {
      case 'success':
        return (
          <svg className={`${iconClasses} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconClasses} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClasses} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'reminder':
        return (
          <svg className={`${iconClasses} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'achievement':
        return (
          <svg className={`${iconClasses} text-purple-500`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClasses} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Get notification background color
  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'reminder':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'achievement':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (isMinimized) {
    return (
      <div className={`fixed ${getPositionClasses(position)} z-50`}>
        <button
          onClick={() => {
            setIsMinimized(false);
            markAllAsRead();
          }}
          className="relative bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200"
          title="Open notifications"
        >
          <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses(position)} z-50 max-w-sm w-full ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-t-lg shadow-lg border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="text-gray-500 hover:text-gray-700 text-sm"
              title="Clear all"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-500 hover:text-gray-700"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-b-lg shadow-lg border-l border-r border-b border-gray-200 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <p>No notifications</p>
            <p className="text-sm">You're all caught up! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 ${getNotificationBg(notification.type)} border-l-4 hover:bg-opacity-80 transition-colors duration-200`}
                style={{
                  borderLeftColor: notification.type === 'success' ? '#10b981' :
                                   notification.type === 'error' ? '#ef4444' :
                                   notification.type === 'warning' ? '#f59e0b' :
                                   notification.type === 'reminder' ? '#3b82f6' :
                                   notification.type === 'achievement' ? '#8b5cf6' : '#6b7280'
                }}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-sm leading-5">{notification.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-75">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="text-gray-500 hover:text-gray-700 opacity-75 hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm mt-1 leading-5">{notification.message}</p>
                    
                    {/* Actions */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {notification.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              action.action();
                              if (!notification.persistent) {
                                removeNotification(notification.id);
                              }
                            }}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                              action.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                              action.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                              'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for using notifications
export const useNotificationCenter = () => {
  const [notificationService] = useState(() => NotificationService.getInstance());
  
  const showNotification = useCallback((notification: Omit<EnhancedNotification, 'id' | 'timestamp'>) => {
    notificationService.eventBus.publish('notification.display.requested', notification);
  }, [notificationService.eventBus]);

  const showSuccess = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    showNotification({ type: 'success', title, message, ...options });
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    showNotification({ type: 'error', title, message, ...options });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    showNotification({ type: 'warning', title, message, ...options });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    showNotification({ type: 'info', title, message, ...options });
  }, [showNotification]);

  const showReminder = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    showNotification({ type: 'reminder', title, message, persistent: true, ...options });
  }, [showNotification]);

  const showAchievement = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    showNotification({ 
      type: 'achievement', 
      title, 
      message, 
      duration: 8000,
      actions: [
        {
          label: '🎉 Awesome!',
          action: () => {},
          variant: 'primary'
        }
      ],
      ...options 
    });
  }, [showNotification]);

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showReminder,
    showAchievement,
    notificationService
  };
};

export default NotificationCenter; 