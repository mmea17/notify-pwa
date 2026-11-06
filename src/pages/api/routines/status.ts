import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { getLocalDateString } from '@/lib/prayer';
import { getCountryTimezone } from '@/lib/countries';

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const body = await context.request.json();
    const { routine_id, status } = body;

    if (!routine_id) {
      return new Response(JSON.stringify({ error: 'معرف الروتين مطلوب' }), { status: 400 });
    }

    const userSettings = await db.prepare('SELECT country FROM user_settings WHERE user_id = ?').bind(session.user.id).first();
    const userTz = getCountryTimezone((userSettings?.country as string) || 'مصر');
    const todayStr = getLocalDateString(new Date(), userTz);

    const logId = `rotlog-${session.user.id}-${todayStr}-${routine_id}`;

    if (status === 'completed') {
      await db.prepare(`
        INSERT INTO routines_log (id, user_id, routine_id, date, status, completed_at, next_reminder_at)
        VALUES (?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP, NULL)
        ON CONFLICT(user_id, routine_id, date) DO UPDATE SET
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          next_reminder_at = NULL
      `).bind(logId, session.user.id, routine_id, todayStr).run();

      return new Response(JSON.stringify({ success: true, status: 'completed' }), { status: 200 });
    } else {
      await db.prepare(`
        UPDATE routines_log
        SET status = 'pending',
            completed_at = NULL
        WHERE user_id = ? AND routine_id = ? AND date = ?
      `).bind(session.user.id, routine_id, todayStr).run();

      return new Response(JSON.stringify({ success: true, status: 'pending' }), { status: 200 });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }
};
