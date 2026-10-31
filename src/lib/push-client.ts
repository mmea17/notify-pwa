// Helper utilities for browser Web Push subscription

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getSubscriptionStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
}> {
  if (!isPushSupported()) {
    return { supported: false, permission: 'denied', subscribed: false };
  }

  const permission = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      subscribed: !!sub
    };
  } catch (err) {
    return {
      supported: true,
      permission,
      subscribed: false
    };
  }
}

export async function subscribeUserToPush(deviceName?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'متصفحك لا يدعم إشعارات الويب أو تحتاج لتثبيت التطبيق على الشاشة الرئيسية (PWA) أولاً.' };
  }

  try {
    // 1. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'تم رفض إذن الإشعارات من إعدادات المتصفح. يرجى السماح بالإشعارات من قفل شريط العنوان 🔒.' };
    }

    // 2. Fetch VAPID Public Key from server
    const vapidRes = await fetch('/api/push/vapid-public-key');
    if (!vapidRes.ok) {
      const errText = await vapidRes.text().catch(() => '');
      throw new Error(`خطأ في استرجاع مفتاح الإشعارات: ${errText || vapidRes.statusText}`);
    }

    const vapidData = await vapidRes.json();
    if (!vapidData.publicKey) {
      throw new Error(vapidData.error || 'لم نتمكن من الحصول على مفتاح الإشعارات من الخادم');
    }

    // 3. Register push with browser pushManager
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // 4. Send subscription to our server
    const detectDevice = () => {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return 'موبايل أندرويد';
      if (/iPad|iPhone|iPod/.test(ua)) return 'جهاز آبل (iOS)';
      if (/Macintosh/.test(ua)) return 'جهاز ماك';
      if (/Windows/.test(ua)) return 'كمبيوتر ويندوز';
      return 'متصفح ويب';
    };

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        deviceName: deviceName || detectDevice()
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`فشل حفظ الاشتراك في الخادم: ${errText || res.statusText}`);
    }

    const result = await res.json();
    return { success: true, message: result.message || 'تم تفعيل الإشعارات بنجاح على هذا الجهاز!' };
  } catch (error: any) {
    console.error('Push subscription failed:', error);
    return { success: false, error: error?.message || 'حدث خطأ أثناء تفعيل الإشعارات' };
  }
}

export async function unsubscribeUserFromPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
