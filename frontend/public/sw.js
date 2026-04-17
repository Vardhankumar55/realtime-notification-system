/**
 * Service Worker for NotifyHub Web Push Notifications.
 *
 * This runs in the BACKGROUND, even when the user has closed all tabs.
 * It listens for push events from the server and shows native OS notifications.
 *
 * How it works:
 * 1. The browser receives a push message from the server (via FCM/Mozilla push service)
 * 2. This service worker wakes up and fires the 'push' event
 * 3. We parse the payload and show a native notification
 * 4. When the user clicks the notification, we open/focus the app
 */

/* eslint-disable no-restricted-globals */

// Cache name for offline support
const CACHE_NAME = 'notifyhub-v1';

// Install event — activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Activate event — claim all clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

/**
 * PUSH EVENT — This is triggered by the server even when the site is closed!
 * This is the magic that makes notifications work outside the platform.
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'NotifyHub',
    body: 'You have a new notification',
    type: 'INFO',
    deepLink: '/notifications',
    icon: '/favicon.png',
    badge: '/favicon.png',
  };

  // Parse the push payload from the server
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      // If JSON parsing fails, try as text
      data.body = event.data.text();
    }
  }

  // Map notification type to visual style
  const typeConfig = {
    URGENT: { tag: 'urgent', requireInteraction: true, vibrate: [300, 100, 300, 100, 300] },
    ALERT: { tag: 'alert', requireInteraction: true, vibrate: [200, 100, 200] },
    WARNING: { tag: 'warning', requireInteraction: false, vibrate: [200, 100] },
    SUCCESS: { tag: 'success', requireInteraction: false, vibrate: [100] },
    INFO: { tag: 'info', requireInteraction: false, vibrate: [100] },
    UPDATE: { tag: 'update', requireInteraction: false, vibrate: [100] },
  };

  const config = typeConfig[data.type] || typeConfig.INFO;

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    tag: config.tag + '-' + Date.now(), // Unique tag to avoid replacing
    requireInteraction: config.requireInteraction,
    vibrate: config.vibrate,
    data: {
      deepLink: data.deepLink || '/notifications',
      type: data.type,
      timestamp: data.timestamp || Date.now(),
    },
    actions: [
      { action: 'open', title: '🔔 Open' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
    // Show timestamp
    timestamp: data.timestamp || Date.now(),
    // Renotify even if same tag
    renotify: true,
    // Keep notification silent if type is low priority
    silent: data.priority === 'LOW',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * NOTIFICATION CLICK — When user clicks the notification,
 * open the app and navigate to the deep link.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return; // Just close the notification
  }

  const deepLink = event.notification.data?.deepLink || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            deepLink: deepLink,
          });
          return;
        }
      }

      // If the app is not open, open a new window
      return self.clients.openWindow(deepLink);
    })
  );
});

/**
 * NOTIFICATION CLOSE — Track when user dismisses a notification.
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed');
});
