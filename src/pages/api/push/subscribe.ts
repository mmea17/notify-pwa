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

    const body = await context.request.json();
    const { subscription, deviceName } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return new Response(JSON.stringify({ error: 'بيانات الاشتراك غير مكتملة' }), { status: 400 });
    }

    const subId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const userAgent = context.request.headers.get('user-agent') || 'Unknown Device';

    // Insert or update device subscription
    await db.prepare(`
      INSERT INTO subscriptions (id, user_id, endpoint, p256dh, auth, device_name, user_agent, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        device_name = COALESCE(excluded.device_name, subscriptions.device_name),
        user_agent = excluded.user_agent,
        last_active_at = CURRENT_TIMESTAMP
    `).bind(
      subId,
      session.user.id,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      deviceName || 'جهاز متصل',
      userAgent
    ).run();

    return new Response(JSON.stringify({ success: true, message: 'تم تفعيل الإشعارات لهذا الجهاز بنجاح' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'فشل حفظ الاشتراك' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
