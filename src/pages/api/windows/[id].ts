import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

export const PUT: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const { id } = context.params;
    const body = await context.request.json();
    const { is_active, name, start_time, end_time, mode, fixed_time, interval_mins } = body;

    await db.prepare(`
      UPDATE time_windows
      SET is_active = COALESCE(?, is_active),
          name = COALESCE(?, name),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          mode = COALESCE(?, mode),
          fixed_time = COALESCE(?, fixed_time),
          interval_mins = COALESCE(?, interval_mins)
      WHERE id = ? AND user_id = ?
    `).bind(
      is_active !== undefined ? is_active : null,
      name ?? null,
      start_time ?? null,
      end_time ?? null,
      mode ?? null,
      fixed_time ?? null,
      interval_mins ?? null,
      id,
      session.user.id
    ).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const { id } = context.params;
    await db.batch([
      db.prepare('DELETE FROM message_pools WHERE window_id = ? AND user_id = ?').bind(id, session.user.id),
      db.prepare('DELETE FROM time_windows WHERE id = ? AND user_id = ?').bind(id, session.user.id)
    ]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }
};
