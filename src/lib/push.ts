import webpush from 'web-push';
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

export async function getOrCreateVapidKeys(db: D1Database, env: Env): Promise<{ publicKey: string; privateKey: string; subject: string }> {
  const subject = env.VAPID_SUBJECT || 'mailto:admin@notifypwa.local';
  
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject
    };
  }

  // Check in database app_config
  const pubRow = await db.prepare('SELECT value FROM app_config WHERE key = ?').bind('vapid_public_key').first();
  const privRow = await db.prepare('SELECT value FROM app_config WHERE key = ?').bind('vapid_private_key').first();

  if (pubRow && privRow) {
    return {
      publicKey: pubRow.value as string,
      privateKey: privRow.value as string,
      subject
    };
  }

  // Generate new pair
  const keys = webpush.generateVAPIDKeys();
  await db.batch([
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').bind('vapid_public_key', keys.publicKey),
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').bind('vapid_private_key', keys.privateKey)
  ]);

  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    subject
  };
}

export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload,
  vapid: { publicKey: string; privateKey: string; subject: string }
): Promise<boolean> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 60, // 1 hour time-to-live
        urgency: 'high'
      }
    );
    return true;
  } catch (error: any) {
    console.error('Failed to send push notification:', error?.statusCode || error?.message || error);
    // If subscription is expired or invalid (404 / 410 Gone)
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      return false; // Caller can remove this subscription
    }
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
