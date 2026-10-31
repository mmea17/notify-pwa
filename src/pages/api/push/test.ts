import type { APIRoute } from 'astro';
import { getDB, getEnv } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { sendPushToUser } from '@/lib/push';

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const env = getEnv(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const body = await context.request.json().catch(() => ({}));
    const testType = body.type || 'prayer'; // 'prayer' or 'focus'

    let payload;
    if (testType === 'prayer') {
      payload = {
        title: '🕌 حان موعد صلاة العصر',
        body: 'الله أكبر، حي على الصلاة! هل أديت الفريضة؟',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: {
          type: 'prayer_post',
          prayer: 'asr',
          prayerId: 'asr-' + new Date().toISOString().split('T')[0],
          url: '/'
        },
        actions: [
          { action: 'prayed', title: 'صليت ✅' },
          { action: 'snooze_15', title: 'لسة (ذكرني بعد ربع ساعة) ⏰' }
        ]
      };
    } else {
      payload = {
        title: '🎯 وقفة تركيز ووعي',
        body: 'هل أنت متوقف على هدفك الحالي؟ خذ رشفة ماء واطرد المشتتات.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: {
          type: 'window_message',
          url: '/'
        },
        actions: [
          { action: 'focused', title: 'مستمر بتركيز 💪' },
          { action: 'done', title: 'أنجزت الهدف 🎉' }
        ]
      };
    }

    const result = await sendPushToUser(db, env, session.user.id, payload);

    if (result.total === 0) {
      return new Response(JSON.stringify({
        error: 'لم يتم العثور على أجهزة مفعلة لهذا الحساب. يرجى الضغط على زر "تفعيل الإشعارات على هذا الجهاز" أولاً.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `تم إرسال إشعار تجريبي إلى ${result.sent} من أصل ${result.total} جهاز بنجاح!`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'فشل إرسال الإشعار التجريبي' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
