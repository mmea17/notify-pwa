import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { calculateDailyPrayers, getLocalDateString } from '@/lib/prayer';
import { getCountryTimezone } from '@/lib/countries';

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const now = new Date();
    const userTimezone = getCountryTimezone(session.settings.country);
    const todayStr = getLocalDateString(now, userTimezone);

    // Support ?date=YYYY-MM-DD
    const url = new URL(context.request.url);
    const queryDate = url.searchParams.get('date');

    let targetDateStr = todayStr;
    let targetDate = now;

    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      targetDateStr = queryDate;
      if (queryDate === todayStr) {
        targetDate = now;
      } else {
        const [y, m, d] = queryDate.split('-').map(Number);
        targetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      }
    }

    // Prayers for selected date
    const prayers = calculateDailyPrayers(
      session.settings.latitude,
      session.settings.longitude,
      session.settings.calculation_method,
      session.settings.madhab,
      targetDate,
      session.settings.pre_prayer_mins,
      session.settings.post_prayer_mins,
      userTimezone
    );

    // If viewing a different day, always keep nextPrayer synced with today's real upcoming prayer
    if (targetDateStr !== todayStr) {
      const todayPrayers = calculateDailyPrayers(
        session.settings.latitude,
        session.settings.longitude,
        session.settings.calculation_method,
        session.settings.madhab,
        now,
        session.settings.pre_prayer_mins,
        session.settings.post_prayer_mins,
        userTimezone
      );
      prayers.nextPrayer = todayPrayers.nextPrayer;
    }

    // Retrieve selected date's status from D1 for this user
    const logs = await db.prepare(
      'SELECT prayer, status, responded_at, next_reminder_at, delay_reason FROM prayers_log WHERE user_id = ? AND date = ?'
    ).bind(session.user.id, targetDateStr).all();

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
        prayers[key].delayReason = logged.delay_reason || null;
      } else {
        prayers[key].status = 'pending';
        prayers[key].delayReason = null;
      }
    }

    return new Response(JSON.stringify({
      todayStr,
      selectedDateStr: targetDateStr,
      isToday: targetDateStr === todayStr,
      gregorianFormatted: prayers.gregorianFormatted,
      hijriFormatted: prayers.hijriFormatted,
      city: session.settings.city,
      country: session.settings.country,
      timezone: userTimezone,
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
    const { prayer, status, date: bodyDate, delay_reason } = body; // status: 'prayed' | 'qadaa' | 'pending'

    if (!prayer) {
      return new Response(JSON.stringify({ error: 'حدد الصلاة' }), { status: 400 });
    }

    const userTimezone = getCountryTimezone(session.settings.country);
    const todayStr = getLocalDateString(new Date(), userTimezone);
    const targetDateStr = (bodyDate && /^\d{4}-\d{2}-\d{2}$/.test(bodyDate)) ? bodyDate : todayStr;
    const logId = `prayer-${session.user.id}-${targetDateStr}-${prayer}`;
    const finalReason = status === 'qadaa' ? (delay_reason?.trim() || null) : null;

    // Only update this specific prayer on the selected date
    await db.prepare(`
      INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, responded_at, next_reminder_at, delay_reason)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, ?)
      ON CONFLICT(user_id, date, prayer) DO UPDATE SET
        status = excluded.status,
        responded_at = CURRENT_TIMESTAMP,
        next_reminder_at = NULL,
        delay_reason = excluded.delay_reason
    `).bind(logId, session.user.id, targetDateStr, prayer, status || 'prayed', finalReason).run();

    return new Response(JSON.stringify({
      success: true,
      date: targetDateStr,
      prayer,
      status: status || 'prayed',
      delayReason: finalReason
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
