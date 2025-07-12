// AthroAI Notification Service Worker
const NOTIFICATION_VERSION = 'v1.2.0';
const CACHE_NAME = 'athro-notifications-cache-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('🔔 AthroAI Notification Service Worker installing...', NOTIFICATION_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
        '/icons/study-reminder.png',
        '/icons/achievement.png',
        '/icons/streak.png',
        '/icons/mastery.png',
        '/icons/summary.png',
        '/icons/trophy.png',
        '/icons/badge.png',
        '/icons/play.png',
        '/icons/snooze.png'
      ]);
    })
  );
  
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 AthroAI Notification Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Push event handler
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received:', event);
  
  let notificationData = {
    title: 'AthroAI Study Reminder',
    body: 'Time to continue your learning journey!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    image: null,
    data: {},
    actions: [],
    requireInteraction: false,
    silent: false,
    tag: 'athro-default',
    timestamp: Date.now()
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('❌ Error parsing push data:', error);
    }
  }

  // Enhance notification based on type
  if (notificationData.data.type) {
    notificationData = enhanceNotification(notificationData);
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      tag: notificationData.tag,
      timestamp: notificationData.timestamp,
      vibrate: [200, 100, 200], // Gentle vibration pattern
      dir: 'ltr',
      lang: 'en'
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.notification.tag, event.action);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  event.waitUntil(
    handleNotificationClick(action, notificationData)
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification closed:', event.notification.tag);
  
  // Track notification dismissal
  const notificationData = event.notification.data || {};
  
  if (notificationData.trackDismissal) {
    fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dismissed',
        type: notificationData.type,
        notificationId: notificationData.id || event.notification.tag,
        timestamp: Date.now()
      })
    }).catch(error => console.error('❌ Failed to track dismissal:', error));
  }
});

// Enhance notification based on type
function enhanceNotification(notification) {
  const { data } = notification;
  
  switch (data.type) {
    case 'study_reminder':
      return {
        ...notification,
        icon: '/icons/study-reminder.png',
        actions: [
          {
            action: 'start_study',
            title: '🚀 Start Study Session',
            icon: '/icons/play.png'
          },
          {
            action: 'snooze',
            title: '⏰ Snooze (15 min)',
            icon: '/icons/snooze.png'
          },
          {
            action: 'view_schedule',
            title: '📅 View Schedule',
            icon: '/icons/calendar.png'
          }
        ],
        requireInteraction: true,
        tag: `study-reminder-${data.reminderId}`,
        vibrate: [200, 100, 200, 100, 200]
      };

    case 'streak_milestone':
      return {
        ...notification,
        icon: '/icons/streak.png',
        image: generateStreakImage(data.streak),
        actions: [
          {
            action: 'view_progress',
            title: '📊 View Progress',
            icon: '/icons/chart.png'
          },
          {
            action: 'share_achievement',
            title: '🎉 Share Achievement',
            icon: '/icons/share.png'
          }
        ],
        requireInteraction: true,
        tag: `streak-${data.streak}`,
        vibrate: [300, 100, 300, 100, 300]
      };

    case 'subject_mastery':
      return {
        ...notification,
        icon: '/icons/mastery.png',
        actions: [
          {
            action: 'view_mastery',
            title: '🎯 View Mastery Details',
            icon: '/icons/target.png'
          },
          {
            action: 'next_subject',
            title: '➡️ Study Next Subject',
            icon: '/icons/next.png'
          }
        ],
        requireInteraction: true,
        tag: `mastery-${data.subject}`,
        vibrate: [400, 200, 400]
      };

    case 'exam_alert':
      return {
        ...notification,
        icon: '/icons/exam.png',
        actions: [
          {
            action: 'study_plan',
            title: '📋 View Study Plan',
            icon: '/icons/plan.png'
          },
          {
            action: 'practice_test',
            title: '📝 Take Practice Test',
            icon: '/icons/test.png'
          }
        ],
        requireInteraction: true,
        tag: `exam-${data.subject}`,
        vibrate: [500, 200, 500, 200, 500]
      };

    case 'low_tokens':
      return {
        ...notification,
        icon: '/icons/warning.png',
        actions: [
          {
            action: 'upgrade_plan',
            title: '⭐ Upgrade Plan',
            icon: '/icons/upgrade.png'
          },
          {
            action: 'view_usage',
            title: '📈 View Usage',
            icon: '/icons/usage.png'
          }
        ],
        requireInteraction: true,
        tag: 'low-tokens',
        vibrate: [200, 100, 200, 100, 200, 100, 200]
      };

    case 'achievement_unlocked':
      return {
        ...notification,
        icon: '/icons/trophy.png',
        actions: [
          {
            action: 'view_achievement',
            title: '🏆 View Achievement',
            icon: '/icons/medal.png'
          },
          {
            action: 'share_achievement',
            title: '🎉 Share',
            icon: '/icons/share.png'
          }
        ],
        requireInteraction: true,
        tag: `achievement-${data.achievement}`,
        vibrate: [300, 100, 300, 100, 300, 100, 300]
      };

    case 'weekly_summary':
      return {
        ...notification,
        icon: '/icons/summary.png',
        actions: [
          {
            action: 'view_report',
            title: '📊 View Full Report',
            icon: '/icons/report.png'
          },
          {
            action: 'set_goals',
            title: '🎯 Set New Goals',
            icon: '/icons/goals.png'
          }
        ],
        requireInteraction: false,
        tag: 'weekly-summary',
        vibrate: [200, 100, 200]
      };

    default:
      return notification;
  }
}

// Handle notification click actions
async function handleNotificationClick(action, data) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Track the click
  trackNotificationClick(action, data);

  let urlToOpen = '/';
  let shouldFocus = true;

  switch (action) {
    case 'start_study':
      if (data.athroId) {
        urlToOpen = `/workspace?athroId=${data.athroId}`;
      } else if (data.subjects && data.subjects.length > 0) {
        urlToOpen = `/workspace?subject=${encodeURIComponent(data.subjects[0])}`;
      } else {
        urlToOpen = '/workspace';
      }
      break;

    case 'snooze':
      // Handle snooze action
      await handleSnoozeAction(data);
      return; // Don't open a window for snooze

    case 'view_schedule':
      urlToOpen = '/dashboard?tab=calendar';
      break;

    case 'view_progress':
      urlToOpen = '/dashboard?tab=progress';
      break;

    case 'view_mastery':
      urlToOpen = `/dashboard?tab=insights&subject=${encodeURIComponent(data.subject)}`;
      break;

    case 'study_plan':
      urlToOpen = `/dashboard?tab=study-plan&subject=${encodeURIComponent(data.subject)}`;
      break;

    case 'practice_test':
      urlToOpen = `/workspace?mode=quiz&subject=${encodeURIComponent(data.subject)}`;
      break;

    case 'upgrade_plan':
      urlToOpen = '/dashboard?tab=subscription&action=upgrade';
      break;

    case 'view_usage':
      urlToOpen = '/dashboard?tab=subscription&section=usage';
      break;

    case 'view_achievement':
      urlToOpen = `/dashboard?tab=achievements&highlight=${encodeURIComponent(data.achievement)}`;
      break;

    case 'share_achievement':
      await handleShareAction(data);
      return; // Don't open a window for share

    case 'view_report':
      urlToOpen = '/dashboard?tab=progress&section=weekly';
      break;

    case 'set_goals':
      urlToOpen = '/dashboard?tab=settings&section=goals';
      break;

    default:
      // Default click (no action specified)
      if (data.type === 'study_reminder') {
        urlToOpen = data.athroId ? `/workspace?athroId=${data.athroId}` : '/workspace';
      } else {
        urlToOpen = '/dashboard';
      }
  }

  // Find existing window or open new one
  const existingClient = clients.find(client => 
    client.url.includes(new URL(urlToOpen, self.location.origin).pathname)
  );

  if (existingClient) {
    // Focus existing window
    await existingClient.focus();
    
    // Send message to update the page if needed
    existingClient.postMessage({
      type: 'notification_action',
      action,
      data
    });
  } else {
    // Open new window
    await self.clients.openWindow(new URL(urlToOpen, self.location.origin).href);
  }
}

// Handle snooze action
async function handleSnoozeAction(data) {
  const snoozeMinutes = data.snoozeMinutes || 15;
  
  try {
    await fetch('/api/notifications/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reminderId: data.reminderId,
        snoozeMinutes,
        timestamp: Date.now()
      })
    });

    // Show feedback notification
    await self.registration.showNotification('⏰ Reminder Snoozed', {
      body: `We'll remind you again in ${snoozeMinutes} minutes`,
      icon: '/icons/snooze.png',
      tag: 'snooze-feedback',
      silent: true,
      requireInteraction: false,
      actions: []
    });

  } catch (error) {
    console.error('❌ Failed to snooze reminder:', error);
  }
}

// Handle share action
async function handleShareAction(data) {
  try {
    if (navigator.share) {
      // Use native share API if available
      await navigator.share({
        title: 'AthroAI Achievement',
        text: `I just unlocked: ${data.achievement}! 🎉`,
        url: `${self.location.origin}/dashboard?tab=achievements`
      });
    } else {
      // Fallback: copy to clipboard
      const shareText = `I just unlocked: ${data.achievement}! 🎉 Check out AthroAI: ${self.location.origin}`;
      
      // Show feedback notification
      await self.registration.showNotification('🎉 Ready to Share!', {
        body: 'Achievement details copied. Paste in your favorite social app!',
        icon: '/icons/share.png',
        tag: 'share-feedback',
        silent: true,
        requireInteraction: false,
        actions: []
      });
    }
  } catch (error) {
    console.error('❌ Share failed:', error);
  }
}

// Track notification interactions
function trackNotificationClick(action, data) {
  fetch('/api/notifications/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: action || 'click',
      type: data.type,
      notificationId: data.id || data.reminderId,
      timestamp: Date.now(),
      metadata: {
        athroId: data.athroId,
        subjects: data.subjects,
        userAgent: navigator.userAgent
      }
    })
  }).catch(error => console.error('❌ Failed to track click:', error));
}

// Generate dynamic streak image (placeholder - you'd implement actual image generation)
function generateStreakImage(streak) {
  // In a real implementation, you might generate a dynamic image or use predefined images
  return `/images/streak-${Math.min(streak, 100)}.png`;
}

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncOfflineNotifications());
  }
});

async function syncOfflineNotifications() {
  try {
    // Sync any queued notifications when back online
    const response = await fetch('/api/notifications/sync');
    const pendingNotifications = await response.json();
    
    for (const notification of pendingNotifications) {
      await self.registration.showNotification(notification.title, notification.options);
    }
  } catch (error) {
    console.error('❌ Failed to sync offline notifications:', error);
  }
}

// Message handling from main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SHOW_NOTIFICATION':
      self.registration.showNotification(data.title, data.options);
      break;
      
    case 'UPDATE_BADGE':
      if (navigator.setAppBadge) {
        navigator.setAppBadge(data.count);
      }
      break;
      
    case 'CLEAR_BADGE':
      if (navigator.clearAppBadge) {
        navigator.clearAppBadge();
      }
      break;
  }
});

console.log('✅ AthroAI Notification Service Worker loaded successfully'); 