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
    const nowIso = now.toISOString();

    // Get all users who have active push subscriptions
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

    const PRAYER_NAMES: Record<string, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء'
    };

    for (const user of activeUsers.results) {
      const userId = user.user_id as string;
      const preMins = Number(user.pre_prayer_mins ?? 15);
      const postMins = Number(user.post_prayer_mins ?? 15);
      const snoozeMins = Number(user.snooze_interval_mins ?? 15);
      const userTz = getCountryTimezone((user.country as string) || 'مصر');

      // Local date in user's timezone
      const userDateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const todayStr = userDateFormatter.format(now);

      const userTimeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: userTz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const currentHHMM = userTimeFormatter.format(now);

      // ========================================================
      // 0. CALCULATE TODAY'S PRAYER TIMINGS
      // ========================================================
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

      // ========================================================
      // 1. CHECK ALL PENDING / UNANSWERED / SNOOZED REMINDERS
      // ========================================================
      // Any prayer that has not been confirmed ('prayed') whose reminder interval has arrived
      const pendingFollowUps = await db.prepare(`
        SELECT * FROM prayers_log
        WHERE user_id = ?
          AND status != 'prayed'
          AND next_reminder_at IS NOT NULL
          AND next_reminder_at <= ?
      `).bind(userId, nowIso).all();

      if (pendingFollowUps.results && pendingFollowUps.results.length > 0) {
        for (const row of pendingFollowUps.results) {
          try {
            const prayerKey = row.prayer as string;
            const prayerName = PRAYER_NAMES[prayerKey] || prayerKey;
            const logDate = row.date as string;

            // Check if the prayer window has expired
            let isExpired = false;
            if (logDate < todayStr) {
              // Prior day: only Isha can continue past midnight until today's Fajr
              if (prayerKey !== 'isha' || nowTime >= dailyPrayers.fajr.timestamp) {
                isExpired = true;
              }
            } else if (logDate === todayStr) {
              if (prayerKey === 'fajr' && nowTime >= dailyPrayers.dhuhr.timestamp) {
                isExpired = true;
              } else if (prayerKey === 'dhuhr' && nowTime >= dailyPrayers.asr.timestamp) {
                isExpired = true;
              } else if (prayerKey === 'asr' && nowTime >= dailyPrayers.maghrib.timestamp) {
                isExpired = true;
              } else if (prayerKey === 'maghrib' && nowTime >= dailyPrayers.isha.timestamp) {
                isExpired = true;
              }
              // Today's Isha stays active throughout the night until tomorrow's Fajr
            } else {
              continue;
            }

            if (isExpired) {
              await db.prepare(`
                UPDATE prayers_log
                SET next_reminder_at = NULL
                WHERE id = ?
              `).bind(row.id).run();
              continue;
            }

            // Not expired: send follow-up reminder
            const nextReminder = new Date(nowTime + snoozeMins * 60 * 1000).toISOString();
            const currentSnoozeCount = Number(row.snooze_count ?? 0) + 1;

            let followUpBody = `مرت ${snoozeMins} دقيقة منذ التذكير السابق.. لا تدع الصلاة تفوتك! هل صليت الآن؟`;
            try {
              const customMsg = await db.prepare(
                'SELECT message_text FROM prayer_messages WHERE user_id = ? AND prayer = ? AND timing = "post" ORDER BY RANDOM() LIMIT 1'
              ).bind(userId, prayerKey).first();
              if (customMsg && customMsg.message_text) {
                followUpBody = customMsg.message_text as string;
              }
            } catch (e) {}

            await sendPushToUser(db, env, userId, {
              title: `⏰ تذكير متابعة: صلاة ${prayerName}`,
              body: followUpBody,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `prayer-${prayerKey}`,
              data: {
                type: 'prayer_snooze',
                prayer: prayerKey,
                prayerId: row.id,
                userId: userId,
                url: '/'
              },
              actions: [
                { action: 'prayed', title: 'صليت ✅' },
                { action: 'snooze_15', title: 'لسة (ذكرني بعد ربع ساعة) ⏰' }
              ]
            });

            await db.prepare(`
              UPDATE prayers_log
              SET snooze_count = ?,
                  reminded_post = 1,
                  next_reminder_at = ?
              WHERE id = ?
            `).bind(currentSnoozeCount, nextReminder, row.id).run();

            notificationsDispatched++;
            dispatchDetails.push({ user: user.name, type: 'prayer_snooze', prayer: prayerKey });
          } catch (rowErr) {
            console.error('Error processing follow-up row:', row.id, rowErr);
          }
        }
      }

      // ========================================================
      // 2. CHECK TODAY'S PRAYER TIMINGS (PRE-WARNING, EXACT AZAN & FALLBACK POST)
      // ========================================================
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
        const postCheckWindowEnd = postCheckTimestamp + 60 * 60 * 1000; // 1-hour window

        // A) Pre-Prayer Reminder (e.g. 15 mins before Azan)
        if (nowTime >= preWarningTimestamp && nowTime < prayerTimestamp) {
          const remindedPre = log ? Number(log.reminded_pre ?? 0) : 0;
          if (!remindedPre) {
            let preBody = `باقي حوالي ${preMins} دقيقة على موعد أذان ${pInfo.nameAr} (${pInfo.timeFormatted}). استعد وتوضأ.`;
            try {
              const customMsg = await db.prepare(
                'SELECT message_text FROM prayer_messages WHERE user_id = ? AND prayer = ? AND timing = "pre" ORDER BY RANDOM() LIMIT 1'
              ).bind(userId, pKey).first();
              if (customMsg && customMsg.message_text) {
                preBody = customMsg.message_text as string;
              }
            } catch (e) {}

            await sendPushToUser(db, env, userId, {
              title: `🕌 اقتربت صلاة ${pInfo.nameAr}`,
              body: preBody,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `prayer-${pKey}`,
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

        // B) Exact Azan Notification (at prayer timestamp!)
        if (nowTime >= prayerTimestamp && nowTime < prayerTimestamp + 15 * 60 * 1000) {
          const remindedAzan = log ? Number(log.reminded_azan ?? 0) : 0;
          const status = log ? (log.status as string) : 'pending';

          if (!remindedAzan && status !== 'prayed') {
            let azanBody = `الله أكبر.. حان الآن موعد أذان صلاة ${pInfo.nameAr} (${pInfo.timeFormatted}). حيّ على الصلاة.`;
            try {
              const customMsg = await db.prepare(
                'SELECT message_text FROM prayer_messages WHERE user_id = ? AND prayer = ? AND timing = "azan" ORDER BY RANDOM() LIMIT 1'
              ).bind(userId, pKey).first();
              if (customMsg && customMsg.message_text) {
                azanBody = customMsg.message_text as string;
              }
            } catch (e) {}

            await sendPushToUser(db, env, userId, {
              title: `🕌 حان الآن موعد أذان صلاة ${pInfo.nameAr}`,
              body: azanBody,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `prayer-${pKey}`,
              data: {
                type: 'prayer_azan',
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

            // Schedule the first follow-up reminder after snoozeMins (15 minutes)
            const nextReminder = new Date(nowTime + snoozeMins * 60 * 1000).toISOString();
            await db.prepare(`
              INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, reminded_azan, next_reminder_at)
              VALUES (?, ?, ?, ?, 'pending', ?, 1, ?)
              ON CONFLICT(user_id, date, prayer) DO UPDATE SET reminded_azan = 1, next_reminder_at = ?
            `).bind(logId, userId, todayStr, pKey, pInfo.time, nextReminder, nextReminder).run();

            notificationsDispatched++;
            dispatchDetails.push({ user: user.name, type: 'prayer_azan', prayer: pKey });
          }
        }

        // C) Fallback Post-Prayer Check (if neither Azan nor Post was fired and 15 mins passed)
        if (nowTime >= postCheckTimestamp && nowTime <= postCheckWindowEnd) {
          const remindedPost = log ? Number(log.reminded_post ?? 0) : 0;
          const remindedAzan = log ? Number(log.reminded_azan ?? 0) : 0;
          const status = log ? (log.status as string) : 'pending';

          if (!remindedPost && !remindedAzan && status !== 'prayed') {
            let postBody = `حان موعد صلاة ${pInfo.nameAr} (${pInfo.timeFormatted}). هل أديت الفريضة؟`;
            try {
              const customMsg = await db.prepare(
                'SELECT message_text FROM prayer_messages WHERE user_id = ? AND prayer = ? AND timing = "post" ORDER BY RANDOM() LIMIT 1'
              ).bind(userId, pKey).first();
              if (customMsg && customMsg.message_text) {
                postBody = customMsg.message_text as string;
              }
            } catch (e) {}

            await sendPushToUser(db, env, userId, {
              title: `🕌 حان موعد صلاة ${pInfo.nameAr}`,
              body: postBody,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `prayer-${pKey}`,
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

            const nextReminder = new Date(nowTime + snoozeMins * 60 * 1000).toISOString();
            await db.prepare(`
              INSERT INTO prayers_log (id, user_id, date, prayer, status, scheduled_time, reminded_post, next_reminder_at)
              VALUES (?, ?, ?, ?, 'pending', ?, 1, ?)
              ON CONFLICT(user_id, date, prayer) DO UPDATE SET reminded_post = 1, next_reminder_at = ?
            `).bind(logId, userId, todayStr, pKey, pInfo.time, nextReminder, nextReminder).run();

            notificationsDispatched++;
            dispatchDetails.push({ user: user.name, type: 'prayer_post', prayer: pKey });
          }
        }
      }

      // ========================================================
      // 3. CHECK DAILY TIME WINDOWS & ROUTINES (ATHKAR / FOCUS)
      // ========================================================
      const userWindows = await db.prepare(
        'SELECT * FROM time_windows WHERE user_id = ? AND is_active = 1'
      ).bind(userId).all();

      if (userWindows.results && userWindows.results.length > 0) {
        // Helper to get prayer timestamp for relative timing
        const getPrayerTimestamp = (pName?: string | null): number | null => {
          if (!pName) return null;
          if (pName === 'sunrise') return dailyPrayers.sunrise?.timestamp || null;
          const p = (dailyPrayers as any)[pName];
          return p ? p.timestamp : null;
        };

        for (const win of userWindows.results) {
          try {
            const isPrayerRelative = win.timing_type === 'prayer_relative' && !!win.start_prayer;
            let isInside = false;

            if (isPrayerRelative) {
              const startPrayerTs = getPrayerTimestamp(win.start_prayer as string);
              if (startPrayerTs) {
                const windowStartTs = startPrayerTs + Number(win.start_offset_mins || 0) * 60 * 1000;
                let windowEndTs: number | null = null;

                if (win.end_prayer) {
                  const endPrayerTs = getPrayerTimestamp(win.end_prayer as string);
                  if (endPrayerTs) {
                    windowEndTs = endPrayerTs + Number(win.end_offset_mins || 0) * 60 * 1000;
                  }
                }

                if (windowEndTs) {
                  isInside = nowTime >= windowStartTs && nowTime <= windowEndTs;
                } else if (win.end_fixed_time) {
                  const endFixedTime = (win.end_fixed_time as string).trim();
                  isInside = nowTime >= windowStartTs && currentHHMM <= endFixedTime;
                } else {
                  // Fallback: window ends at Isha
                  const ishaTs = dailyPrayers.isha?.timestamp;
                  isInside = nowTime >= windowStartTs && (!ishaTs || nowTime <= ishaTs);
                }
              }
            } else {
              // Fixed clock hours
              const startTime = (win.start_time as string || '09:00').trim();
              const endTime = (win.end_time as string || '17:00').trim();

              if (startTime <= endTime) {
                isInside = currentHHMM >= startTime && currentHHMM <= endTime;
              } else {
                isInside = currentHHMM >= startTime || currentHHMM <= endTime;
              }
            }

            if (!isInside) {
              continue;
            }

            const poolMessages = await db.prepare(
              'SELECT * FROM message_pools WHERE window_id = ? AND user_id = ?'
            ).bind(win.id, userId).all();

            const isTrackable = (win.routine_type as string) !== 'continuous';
            let shouldSend = false;
            let routineLog: any = null;

            if (isTrackable) {
              // Check today's completion status in routines_log
              routineLog = await db.prepare(
                'SELECT * FROM routines_log WHERE user_id = ? AND routine_id = ? AND date = ?'
              ).bind(userId, win.id, todayStr).first();

              // If already completed today, STOP sending completely!
              if (routineLog && routineLog.status === 'completed') {
                continue;
              }

              // If snoozed, check if snooze window has elapsed
              if (routineLog && routineLog.status === 'snoozed' && routineLog.next_reminder_at) {
                if (nowIso < (routineLog.next_reminder_at as string)) {
                  continue; // still snoozing
                }
              }

              // Check interval
              const interval = Math.max(5, Number(win.interval_mins || 30));
              const lastRemindedStr = routineLog?.last_reminded_at || (win.last_sent_at as string);

              if (!lastRemindedStr) {
                shouldSend = true;
              } else {
                let parsedTime = Date.parse(lastRemindedStr);
                if (isNaN(parsedTime) || !lastRemindedStr.includes('T')) {
                  parsedTime = Date.parse(lastRemindedStr.replace(' ', 'T') + 'Z');
                }
                if (isNaN(parsedTime)) {
                  parsedTime = new Date(lastRemindedStr).getTime();
                }

                const elapsedMs = nowTime - parsedTime;
                const intervalMs = (interval * 60 - 30) * 1000;
                if (elapsedMs >= intervalMs) {
                  shouldSend = true;
                }
              }
            } else {
              // Continuous awareness / focus reminders
              const interval = Math.max(5, Number(win.interval_mins || 60));
              const lastSentStr = (win.last_sent_at as string);

              if (!lastSentStr) {
                shouldSend = true;
              } else {
                let parsedTime = Date.parse(lastSentStr);
                if (isNaN(parsedTime) || !lastSentStr.includes('T')) {
                  parsedTime = Date.parse(lastSentStr.replace(' ', 'T') + 'Z');
                }
                if (isNaN(parsedTime)) {
                  parsedTime = new Date(lastSentStr).getTime();
                }

                const elapsedMs = nowTime - parsedTime;
                const intervalMs = (interval * 60 - 30) * 1000;
                if (elapsedMs >= intervalMs) {
                  shouldSend = true;
                }
              }
            }

            if (shouldSend) {
              const msgs = poolMessages.results || [];
              let chosenMsgText = isTrackable
                ? `حان موعد ${win.name} 📿.. تذكّر قراءتها لتنال الأجر والسكينة والحفظ.`
                : `تذكير ${win.name}: حان وقت ذكر الله وتجديد النية ومواصلة التركيز في أهدافك ✨`;
              let chosenMsgId: string | null = null;

              if (msgs.length > 0) {
                if (msgs.length === 1) {
                  chosenMsgText = msgs[0].message_text as string;
                  chosenMsgId = msgs[0].id as string;
                } else {
                  const sorted = [...msgs].sort((a: any, b: any) => {
                    const tA = a.last_sent_at ? new Date(a.last_sent_at).getTime() : 0;
                    const tB = b.last_sent_at ? new Date(b.last_sent_at).getTime() : 0;
                    return tA - tB;
                  });
                  const candidates = sorted.slice(0, msgs.length - 1);
                  const randIdx = Math.floor(Math.random() * candidates.length);
                  chosenMsgText = candidates[randIdx].message_text as string;
                  chosenMsgId = candidates[randIdx].id as string;
                }
              }

              const nowIsoStr = new Date().toISOString();
              const intervalMins = Number(win.interval_mins || (isTrackable ? 30 : 60));
              const nextReminderIso = new Date(nowTime + intervalMins * 60 * 1000).toISOString();

              const updateBatch: any[] = [
                db.prepare('UPDATE time_windows SET last_sent_at = ? WHERE id = ?').bind(nowIsoStr, win.id)
              ];
              if (chosenMsgId) {
                updateBatch.push(
                  db.prepare('UPDATE message_pools SET last_sent_at = ? WHERE id = ?').bind(nowIsoStr, chosenMsgId)
                );
              }

              if (isTrackable) {
                const rotLogId = routineLog?.id || `rotlog-${userId}-${todayStr}-${win.id}`;
                updateBatch.push(
                  db.prepare(`
                    INSERT INTO routines_log (id, user_id, routine_id, date, status, reminded_count, last_reminded_at, next_reminder_at)
                    VALUES (?, ?, ?, ?, 'pending', 1, ?, ?)
                    ON CONFLICT(user_id, routine_id, date) DO UPDATE SET
                      reminded_count = routines_log.reminded_count + 1,
                      last_reminded_at = ?,
                      next_reminder_at = ?
                  `).bind(rotLogId, userId, win.id, todayStr, nowIsoStr, nextReminderIso, nowIsoStr, nextReminderIso)
                );
              }

              await db.batch(updateBatch);

              const pushPayload: any = {
                title: isTrackable ? `${win.name} 📿` : `${win.name} 🎯`,
                body: chosenMsgText,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: `window-${win.id}`,
                data: {
                  type: isTrackable ? 'routine_trackable' : 'window_message',
                  routineId: win.id,
                  routineName: win.name,
                  messageId: chosenMsgId || 'default',
                  url: '/#athkar'
                },
                actions: isTrackable
                  ? [
                      { action: 'routine_done', title: 'قرأت ✅' },
                      { action: 'routine_snooze', title: 'لسة (ذكرني بعد ربع ساعة) ⏰' }
                    ]
                  : [
                      { action: 'focused', title: 'مستمر بتركيز 💪' }
                    ]
              };

              await sendPushToUser(db, env, userId, pushPayload);

              notificationsDispatched++;
              dispatchDetails.push({ user: user.name, type: isTrackable ? 'routine_trackable' : 'window_message', window: win.name });
            }
          } catch (winErr) {
            console.error('Error processing time window/routine:', win.id, winErr);
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
