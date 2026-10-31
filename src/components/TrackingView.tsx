import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface TrackingViewProps {
  initialData?: any;
}

export const TrackingView: React.FC<TrackingViewProps> = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  const fetchHistory = async (year = currentYear, month = currentMonth) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/prayers/history?year=${year}&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!selectedDateStr) {
          setSelectedDateStr(json.todayStr);
        }
      }
    } catch (e) {
      console.error('Failed to load prayer history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const changeMonth = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDateStr(data?.todayStr || '');
  };

  // Toggle prayer status on any selected day
  const handleTogglePrayer = async (prayerKey: string, currentStatus: string) => {
    if (!selectedDateStr) return;
    const newStatus = currentStatus === 'prayed' ? 'pending' : 'prayed';
    setActionLoading(prayerKey);

    // Optimistic update
    setData((prev: any) => {
      if (!prev || !prev.days) return prev;
      return {
        ...prev,
        days: prev.days.map((d: any) => {
          if (d.date !== selectedDateStr) return d;
          const currentP = d.prayers[prayerKey];
          const updatedPrayers = {
            ...d.prayers,
            [prayerKey]: {
              ...currentP,
              status: newStatus
            }
          };
          const prayedCount = Object.values(updatedPrayers).filter((p: any) => p.status === 'prayed').length;
          return {
            ...d,
            prayedCount,
            isComplete: prayedCount === 5,
            prayers: updatedPrayers
          };
        })
      };
    });

    try {
      const res = await fetch('/api/prayers/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prayer: prayerKey,
          status: newStatus,
          date: selectedDateStr
        })
      });
      if (res.ok) {
        // Refresh to accurately recalculate streaks
        fetchHistory(currentYear, currentMonth);
      }
    } catch (err) {
      console.error(err);
      fetchHistory(currentYear, currentMonth);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl animate-pulse text-slate-400">
        <Clock className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-3" />
        جاري تحميل سجل المتابعة والتقويم الشهري...
      </div>
    );
  }

  const { currentStreak, maxStreak, prayerStreaks, days, monthTitle, firstDayOfWeekIndex, todayStr } = data || {};
  const selectedDay = days?.find((d: any) => d.date === selectedDateStr) || days?.[0];

  const PRAYER_META: Record<string, { label: string; icon: any }> = {
    fajr: { label: 'صلاة الفجر', icon: Moon },
    dhuhr: { label: 'صلاة الظهر', icon: Sun },
    asr: { label: 'صلاة العصر', icon: Sunset },
    maghrib: { label: 'صلاة المغرب', icon: Sunset },
    isha: { label: 'صلاة العشاء', icon: Moon }
  };

  const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  return (
    <div className="space-y-6">
      {/* 1. Global Streak Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Flame className="w-4 h-4 text-emerald-400 animate-bounce" />
              <span>سلسلة الالتزام بالصلوات</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {currentStreak > 0 ? (
                <>
                  مفوّتّش ولا صلاة بقالك{' '}
                  <span className="text-emerald-400 underline decoration-emerald-500/50 decoration-wavy">
                    {currentStreak}
                  </span>{' '}
                  صلاة متواصلة! 🔥
                </>
              ) : (
                'ابدأ سلسلة صلواتك الجديدة من الصلاة القادمة 💪'
              )}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              تُحسب السلسلة بناءً على تتابع جميع الفروض في مواعيدها. التزامك المستمر يبني عادات إيمانية راسخة.
            </p>
          </div>

          {/* Record / Max Streak Pill */}
          <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 p-4 rounded-2xl shrink-0 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">أطول سلسلة صلوات حققتها</div>
              <div className="text-xl sm:text-2xl font-black text-amber-300">
                {maxStreak || 0} <span className="text-xs text-amber-400/80 font-normal">صلاة متتالية</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Per-Prayer Streak Badges (سلاسل كل فريضة منفردة) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((pKey) => {
          const meta = PRAYER_META[pKey];
          const Icon = meta.icon;
          const streakCount = prayerStreaks?.[pKey] || 0;
          return (
            <div
              key={pKey}
              className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 transition-all flex items-center gap-3 backdrop-blur-sm"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                streakCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-400 font-semibold truncate">{meta.label}</div>
                <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1">
                  <span>{streakCount} {streakCount === 1 ? 'صلاة' : streakCount <= 10 ? 'صلوات' : 'صلاة'}</span>
                  {streakCount > 0 && <span className="text-xs">🔥</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Monthly Calendar & Selected Day Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column: Calendar Grid (7 cols) */}
        <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-sm">
          {/* Calendar Header with Month Selector */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg sm:text-xl font-bold text-white">تقويم الشهر ومتابعة الفروض</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                title="الشهر السابق"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition-all border border-slate-700/60 active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs sm:text-sm font-bold text-white px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 min-w-[120px] text-center">
                {monthTitle || `${currentYear}-${currentMonth}`}
              </span>

              <button
                onClick={() => changeMonth(1)}
                title="الشهر التالي"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition-all border border-slate-700/60 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={goToCurrentMonth}
                title="الرجوع إلى الشهر الحالي"
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 transition"
              >
                هذا الشهر
              </button>
            </div>
          </div>

          {/* Weekday Names Header (السبت -> الجمعة) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400">
            {WEEK_DAYS.map((name) => (
              <div key={name} className="py-1">
                {name}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Blank padding days for alignment */}
            {Array.from({ length: firstDayOfWeekIndex || 0 }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-slate-950/20 opacity-30" />
            ))}

            {/* Actual Month Days */}
            {days?.map((day: any) => {
              const isSelected = day.date === selectedDateStr;
              const isToday = day.isToday;
              const isComplete = day.isComplete;
              const isPast = day.isPast;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDateStr(day.date)}
                  className={`h-16 sm:h-20 rounded-2xl p-1.5 sm:p-2 transition-all flex flex-col justify-between items-center text-center relative border ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/50'
                      : isToday
                      ? 'bg-emerald-950/40 border-emerald-500/50'
                      : isComplete
                      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                      : isPast && day.hasMissed
                      ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-700/50'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Day Number and Today Tag */}
                  <div className="w-full flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-extrabold ${isToday ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {day.dayNumber}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-300">
                        اليوم
                      </span>
                    )}
                  </div>

                  {/* Prayer Status Dots / Summary */}
                  <div className="w-full flex items-center justify-center gap-1 my-1">
                    {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((k) => {
                      const p = day.prayers[k];
                      return (
                        <span
                          key={k}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                            p.status === 'prayed'
                              ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                              : p.status === 'missed'
                              ? 'bg-rose-500/80'
                              : 'bg-slate-700'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Summary Fraction */}
                  <div className="text-[10px] font-bold">
                    {day.prayedCount === 5 ? (
                      <span className="text-emerald-400">5/5 ✅</span>
                    ) : day.prayedCount > 0 ? (
                      <span className="text-amber-300">{day.prayedCount}/5</span>
                    ) : isPast ? (
                      <span className="text-rose-400/80">0/5 ❌</span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend Guide */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>تمت الصلاة (صح أخضر ✅)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>فاتت / لم تؤكد (إكس أحمر ❌)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span>في الانتظار ⏳</span>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Day Detail Checklist (5 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/90 rounded-3xl p-5 sm:p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            {/* Header of selected day */}
            <div className="border-b border-slate-800 pb-4 mb-4">
              <div className="text-xs text-emerald-400 font-semibold mb-1">تفاصيل الصلوات لليوم المحدد</div>
              <h4 className="text-lg font-black text-white">
                {selectedDay?.gregorianFormatted || selectedDateStr}
              </h4>
              <div className="text-xs text-slate-400 mt-0.5">
                {selectedDay?.hijriFormatted}
              </div>
            </div>

            {/* Prayer items checklist */}
            <div className="space-y-3">
              {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((pKey) => {
                const meta = PRAYER_META[pKey];
                const Icon = meta.icon;
                const pInfo = selectedDay?.prayers?.[pKey];
                const isPrayed = pInfo?.status === 'prayed';
                const isMissed = pInfo?.status === 'missed';
                const isLoading = actionLoading === pKey;

                return (
                  <div
                    key={pKey}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isPrayed
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : isMissed
                        ? 'bg-rose-950/20 border-rose-900/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPrayed
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isMissed
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{meta.label}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{pInfo?.timeFormatted}</div>
                      </div>
                    </div>

                    {/* Status Badge & Toggle Button */}
                    <div className="flex items-center gap-2">
                      {isPrayed ? (
                        <button
                          onClick={() => handleTogglePrayer(pKey, 'prayed')}
                          disabled={isLoading}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/30 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                          title="اضغط للتعديل أو إلغاء التأكيد"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>صليت ✅</span>
                        </button>
                      ) : isMissed ? (
                        <button
                          onClick={() => handleTogglePrayer(pKey, 'missed')}
                          disabled={isLoading}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-emerald-500/20 text-rose-300 hover:text-emerald-300 border border-rose-500/30 hover:border-emerald-500/30 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                          title="اضغط لتأكيد قضائها"
                        >
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>فاتت ❌</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTogglePrayer(pKey, 'pending')}
                          disabled={isLoading}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>قادمة ⏳</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Motivational Tip */}
          <div className="mt-5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 text-center">
            💡 يمكنك النقر على أي فريضة في أي يوم لتأكيدها أو تعديلها، وتُحسب السلاسل فورياً.
          </div>
        </div>
      </div>
    </div>
  );
};
