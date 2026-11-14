import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { getLocalDateString } from '@/lib/prayer';
import { getCountryTimezone } from '@/lib/countries';

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const session = await getCurrentSession(context, db);
    if (!session) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401 });
    }

    const userId = session.user.id;
    const settings = session.settings;
    const userTimezone = getCountryTimezone(settings?.country || 'مصر');

    const now = new Date();
    const nowTime = now.getTime();
    const todayStr = getLocalDateString(now, userTimezone);

    const url = new URL(context.request.url);
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month'); // 1-12

    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() + 1;

    if (yearParam && /^\d{4}$/.test(yearParam)) {
      targetYear = parseInt(yearParam, 10);
    }
    if (monthParam && /^\d{1,2}$/.test(monthParam)) {
      targetMonth = Math.min(12, Math.max(1, parseInt(monthParam, 10)));
    }

    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const monthStartStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const monthEndStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // 1. Fetch user's trackable routines (Athkar and Habits)
    const routinesResult = await db.prepare(`
      SELECT id, name, icon, routine_type, timing_type, start_time, end_time, is_active
      FROM time_windows
      WHERE user_id = ? AND (routine_type != 'continuous' OR routine_type IS NULL)
      ORDER BY created_at ASC
    `).bind(userId).all();

    const routines = routinesResult.results || [];

    // 2. Fetch logs for target month
    const monthLogsResult = await db.prepare(`
      SELECT routine_id, date, status, completed_at
      FROM routines_log
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).bind(userId, monthStartStr, monthEndStr).all();

    const monthLogMap = new Map<string, any>();
    if (monthLogsResult.results) {
      for (const row of monthLogsResult.results) {
        monthLogMap.set(`${row.date}-${row.routine_id}`, row);
      }
    }

    // 3. Fetch past 90 days of logs for streaks calculation
    const allCompletedLogs = await db.prepare(`
      SELECT routine_id, date, status
      FROM routines_log
      WHERE user_id = ? AND status = 'completed'
      ORDER BY date DESC
    `).bind(userId).all();

    const completedDateSet = new Set<string>();
    if (allCompletedLogs.results) {
      for (const row of allCompletedLogs.results) {
        completedDateSet.add(`${row.date}-${row.routine_id}`);
      }
    }

    // 4. Calculate individual streak for each routine
    const routineStreaks: Record<string, number> = {};
    for (const routine of routines) {
      let streak = 0;
      let checkDate = new Date(nowTime);

      // Check today
      const todayKey = `${todayStr}-${routine.id}`;
      const isCompletedToday = completedDateSet.has(todayKey);

      if (isCompletedToday) {
        streak = 1;
        // Check days prior to today
        for (let i = 1; i <= 90; i++) {
          const pastDate = new Date(nowTime - i * 24 * 60 * 60 * 1000);
          const pastDateStr = getLocalDateString(pastDate, userTimezone);
          if (completedDateSet.has(`${pastDateStr}-${routine.id}`)) {
            streak++;
          } else {
            break;
          }
        }
      } else {
        // Not completed today yet: check if yesterday was completed
        for (let i = 1; i <= 90; i++) {
          const pastDate = new Date(nowTime - i * 24 * 60 * 60 * 1000);
          const pastDateStr = getLocalDateString(pastDate, userTimezone);
          if (completedDateSet.has(`${pastDateStr}-${routine.id}`)) {
            streak++;
          } else {
            break;
          }
        }
      }

      routineStreaks[routine.id as string] = streak;
    }

    // 5. Build days array for month calendar
    const days = [];
    const firstDayUtc = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const firstDayOfWeekIndex = (firstDayUtc.getUTCDay() + 1) % 7; // Saturday first

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayDate = new Date(Date.UTC(targetYear, targetMonth - 1, dayNum, 12, 0, 0));

      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;

      let completedCount = 0;
      const dayRoutinesInfo: Array<any> = [];

      for (const routine of routines) {
        const log = monthLogMap.get(`${dateStr}-${routine.id}`);
        const isCompleted = log?.status === 'completed';
        if (isCompleted) {
          completedCount++;
        }

        dayRoutinesInfo.push({
          id: routine.id,
          name: routine.name,
          icon: routine.icon,
          routine_type: routine.routine_type,
          status: isCompleted ? 'completed' : 'pending',
          completed_at: log?.completed_at || null
        });
      }

      const totalCount = routines.length;
      const isComplete = totalCount > 0 && completedCount === totalCount;
      const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const gregorianFormatted = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        timeZone: userTimezone,
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).format(dayDate);

      days.push({
        date: dateStr,
        dayNumber: dayNum,
        gregorianFormatted,
        isToday,
        isPast,
        isFuture,
        completedCount,
        totalCount,
        percentage,
        isComplete,
        routines: dayRoutinesInfo
      });
    }

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
      firstDayOfWeekIndex,
      daysInMonth,
      todayStr,
      routines,
      routineStreaks,
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
