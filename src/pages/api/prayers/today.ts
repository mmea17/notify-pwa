import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { calculateDailyPrayers } from '@/lib/prayer';

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];

    const prayers = calculateDailyPrayers(
      session.settings.latitude,
      session.settings.longitude,
      session.settings.calculation_method,
      session.settings.madhab,
      todayDate,
      session.settings.pre_prayer_mins,
      session.settings.post_prayer_mins
    );

    // Retrieve today's status from D1
    const logs = await db.prepare(
      'SELECT prayer, status, responded_at, next_reminder_at FROM prayers_log WHERE user_id = ? AND date = ?'
    ).bind(session.user.id, todayStr).all();

    const logMap = new Map();
    if (logs.results) {
      for (const row of logs.results) {
        logMap.set(row.prayer, row);
      }
    }

    const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    for (const key of prayerKeys) {
      const logged = logMap.get(key);
      if (logged) {
        prayers[key].status = logged.status as any;
      }
    }

    return new Response(JSON.stringify({
      todayStr,
      city: session.settings.city,
      country: session.settings.country,
      method: session.settings.calculation_method,
      prayers
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const body = await context.request.json();
    const { prayer, status } = body; // status: 'prayed' | 'pending'

    if (!prayer) {
      return new Response(JSON.stringify({ error: 'حدد الصلاة' }), { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const logId = `prayer-${session.user.id}-${todayStr}-${prayer}`;

    await db.prepare(`
      INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, responded_at, next_reminder_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
      ON CONFLICT(user_id, date, prayer) DO UPDATE SET
        status = excluded.status,
        responded_at = CURRENT_TIMESTAMP,
        next_reminder_at = NULL
    `).bind(logId, session.user.id, todayStr, prayer, status || 'prayed').run();

    return new Response(JSON.stringify({ success: true, prayer, status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
