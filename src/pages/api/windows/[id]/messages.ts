import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const { id: windowId } = context.params;
    const body = await context.request.json();
    const { message_text, category } = body;

    if (!message_text || !message_text.trim()) {
      return new Response(JSON.stringify({ error: 'يرجى كتابة نص الرسالة' }), { status: 400 });
    }

    const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    await db.prepare(`
      INSERT INTO message_pools (id, user_id, window_id, message_text, category)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      msgId,
      session.user.id,
      windowId,
      message_text.trim(),
      category || 'focus'
    ).run();

    return new Response(JSON.stringify({ success: true, id: msgId }), { status: 200 });
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

    const url = new URL(context.request.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
      return new Response(JSON.stringify({ error: 'معرف الرسالة مطلوب' }), { status: 400 });
    }

    await db.prepare('DELETE FROM message_pools WHERE id = ? AND user_id = ?').bind(messageId, session.user.id).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }
};
