import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const body = await context.request.json();
    const { action, data } = body;

    // We can identify user either by session cookie (if sent) or from data.userId if embedded
    let session = await getCurrentSession(context, db);
    let userId = session?.user?.id || data?.userId;

    // If still not found, try to look up user from subscription endpoint or last active
    if (!userId && data?.prayer) {
      // Find the most recent active user
      const recentUser = await db.prepare('SELECT user_id FROM subscriptions ORDER BY last_active_at DESC LIMIT 1').first();
      userId = recentUser?.user_id as string;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User could not be identified' }), { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const prayerKey = data?.prayer || 'prayer';

    if (action === 'prayed') {
      const logId = `prayer-${userId}-${todayStr}-${prayerKey}`;
      await db.prepare(`
        INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, responded_at, next_reminder_at)
        VALUES (?, ?, ?, ?, 'prayed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
        ON CONFLICT(user_id, date, prayer) DO UPDATE SET
          status = 'prayed',
          responded_at = CURRENT_TIMESTAMP,
          next_reminder_at = NULL
      `).bind(logId, userId, todayStr, prayerKey).run();

      // History
      const histId = 'hist-' + Date.now();
      await db.prepare(`
        INSERT INTO notifications_history (id, user_id, type, title, body, action_taken)
        VALUES (?, ?, 'prayer_response', 'تأكيد أداء الصلاة', ?, 'prayed')
      `).bind(histId, userId, `تم تأكيد أداء صلاة ${prayerKey}`).run();

      return new Response(JSON.stringify({ success: true, status: 'prayed' }), { status: 200 });
    }

    if (action === 'snooze' || action === 'snooze_15') {
      const snoozeMinutes = 15;
      const nextTime = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();
      const logId = `prayer-${userId}-${todayStr}-${prayerKey}`;

      await db.prepare(`
        INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, snooze_count, next_reminder_at)
        VALUES (?, ?, ?, ?, 'snoozed', CURRENT_TIMESTAMP, 1, ?)
        ON CONFLICT(user_id, date, prayer) DO UPDATE SET
          status = 'snoozed',
          snooze_count = prayers_log.snooze_count + 1,
          next_reminder_at = ?
      `).bind(logId, userId, todayStr, prayerKey, nextTime, nextTime).run();

      return new Response(JSON.stringify({ success: true, status: 'snoozed', nextReminder: nextTime }), { status: 200 });
    }

    if (action === 'focused' || action === 'done') {
      const histId = 'hist-' + Date.now();
      await db.prepare(`
        INSERT INTO notifications_history (id, user_id, type, title, body, action_taken)
        VALUES (?, ?, 'focus_response', 'استجابة لهدف التركيز', ?, ?)
      `).bind(histId, userId, action === 'focused' ? 'استمرار في العمل والتركيز' : 'إتمام الهدف بنجاح', action).run();

      return new Response(JSON.stringify({ success: true, action }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
