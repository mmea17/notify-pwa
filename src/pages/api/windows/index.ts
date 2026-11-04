import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const windows = await db.prepare(
      'SELECT * FROM time_windows WHERE user_id = ? ORDER BY start_time ASC'
    ).bind(session.user.id).all();

    const messages = await db.prepare(
      'SELECT * FROM message_pools WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(session.user.id).all();

    const result = (windows.results || []).map(win => {
      const winMsgs = (messages.results || []).filter(m => m.window_id === win.id);
      return {
        ...win,
        messages: winMsgs
      };
    });

    return new Response(JSON.stringify({ windows: result }), {
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
    const { name, start_time, end_time, mode, fixed_time, interval_mins, icon } = body;

    if (!name || !start_time || !end_time) {
      return new Response(JSON.stringify({ error: 'يرجى إدخال اسم الفترة وأوقات البداية والنهاية' }), { status: 400 });
    }

    const id = 'win-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    await db.prepare(`
      INSERT INTO time_windows (id, user_id, name, icon, start_time, end_time, mode, fixed_time, interval_mins)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      session.user.id,
      name,
      icon || 'Clock',
      start_time,
      end_time,
      mode || 'interval',
      fixed_time || null,
      Number(interval_mins) || 60
    ).run();

    return new Response(JSON.stringify({ success: true, id }), {
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
