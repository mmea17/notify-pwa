// Notify PWA Service Worker with Fast Offline Shell Caching & Interactive Push

const CACHE_NAME = 'notify-pwa-v5';
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

// 3. Intercept Fetch Requests (Instant Offline Support & Caching)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // A. Navigation Requests (Opening or refreshing pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // 1. If device is offline, return cache INSTANTLY (0ms delay, no timeout wait!)
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const cached = (await cache.match(request)) || (await cache.match('/'));
          if (cached) return cached;
        }

        // 2. If online, fetch with a 1.2s timeout to avoid any 5-7s browser hanging
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            cache.put('/', networkResponse.clone());
            return networkResponse;
          }
        } catch (e) {
          // Timeout or network error -> fall back to cache immediately
        }

        const fallbackCached = (await cache.match(request)) || (await cache.match('/'));
        if (fallbackCached) return fallbackCached;

        return new Response('<h1>غير متصل بالإنترنت</h1>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // B. Static Assets (_astro bundles, css, js, icons, images, manifest) -> Cache-First with Background Update
  const isStaticAsset =
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // If in cache, return immediately for 0ms load
        if (cachedResponse) {
          // Update in background if online
          if (navigator.onLine) {
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. API GET Requests (/api/*)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // If explicitly offline, return cached API response immediately
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // If online, try network with 1.2s timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch (e) {
          // Fall back to cache
        }

        const cached = await cache.match(request);
        if (cached) return cached;

        return new Response(JSON.stringify({ offline: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })()
    );
    return;
  }
});

// 4. Receive Push Notifications
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
