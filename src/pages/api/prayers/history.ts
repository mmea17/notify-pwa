import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { calculateDailyPrayers, getLocalDateString, getLocalDateInTimezone } from '@/lib/prayer';
import { getCountryTimezone } from '@/lib/countries';

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const userId = session.user.id;
    const settings = session.settings;
    const userTimezone = getCountryTimezone(settings.country);

    const now = new Date();
    const nowTime = now.getTime();
    const todayStr = getLocalDateString(now, userTimezone);

    const url = new URL(context.request.url);
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month'); // 1-12

    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() + 1; // 1-12

    if (yearParam && /^\d{4}$/.test(yearParam)) {
      targetYear = parseInt(yearParam, 10);
    }
    if (monthParam && /^\d{1,2}$/.test(monthParam)) {
      targetMonth = Math.min(12, Math.max(1, parseInt(monthParam, 10)));
    }

    // Number of days in target month
    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const monthStartStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const monthEndStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // 1. Fetch user's prayer logs for this month
    const monthLogsResult = await db.prepare(`
      SELECT date, prayer, status, scheduled_time, responded_at, delay_reason
      FROM prayers_log
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).bind(userId, monthStartStr, monthEndStr).all();

    const monthLogMap = new Map<string, any>();
    if (monthLogsResult.results) {
      for (const row of monthLogsResult.results) {
        monthLogMap.set(`${row.date}-${row.prayer}`, row);
      }
    }

    // 2. Fetch all-time prayer logs for calculating streaks
    const allLogsResult = await db.prepare(`
      SELECT date, prayer, status, scheduled_time
      FROM prayers_log
      WHERE user_id = ?
      ORDER BY date DESC
    `).bind(userId).all();

    const allLogMap = new Map<string, string>();
    if (allLogsResult.results) {
      for (const row of allLogsResult.results) {
        allLogMap.set(`${row.date}-${row.prayer}`, row.status as string);
      }
    }

    // 3. Build days array for the requested month
    const days = [];
    const firstDayUtc = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    // Saturday-first index (0 = Saturday, 1 = Sunday, ..., 6 = Friday)
    const firstDayOfWeekIndex = (firstDayUtc.getUTCDay() + 1) % 7;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayDate = new Date(Date.UTC(targetYear, targetMonth - 1, dayNum, 12, 0, 0));

      const dailyPrayers = calculateDailyPrayers(
        settings.latitude,
        settings.longitude,
        settings.calculation_method,
        settings.madhab,
        dayDate,
        settings.pre_prayer_mins,
        settings.post_prayer_mins,
        userTimezone
      );

      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;

      let prayedCount = 0;
      let passedCount = 0;
      const prayersInfo: Record<string, any> = {};

      for (const pKey of PRAYER_KEYS) {
        const pInfo = dailyPrayers[pKey];
        const log = monthLogMap.get(`${dateStr}-${pKey}`);
        const prayerTimestamp = pInfo.timestamp;
        const hasPassed = isPast || (isToday && prayerTimestamp <= nowTime);

        if (hasPassed) {
          passedCount++;
        }

        let computedStatus: 'prayed' | 'qadaa' | 'missed' | 'pending' = 'pending';
        if (log && log.status === 'prayed') {
          computedStatus = 'prayed';
          prayedCount++;
        } else if (log && log.status === 'qadaa') {
          computedStatus = 'qadaa';
          prayedCount++;
        } else if (hasPassed) {
          computedStatus = 'missed';
        } else {
          computedStatus = 'pending';
        }

        prayersInfo[pKey] = {
          key: pKey,
          nameAr: pInfo.nameAr,
          time: pInfo.time,
          timeFormatted: pInfo.timeFormatted,
          status: computedStatus,
          delayReason: log?.delay_reason || null,
          respondedAt: log?.responded_at || null
        };
      }

      const hasQadaa = Object.values(prayersInfo).some((p: any) => p.status === 'qadaa');

      days.push({
        date: dateStr,
        dayNumber: dayNum,
        gregorianFormatted: dailyPrayers.gregorianFormatted,
        hijriFormatted: dailyPrayers.hijriFormatted,
        isToday,
        isPast,
        isFuture,
        prayedCount,
        passedCount,
        totalPrayers: 5,
        isComplete: prayedCount === 5,
        hasMissed: passedCount > prayedCount,
        hasQadaa,
        prayers: prayersInfo
      });
    }

    // 4. Calculate Current Global Streak & Per-Prayer Streaks
    // We trace backwards from today's prayers up to 60 days in the past
    let currentGlobalStreak = 0;
    let globalStreakBroken = false;

    // Per-prayer streaks
    const prayerStreaks: Record<string, number> = {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0
    };
    const prayerStreakBroken: Record<string, boolean> = {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false
    };

    // Calculate prayer times for past days to verify whether each prayer passed and was prayed
    for (let i = 0; i < 90; i++) {
      const pastDateObj = new Date(nowTime - i * 24 * 60 * 60 * 1000);
      const pastDateStr = getLocalDateString(pastDateObj, userTimezone);
      const pastLocalDate = getLocalDateInTimezone(pastDateObj, userTimezone);

      const pastPrayers = calculateDailyPrayers(
        settings.latitude,
        settings.longitude,
        settings.calculation_method,
        settings.madhab,
        pastDateObj,
        settings.pre_prayer_mins,
        settings.post_prayer_mins,
        userTimezone
      );

      // Check prayers in reverse order: isha, maghrib, asr, dhuhr, fajr
      const revKeys = ['isha', 'maghrib', 'asr', 'dhuhr', 'fajr'] as const;

      for (const pKey of revKeys) {
        const pInfo = pastPrayers[pKey];
        const hasPassed = pastDateStr < todayStr || (pastDateStr === todayStr && pInfo.timestamp <= nowTime);

        // Global streak check (both on-time 'prayed' and 'qadaa' keep the streak alive!)
        if (hasPassed && !globalStreakBroken) {
          const status = allLogMap.get(`${pastDateStr}-${pKey}`);
          if (status === 'prayed' || status === 'qadaa') {
            currentGlobalStreak++;
          } else {
            globalStreakBroken = true;
          }
        }

        // Per-prayer streak check
        if (hasPassed && !prayerStreakBroken[pKey]) {
          const status = allLogMap.get(`${pastDateStr}-${pKey}`);
          if (status === 'prayed' || status === 'qadaa') {
            prayerStreaks[pKey]++;
          } else {
            prayerStreakBroken[pKey] = true;
          }
        }
      }

      // If all streaks are broken, no need to go further in the past
      if (globalStreakBroken && Object.values(prayerStreakBroken).every(v => v === true)) {
        break;
      }
    }

    // 5. Update and retrieve max_streak
    let maxStreak = Number(settings.max_streak || 0);
    if (currentGlobalStreak > maxStreak) {
      maxStreak = currentGlobalStreak;
      await db.prepare('UPDATE user_settings SET max_streak = ? WHERE user_id = ?')
        .bind(maxStreak, userId).run();
    }

    // Format month title (e.g. "نوفمبر 2026")
    const monthFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      timeZone: userTimezone,
      month: 'long',
      year: 'numeric'
    });
    const monthTitle = monthFormatter.format(firstDayUtc);

    return new Response(JSON.stringify({
      year: targetYear,
      month: targetMonth,
      monthTitle,
      firstDayOfWeekIndex, // 0 = Saturday, 1 = Sunday, etc.
      daysInMonth,
      todayStr,
      currentStreak: currentGlobalStreak,
      maxStreak,
      prayerStreaks,
      days
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
