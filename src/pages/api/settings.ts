import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

export const GET: APIRoute = async (context) => {
  const db = getDB(context);
  const session = await getCurrentSession(context, db);
  if (!session) {
    return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
  }

  return new Response(JSON.stringify({ settings: session.settings }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const body = await context.request.json();
    const {
      country,
      city,
      latitude,
      longitude,
      calculation_method,
      madhab,
      pre_prayer_mins,
      post_prayer_mins,
      snooze_interval_mins,
      sound_enabled
    } = body;

    await db.prepare(`
      INSERT INTO user_settings (
        user_id, country, city, latitude, longitude,
        calculation_method, madhab, pre_prayer_mins, post_prayer_mins,
        snooze_interval_mins, sound_enabled, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        country = COALESCE(excluded.country, user_settings.country),
        city = COALESCE(excluded.city, user_settings.city),
        latitude = COALESCE(excluded.latitude, user_settings.latitude),
        longitude = COALESCE(excluded.longitude, user_settings.longitude),
        calculation_method = COALESCE(excluded.calculation_method, user_settings.calculation_method),
        madhab = COALESCE(excluded.madhab, user_settings.madhab),
        pre_prayer_mins = COALESCE(excluded.pre_prayer_mins, user_settings.pre_prayer_mins),
        post_prayer_mins = COALESCE(excluded.post_prayer_mins, user_settings.post_prayer_mins),
        snooze_interval_mins = COALESCE(excluded.snooze_interval_mins, user_settings.snooze_interval_mins),
        sound_enabled = COALESCE(excluded.sound_enabled, user_settings.sound_enabled),
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      session.user.id,
      country ?? session.settings.country,
      city ?? session.settings.city,
      latitude ?? session.settings.latitude,
      longitude ?? session.settings.longitude,
      calculation_method ?? session.settings.calculation_method,
      madhab ?? session.settings.madhab,
      pre_prayer_mins ?? session.settings.pre_prayer_mins,
      post_prayer_mins ?? session.settings.post_prayer_mins,
      snooze_interval_mins ?? session.settings.snooze_interval_mins,
      sound_enabled ?? session.settings.sound_enabled
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'فشل تحديث الإعدادات' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
