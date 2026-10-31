import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const sessionCookie = context.cookies.get('notify_session')?.value;
    if (sessionCookie) {
      await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionCookie).run();
    }
  } catch (e) {
    // ignore
  }

  context.cookies.delete('notify_session', { path: '/' });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
