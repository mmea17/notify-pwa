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

    const { id: windowId } = context.params;

    const window = await db.prepare('SELECT * FROM time_windows WHERE id = ? AND user_id = ?').bind(windowId, session.user.id).first();
    if (!window) {
      return new Response(JSON.stringify({ error: 'الفترة غير موجودة' }), { status: 404 });
    }

    const messages = await db.prepare('SELECT * FROM message_pools WHERE window_id = ? AND user_id = ?').bind(windowId, session.user.id).all();
    if (!messages.results || messages.results.length === 0) {
      return new Response(JSON.stringify({ error: 'لا توجد رسائل مضافة في هذه الفترة بعد' }), { status: 400 });
    }

    // Pick random message
    const randomIndex = Math.floor(Math.random() * messages.results.length);
    const chosenMsg = messages.results[randomIndex];

    // Update last_sent_at
    await db.prepare('UPDATE message_pools SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?').bind(chosenMsg.id).run();

    const isHabit = window.routine_type === 'habit';
    const isAthkar = window.routine_type === 'athkar' || window.routine_type === 'trackable';
    const isTrackable = window.routine_type !== 'continuous';

    const payload = {
      title: isHabit ? `${window.name} 🎯` : (isAthkar ? `${window.name} 📿` : `${window.name} ⏱️`),
      body: chosenMsg.message_text as string,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        type: isTrackable ? 'routine_trackable' : 'window_message',
        routineType: isHabit ? 'habit' : (isAthkar ? 'athkar' : 'continuous'),
        routineId: window.id,
        routineName: window.name,
        messageId: chosenMsg.id,
        url: '/#athkar'
      },
      actions: isHabit
        ? [
            { action: 'routine_done', title: 'أنجزت ✅' },
            { action: 'routine_snooze', title: 'لسة (ذكرني بعد ربع ساعة) ⏰' }
          ]
        : isAthkar
        ? [
            { action: 'routine_done', title: 'قرأت ✅' },
            { action: 'routine_snooze', title: 'لسة (ذكرني بعد ربع ساعة) ⏰' }
          ]
        : [
            { action: 'focused', title: 'مستمر بتركيز 💪' }
          ]
    };

    const result = await sendPushToUser(db, env, session.user.id, payload);

    return new Response(JSON.stringify({
      success: true,
      messageText: chosenMsg.message_text,
      sentCount: result.sent,
      devicesTotal: result.total
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }
};
