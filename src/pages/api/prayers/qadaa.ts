import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

const PRAYER_NAMES: Record<string, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء'
};

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const rows = await db.prepare(`
      SELECT id, date, prayer, status, scheduled_time, responded_at, delay_reason
      FROM prayers_log
      WHERE user_id = ? AND status = 'qadaa'
      ORDER BY date DESC, responded_at DESC
    `).bind(session.user.id).all();

    const qadaaList = (rows.results || []).map((row: any) => ({
      ...row,
      prayerNameAr: PRAYER_NAMES[row.prayer] || row.prayer
    }));

    return new Response(JSON.stringify({ success: true, qadaaList }), {
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

export const PUT: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const body = await context.request.json();
    const { id, delay_reason } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'معرف السجل مطلوب' }), { status: 400 });
    }

    await db.prepare(`
      UPDATE prayers_log
      SET delay_reason = ?
      WHERE id = ? AND user_id = ?
    `).bind(delay_reason?.trim() || null, id, session.user.id).run();

    return new Response(JSON.stringify({ success: true, delayReason: delay_reason }), {
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

export const DELETE: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'معرف السجل مطلوب' }), { status: 400 });
    }

    await db.prepare(`
      UPDATE prayers_log
      SET status = 'pending', delay_reason = NULL, responded_at = NULL
      WHERE id = ? AND user_id = ?
    `).bind(id, session.user.id).run();

    return new Response(JSON.stringify({ success: true }), {
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
