// Notify PWA Service Worker with Interactive Action Buttons

const CACHE_NAME = 'notify-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.svg'
];

// 1. Install & Cache offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Cache addAll non-critical error:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate & Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Receive Push Notifications
self.addEventListener('push', (event) => {
  let payload = {
    title: 'تذكير جديد',
    body: 'حان وقت التذكير!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {},
    actions: []
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || {},
    actions: payload.actions || [],
    tag: payload.tag || ('notify-' + Date.now()),
    renotify: true,
    requireInteraction: true, // Keep it visible until the user interacts
    dir: 'rtl',
    lang: 'ar'
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// 4. Handle Notification Interaction (Clicks & Action Buttons)
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action; // 'prayed', 'snooze', 'focused', 'done', etc.
  const data = notification.data || {};

  notification.close();

  // If user clicked a specific action button directly on the notification
  if (action) {
    event.waitUntil(
      (async () => {
        try {
          // Send user response to backend API in the background
          await fetch('/api/push/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: action,
              data: data,
              timestamp: Date.now()
            })
          });

          // Show immediate feedback to user confirming their action
          let feedbackTitle = 'تم تسجيل ردك ✅';
          let feedbackBody = 'شكراً لك!';

          if (action === 'prayed') {
            feedbackTitle = 'تقبل الله طاعتكم! 🤲';
            feedbackBody = 'تم تسجيل أداء الصلاة بنجاح، لن نذكرك بها مجدداً اليوم.';
          } else if (action === 'snooze' || action === 'snooze_15') {
            feedbackTitle = 'تم تأجيل التذكير ⏰';
            feedbackBody = 'سنذكرك بها مجدداً بعد ربع ساعة إن شاء الله.';
          } else if (action === 'focused') {
            feedbackTitle = 'عاش يا بطل! 💪';
            feedbackBody = 'استمر في التركيز على هدفك، كل دقيقة تقربك من إنجازه.';
          } else if (action === 'done') {
            feedbackTitle = 'ألف مبروك الإنجاز! 🎉';
            feedbackBody = 'تم تسجيل إتمام المهمة.';
          }

          await self.registration.showNotification(feedbackTitle, {
            body: feedbackBody,
            icon: '/icons/icon-192.png',
            tag: 'feedback-' + Date.now(),
            timeout: 5000,
            dir: 'rtl',
            lang: 'ar'
          });
        } catch (err) {
          console.error('Error handling notification action:', err);
        }
      })()
    );
    return;
  }

  // If user clicked the notification body (not an action button), open the app
  const targetUrl = data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
