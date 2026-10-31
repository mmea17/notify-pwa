import { buildPushPayload } from '@block65/webcrypto-web-push';
import type { Env } from './db';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export const DEFAULT_VAPID_PUBLIC_KEY = 'BDIEGQcyoS50W-USqIC4ej3Id2a7DxL76DDo8TZfuUKuj2qWJvOFXk4JdEvAuKAF-H3KS6OAOzLNFssfDvqmy5A';
export const DEFAULT_VAPID_PRIVATE_KEY = '_B-zrIcqT8TnDYhVIOYioOV8ofLrOw2938-7v2y4xvk';

export async function getOrCreateVapidKeys(db: D1Database, env: Env): Promise<{ publicKey: string; privateKey: string; subject: string }> {
  const subject = env.VAPID_SUBJECT || 'mailto:admin@notify-pwa-85k.pages.dev';
  
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject
    };
  }

  // Check in database app_config
  try {
    const pubRow = await db.prepare('SELECT value FROM app_config WHERE key = ?').bind('vapid_public_key').first();
    const privRow = await db.prepare('SELECT value FROM app_config WHERE key = ?').bind('vapid_private_key').first();

    if (pubRow?.value && privRow?.value) {
      return {
        publicKey: pubRow.value as string,
        privateKey: privRow.value as string,
        subject
      };
    }
  } catch (e) {
    console.warn('Could not read vapid keys from db:', e);
  }

  return {
    publicKey: DEFAULT_VAPID_PUBLIC_KEY,
    privateKey: DEFAULT_VAPID_PRIVATE_KEY,
    subject
  };
}

export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload,
  vapid: { publicKey: string; privateKey: string; subject: string }
): Promise<boolean> {
  try {
    const sub = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const pushPayload = await buildPushPayload({ data: payload }, sub, vapid);
    const res = await fetch(subscription.endpoint, {
      method: pushPayload.method,
      headers: pushPayload.headers,
      body: pushPayload.body
    });

    if (res.ok || res.status === 201 || res.status === 202) {
      return true;
    }

    if (res.status === 404 || res.status === 410) {
      return false; // Subscription expired
    }

    console.warn('Push response status:', res.status, await res.text());
    return false;
  } catch (error: any) {
    console.error('Failed to send push notification:', error?.message || error);
    return false;
  }
}

export async function sendPushToUser(
  db: D1Database,
  env: Env,
  userId: string,
  payload: PushNotificationPayload
): Promise<{ total: number; sent: number }> {
  const subscriptions = await db.prepare(
    'SELECT id, endpoint, p256dh, auth FROM subscriptions WHERE user_id = ?'
  ).bind(userId).all();

  if (!subscriptions.results || subscriptions.results.length === 0) {
    return { total: 0, sent: 0 };
  }

  const vapid = await getOrCreateVapidKeys(db, env);
  let sentCount = 0;
  const expiredIds: string[] = [];

  for (const sub of subscriptions.results) {
    const success = await sendPushToSubscription(
      {
        endpoint: sub.endpoint as string,
        p256dh: sub.p256dh as string,
        auth: sub.auth as string
      },
      payload,
      vapid
    );

    if (success) {
      sentCount++;
    } else {
      expiredIds.push(sub.id as string);
    }
  }

  // Remove expired device subscriptions
  if (expiredIds.length > 0) {
    for (const id of expiredIds) {
      await db.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run();
    }
  }

  // Log in notification history
  try {
    const histId = 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    await db.prepare(`
      INSERT INTO notifications_history (id, user_id, type, title, body)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      histId,
      userId,
      payload.data?.type || 'general',
      payload.title,
      payload.body
    ).run();
  } catch (err) {
    console.warn('Could not record history:', err);
  }

  return { total: subscriptions.results.length, sent: sentCount };
}
