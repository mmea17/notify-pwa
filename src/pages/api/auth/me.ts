import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);

    if (!session) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get count of registered devices for this user
    const devices = await db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ?').bind(session.user.id).first();

    return new Response(JSON.stringify({
      user: session.user,
      settings: session.settings,
      devicesCount: devices?.count || 0
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
