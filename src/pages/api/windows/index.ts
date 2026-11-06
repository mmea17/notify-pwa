import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { getLocalDateString } from '@/lib/prayer';
import { getCountryTimezone } from '@/lib/countries';

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const userSettings = await db.prepare('SELECT country FROM user_settings WHERE user_id = ?').bind(session.user.id).first();
    const userTz = getCountryTimezone((userSettings?.country as string) || 'مصر');
    const todayStr = getLocalDateString(new Date(), userTz);

    const windows = await db.prepare(
      'SELECT * FROM time_windows WHERE user_id = ? ORDER BY start_time ASC'
    ).bind(session.user.id).all();

    const messages = await db.prepare(
      'SELECT * FROM message_pools WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(session.user.id).all();

    const logs = await db.prepare(
      'SELECT routine_id, status, completed_at, reminded_count FROM routines_log WHERE user_id = ? AND date = ?'
    ).bind(session.user.id, todayStr).all();

    const logMap = new Map();
    if (logs.results) {
      for (const l of logs.results) {
        logMap.set(l.routine_id, l);
      }
    }

    const result = (windows.results || []).map(win => {
      const winMsgs = (messages.results || []).filter(m => m.window_id === win.id);
      const todayLog = logMap.get(win.id);
      return {
        ...win,
        messages: winMsgs,
        todayStatus: todayLog ? todayLog.status : 'pending',
        todayCompletedAt: todayLog ? todayLog.completed_at : null
      };
    });

    return new Response(JSON.stringify({ windows: result, todayStr }), {
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
    const {
      name,
      routine_type,
      timing_type,
      start_prayer,
      start_offset_mins,
      end_prayer,
      end_offset_mins,
      end_fixed_time,
      start_time,
      end_time,
      mode,
      fixed_time,
      interval_mins,
      icon
    } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'يرجى إدخال اسم الروتين أو الفترة' }), { status: 400 });
    }

    const id = 'win-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    await db.prepare(`
      INSERT INTO time_windows (
        id, user_id, name, icon,
        routine_type, timing_type,
        start_prayer, start_offset_mins,
        end_prayer, end_offset_mins, end_fixed_time,
        start_time, end_time, mode, fixed_time, interval_mins
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      session.user.id,
      name,
      icon || 'Clock',
      routine_type || 'trackable',
      timing_type || 'prayer_relative',
      start_prayer || null,
      Number(start_offset_mins) || 0,
      end_prayer || null,
      Number(end_offset_mins) || 0,
      end_fixed_time || null,
      start_time || '09:00',
      end_time || '17:00',
      mode || 'interval',
      fixed_time || null,
      Number(interval_mins) || 30
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
