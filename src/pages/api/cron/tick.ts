import type { APIRoute } from 'astro';
import { getDB, getEnv } from '@/lib/db';
import { calculateDailyPrayers } from '@/lib/prayer';
import { sendPushToUser } from '@/lib/push';
import { getCountryTimezone } from '@/lib/countries';

export const GET: APIRoute = async (context) => {
  return handleCronTick(context);
};

export const POST: APIRoute = async (context) => {
  return handleCronTick(context);
};

async function handleCronTick(context: any) {
  try {
    const db = getDB(context);
    const env = getEnv(context);

    // Verify CRON_SECRET if set in environment
    const authHeader = context.request.headers.get('authorization');
    const secretQuery = new URL(context.request.url).searchParams.get('secret');
    if (env.CRON_SECRET) {
      const matchHeader = authHeader === `Bearer ${env.CRON_SECRET}`;
      const matchQuery = secretQuery === env.CRON_SECRET;
      if (!matchHeader && !matchQuery) {
        return new Response(JSON.stringify({ error: 'غير مصرح للجدولة' }), { status: 401 });
      }
    }

    const now = new Date();
    const nowTime = now.getTime();

    // Get all users who have active subscriptions
    const activeUsers = await db.prepare(`
      SELECT DISTINCT u.id as user_id, u.name,
             st.country, st.city, st.latitude, st.longitude,
             st.calculation_method, st.madhab, st.pre_prayer_mins,
             st.post_prayer_mins, st.snooze_interval_mins
      FROM users u
      JOIN subscriptions sub ON sub.user_id = u.id
      JOIN user_settings st ON st.user_id = u.id
    `).all();

    if (!activeUsers.results || activeUsers.results.length === 0) {
      return new Response(JSON.stringify({ message: 'لا يوجد مستخدمين لديهم أجهزة نشطة حالياً' }), { status: 200 });
    }

    let notificationsDispatched = 0;
    const dispatchDetails: any[] = [];

    for (const user of activeUsers.results) {
      const userId = user.user_id as string;
      const preMins = Number(user.pre_prayer_mins ?? 15);
      const postMins = Number(user.post_prayer_mins ?? 15);
      const userTz = getCountryTimezone((user.country as string) || 'مصر');

      // Accurate local date and local HH:MM in user's timezone!
      const userDateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const todayStr = userDateFormatter.format(now); // e.g. YYYY-MM-DD in local time

      const userTimeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: userTz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const currentHHMM = userTimeFormatter.format(now); // e.g. "17:35" in local time

      // 1. Calculate today's prayers for user with user's timezone
      const dailyPrayers = calculateDailyPrayers(
        Number(user.latitude ?? 30.0444),
        Number(user.longitude ?? 31.2357),
        (user.calculation_method as string) || 'Egyptian',
        (user.madhab as string) || 'Shafi',
        now,
        preMins,
        postMins,
        userTz
      );

      // Fetch user's prayer logs for today
      const logsResult = await db.prepare(
        'SELECT * FROM prayers_log WHERE user_id = ? AND date = ?'
      ).bind(userId, todayStr).all();

      const logMap = new Map();
      if (logsResult.results) {
        for (const row of logsResult.results) {
          logMap.set(row.prayer, row);
        }
      }

      const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

      for (const pKey of prayerKeys) {
        const pInfo = dailyPrayers[pKey];
        const log = logMap.get(pKey);
        const logId = `prayer-${userId}-${todayStr}-${pKey}`;

        // If user already marked as prayed, skip all notifications for this prayer
        if (log && log.status === 'prayed') {
          continue;
        }

        const prayerTimestamp = pInfo.timestamp;
        const preWarningTimestamp = prayerTimestamp - preMins * 60 * 1000;
        const postCheckTimestamp = prayerTimestamp + postMins * 60 * 1000;

        // A) Pre-Prayer Reminder (e.g. 15 mins before Azan)
        if (nowTime >= preWarningTimestamp && nowTime < prayerTimestamp) {
          const remindedPre = log ? Number(log.reminded_pre) : 0;
          if (!remindedPre) {
            await sendPushToUser(db, env, userId, {
              title: `🕌 اقتربت صلاة ${pInfo.nameAr}`,
              body: `باقي حوالي ${preMins} دقيقة على موعد أذان ${pInfo.nameAr} (${pInfo.timeFormatted}). استعد وتوضأ.`,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              data: {
                type: 'prayer_pre',
                prayer: pKey,
                url: '/'
              }
            });

            await db.prepare(`
              INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, reminded_pre)
              VALUES (?, ?, ?, ?, 'pending', ?, 1)
              ON CONFLICT(user_id, date, prayer) DO UPDATE SET reminded_pre = 1
            `).bind(logId, userId, todayStr, pKey, pInfo.time).run();

            notificationsDispatched++;
            dispatchDetails.push({ user: user.name, type: 'prayer_pre', prayer: pKey });
          }
        }

        // B) Post-Prayer Check (e.g. 15 mins after Azan)
        if (nowTime >= postCheckTimestamp) {
          const remindedPost = log ? Number(log.reminded_post) : 0;
          const status = log ? (log.status as string) : 'pending';

          // First post-prayer notification
          if (!remindedPost && status === 'pending') {
            await sendPushToUser(db, env, userId, {
              title: `🕌 حان موعد صلاة ${pInfo.nameAr}`,
              body: `حان موعد صلاة ${pInfo.nameAr} (${pInfo.timeFormatted}). هل أديت الفريضة؟`,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              data: {
                type: 'prayer_post',
                prayer: pKey,
                prayerId: logId,
                userId: userId,
                url: '/'
              },
              actions: [
                { action: 'prayed', title: 'صليت ✅' },
                { action: 'snooze_15', title: 'لسة (ذكرني بعد ربع ساعة) ⏰' }
              ]
            });

            const nextReminder = new Date(nowTime + 15 * 60 * 1000).toISOString();
            await db.prepare(`
              INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, reminded_post, next_reminder_at)
              VALUES (?, ?, ?, ?, 'pending', ?, 1, ?)
              ON CONFLICT(user_id, date, prayer) DO UPDATE SET reminded_post = 1, next_reminder_at = ?
            `).bind(logId, userId, todayStr, pKey, pInfo.time, nextReminder, nextReminder).run();

            notificationsDispatched++;
            dispatchDetails.push({ user: user.name, type: 'prayer_post', prayer: pKey });
          } else if (status === 'snoozed' || (status === 'pending' && remindedPost)) {
            // Check if snooze time has elapsed (e.g., 15 mins later)
            if (log?.next_reminder_at) {
              const nextRemindTime = new Date(log.next_reminder_at as string).getTime();
              if (nowTime >= nextRemindTime) {
                // Send follow-up reminder
                await sendPushToUser(db, env, userId, {
                  title: `⏰ تذكير متابعة: صلاة ${pInfo.nameAr}`,
                  body: `مرت فترة منذ أذان ${pInfo.nameAr}.. لا تدع الصلاة تفوتك! هل صليت الآن؟`,
                  icon: '/icons/icon-192.png',
                  badge: '/icons/icon-192.png',
                  data: {
                    type: 'prayer_snooze',
                    prayer: pKey,
                    prayerId: logId,
                    userId: userId,
                    url: '/'
                  },
                  actions: [
                    { action: 'prayed', title: 'صليت ✅' },
                    { action: 'snooze_15', title: 'لسة (ذكرني بعد ربع ساعة) ⏰' }
                  ]
                });

                const nextReminder = new Date(nowTime + 15 * 60 * 1000).toISOString();
                await db.prepare(`
                  UPDATE prayers_log
                  SET snooze_count = snooze_count + 1,
                      next_reminder_at = ?
                  WHERE id = ?
                `).bind(nextReminder, logId).run();

                notificationsDispatched++;
                dispatchDetails.push({ user: user.name, type: 'prayer_snooze', prayer: pKey });
              }
            }
          }
        }
      }

      // 2. Check Daily Time Windows
      const userWindows = await db.prepare(
        'SELECT * FROM time_windows WHERE user_id = ? AND is_active = 1'
      ).bind(userId).all();

      if (userWindows.results && userWindows.results.length > 0) {
        for (const win of userWindows.results) {
          const startTime = (win.start_time as string).trim();
          const endTime = (win.end_time as string).trim();

          // Check if current time is inside window in local time
          let isInside = false;
          if (startTime <= endTime) {
            isInside = currentHHMM >= startTime && currentHHMM <= endTime;
          } else {
            // Over midnight window e.g. 22:00 to 02:00
            isInside = currentHHMM >= startTime || currentHHMM <= endTime;
          }

          if (isInside) {
            const poolMessages = await db.prepare(
              'SELECT * FROM message_pools WHERE window_id = ? AND user_id = ?'
            ).bind(win.id, userId).all();

            if (poolMessages.results && poolMessages.results.length > 0) {
              const mode = win.mode as string;
              let shouldSend = false;

              if (mode === 'fixed' && win.fixed_time === currentHHMM) {
                shouldSend = true;
              } else if (mode === 'interval') {
                const interval = Number(win.interval_mins ?? 60);
                const lastSentRow = await db.prepare(
                  'SELECT MAX(last_sent_at) as last_sent FROM message_pools WHERE window_id = ?'
                ).bind(win.id).first();
                if (!lastSentRow?.last_sent) {
                  shouldSend = true;
                } else {
                  const lastSentTime = new Date(lastSentRow.last_sent as string).getTime();
                  if (nowTime - lastSentTime >= interval * 60 * 1000) {
                    shouldSend = true;
                  }
                }
              } else if (mode === 'random') {
                // Check if already sent in this window today
                const lastSentRow = await db.prepare(
                  'SELECT MAX(last_sent_at) as last_sent FROM message_pools WHERE window_id = ?'
                ).bind(win.id).first();

                const hasSentToday = lastSentRow?.last_sent && (lastSentRow.last_sent as string).startsWith(todayStr);
                if (!hasSentToday) {
                  // In random mode: if inside the window, send once daily
                  shouldSend = true;
                }
              }

              if (shouldSend) {
                const randomIndex = Math.floor(Math.random() * poolMessages.results.length);
                const chosenMsg = poolMessages.results[randomIndex];

                await db.prepare('UPDATE message_pools SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?').bind(chosenMsg.id).run();

                await sendPushToUser(db, env, userId, {
                  title: `${win.name} 🎯`,
                  body: chosenMsg.message_text as string,
                  icon: '/icons/icon-192.png',
                  badge: '/icons/icon-192.png',
                  data: {
                    type: 'window_message',
                    windowId: win.id,
                    messageId: chosenMsg.id,
                    url: '/'
                  },
                  actions: [
                    { action: 'focused', title: 'مستمر بتركيز 💪' },
                    { action: 'done', title: 'تم وأنجزت 🎉' }
                  ]
                });

                notificationsDispatched++;
                dispatchDetails.push({ user: user.name, type: 'window_message', window: win.name });
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      activeUsersCount: activeUsers.results.length,
      notificationsDispatched,
      dispatchDetails
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Cron tick error:', error);
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
