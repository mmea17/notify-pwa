import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

async function ensureTable(db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS prayer_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prayer TEXT NOT NULL,
        timing TEXT NOT NULL,
        message_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_prayer_messages_user_lookup 
      ON prayer_messages(user_id, prayer, timing)
    `).run();
  } catch (e) {
    // Non-critical if table already exists
  }
}

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    await ensureTable(db);

    const result = await db.prepare(
      'SELECT id, prayer, timing, message_text, created_at FROM prayer_messages WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(session.user.id).all();

    return new Response(JSON.stringify({ messages: result.results || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error fetching prayer messages:', error);
    return new Response(JSON.stringify({ error: error?.message || 'فشل جلب الرسائل' }), {
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

    await ensureTable(db);

    const body = await context.request.json();
    const { message_text, prayers, timings } = body;

    const trimmedText = (message_text || '').trim();
    if (!trimmedText) {
      return new Response(JSON.stringify({ error: 'يرجى كتابة نص الجملة' }), { status: 400 });
    }

    if (!Array.isArray(prayers) || prayers.length === 0) {
      return new Response(JSON.stringify({ error: 'يرجى اختيار صلاة واحدة على الأقل' }), { status: 400 });
    }

    if (!Array.isArray(timings) || timings.length === 0) {
      return new Response(JSON.stringify({ error: 'يرجى اختيار فترة تذكير واحدة على الأقل (قبل، نفسها، بعد)' }), { status: 400 });
    }

    const statements: any[] = [];
    const validPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const validTimings = ['pre', 'azan', 'post'];

    for (const prayer of prayers) {
      if (!validPrayers.includes(prayer)) continue;
      for (const timing of timings) {
        if (!validTimings.includes(timing)) continue;
        const id = `pmsg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        statements.push(
          db.prepare(`
            INSERT INTO prayer_messages (id, user_id, prayer, timing, message_text)
            VALUES (?, ?, ?, ?, ?)
          `).bind(id, session.user.id, prayer, timing, trimmedText)
        );
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return new Response(JSON.stringify({ success: true, count: statements.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error creating prayer message:', error);
    return new Response(JSON.stringify({ error: error?.message || 'فشل حفظ الرسالة' }), {
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
    let id = url.searchParams.get('id');

    if (!id) {
      try {
        const body = await context.request.json();
        id = body?.id;
      } catch (e) {}
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'معرف الرسالة مطلوب' }), { status: 400 });
    }

    await db.prepare(
      'DELETE FROM prayer_messages WHERE id = ? AND user_id = ?'
    ).bind(id, session.user.id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error deleting prayer message:', error);
    return new Response(JSON.stringify({ error: error?.message || 'فشل حذف الرسالة' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
