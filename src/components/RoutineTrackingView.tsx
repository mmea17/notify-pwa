import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Check,
  RotateCcw,
  BookOpen,
  Sun,
  Moon,
  Target,
  Dumbbell,
  Languages,
  Coffee,
  Heart
} from 'lucide-react';

interface RoutineTrackingViewProps {
  initialData?: any;
}

export const RoutineTrackingView: React.FC<RoutineTrackingViewProps> = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  // Initialize data directly from cached localStorage
  const [data, setData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem(`cached_routine_history_${today.getFullYear()}_${today.getMonth() + 1}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(!data);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(`cached_routine_history_${today.getFullYear()}_${today.getMonth() + 1}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.todayStr || '';
      }
    } catch (e) {}
    return '';
  });

  const [filterType, setFilterType] = useState<'all' | 'athkar' | 'habit'>('all');

  const fetchHistory = async (year = currentYear, month = currentMonth) => {
    try {
      if (!data) setLoading(true);
      const res = await fetch(`/api/routines/history?year=${year}&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.todayStr) {
          setData(json);
          try {
            localStorage.setItem(`cached_routine_history_${year}_${month}`, JSON.stringify(json));
          } catch (e) {}
          if (!selectedDateStr) {
            setSelectedDateStr(json.todayStr);
          }
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Network error loading routine history, checking offline cache:', e);
    } finally {
      setLoading(false);
    }

    try {
      const cached = localStorage.getItem(`cached_routine_history_${year}_${month}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed);
        if (!selectedDateStr && parsed.todayStr) {
          setSelectedDateStr(parsed.todayStr);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchHistory(currentYear, currentMonth);

    const onOnline = () => {
      fetchHistory(currentYear, currentMonth);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
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

  const handleToggleRoutineStatus = async (routineId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setActionLoading(routineId);

    // Optimistically update local state
    setData((prev: any) => {
      if (!prev) return prev;
      const updatedDays = (prev.days || []).map((d: any) => {
        if (d.date !== selectedDateStr) return d;
        const updatedRoutines = (d.routines || []).map((r: any) => {
          if (r.id !== routineId) return r;
          return {
            ...r,
            status: newStatus,
            completed_at: newStatus === 'completed' ? new Date().toISOString() : null
          };
        });
        const completedCount = updatedRoutines.filter((r: any) => r.status === 'completed').length;
        const totalCount = updatedRoutines.length;
        return {
          ...d,
          routines: updatedRoutines,
          completedCount,
          percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
          isComplete: totalCount > 0 && completedCount === totalCount
        };
      });

      return {
        ...prev,
        days: updatedDays
      };
    });

    try {
      const res = await fetch('/api/routines/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routine_id: routineId,
          status: newStatus
        })
      });

      if (res.ok) {
        fetchHistory(currentYear, currentMonth);
      }
    } catch (e) {
      console.warn('Network error toggling routine:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimeArabic = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      let hour = d.getHours();
      const minute = String(d.getMinutes()).padStart(2, '0');
      const isPM = hour >= 12;
      hour = hour % 12 || 12;
      return `${hour}:${minute} ${isPM ? 'م' : 'ص'}`;
    } catch {
      return isoString;
    }
  };

  const getRoutineIcon = (iconName?: string, name?: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('قرآن')) return BookOpen;
    if (n.includes('صباح')) return Sun;
    if (n.includes('مساء') || n.includes('نوم')) return Moon;
    if (n.includes('إنجليز') || n.includes('لغة')) return Languages;
    if (n.includes('رياض') || n.includes('جيم')) return Dumbbell;
    if (n.includes('قراء')) return BookOpen;
    if (iconName === 'Target') return Target;
    if (iconName === 'Heart') return Heart;
    return Sparkles;
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl animate-pulse text-slate-400">
        <Clock className="w-8 h-8 animate-spin text-teal-400 mx-auto mb-3" />
        جاري تحميل سجل الالتزام بالروتين والعادات...
      </div>
    );
  }

  const { routines, routineStreaks, days, monthTitle, firstDayOfWeekIndex, todayStr } = data || {};
  const selectedDay = days?.find((d: any) => d.date === selectedDateStr) || days?.[0];

  const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const filteredSelectedRoutines = (selectedDay?.routines || []).filter((r: any) => {
    if (filterType === 'all') return true;
    if (filterType === 'athkar') return r.routine_type === 'athkar' || (!r.routine_type?.includes('habit') && !r.name?.includes('انجليز') && !r.name?.includes('رياض'));
    if (filterType === 'habit') return r.routine_type === 'habit' || r.name?.includes('انجليز') || r.name?.includes('رياض');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Per-Routine Streak Badges (Individual Streaks) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>سلاسل الالتزام لكل ورد وعادة</span>
          </h3>
          <span className="text-xs text-slate-400">
            {routines?.length || 0} أوراد وعادات نشطة
          </span>
        </div>

        {routines && routines.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {routines.map((routine: any) => {
              const streak = routineStreaks?.[routine.id] || 0;
              const Icon = getRoutineIcon(routine.icon, routine.name);
              const isHabit = routine.routine_type === 'habit' || routine.name?.includes('انجليز') || routine.name?.includes('رياض');

              return (
                <div
                  key={routine.id}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-teal-500/30 rounded-2xl p-3.5 sm:p-4 transition-all flex items-center gap-3 backdrop-blur-sm"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      streak > 0
                        ? isHabit
                          ? 'bg-teal-500/20 text-teal-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 font-semibold truncate">
                      {routine.name}
                    </div>
                    <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 mt-0.5">
                      <span>{streak} {streak === 1 ? 'يوم' : streak <= 10 ? 'أيام' : 'يوم'}</span>
                      {streak > 0 && <span className="text-xs">🔥</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
            لم تقم بإضافة أي أوراد أو عادات تتبعية حتى الآن. أضف أورادك وعاداتك من تبويب "الروتين".
          </div>
        )}
      </div>

      {/* 2. Monthly Calendar & Selected Day Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column: Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-sm">
          {/* Calendar Header with Month Selector */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-teal-400" />
              <h3 className="text-base sm:text-lg font-bold text-white">تقويم التزام الروتين والعادات</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                title="الشهر السابق"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-teal-500/20 hover:text-teal-300 text-slate-300 transition-all border border-slate-700/60 active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs sm:text-sm font-bold text-white px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 min-w-[120px] text-center">
                {monthTitle || `${currentYear}-${currentMonth}`}
              </span>

              <button
                onClick={() => changeMonth(1)}
                title="الشهر التالي"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-teal-500/20 hover:text-teal-300 text-slate-300 transition-all border border-slate-700/60 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={goToCurrentMonth}
                title="الرجوع إلى الشهر الحالي"
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 border border-slate-700 transition"
              >
                هذا الشهر
              </button>
            </div>
          </div>

          {/* Weekday Names Header (السبت -> الجمعة) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400">
            {WEEK_DAYS.map(name => (
              <div key={name} className="py-1">
                {name}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: firstDayOfWeekIndex || 0 }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-slate-950/20 opacity-30" />
            ))}

            {days?.map((day: any) => {
              const isSelected = day.date === selectedDateStr;
              const isToday = day.isToday;
              const isComplete = day.isComplete;
              const hasCompleted = day.completedCount > 0;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDateStr(day.date)}
                  className={`h-16 sm:h-20 rounded-2xl p-1.5 sm:p-2 transition-all flex flex-col justify-between items-center text-center relative border ${
                    isSelected
                      ? 'bg-slate-800 border-teal-400 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/50'
                      : isToday
                      ? 'bg-teal-950/40 border-teal-500/50'
                      : isComplete
                      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                      : hasCompleted
                      ? 'bg-teal-950/20 border-teal-500/20 hover:border-teal-500/40'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Day Number and Today Tag */}
                  <div className="w-full flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-extrabold ${isToday ? 'text-teal-400' : 'text-slate-200'}`}>
                      {day.dayNumber}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold px-1 rounded bg-teal-500/20 text-teal-300">
                        اليوم
                      </span>
                    )}
                  </div>

                  {/* Routine Dots Indicator */}
                  <div className="w-full flex items-center justify-center gap-1 my-1 overflow-hidden">
                    {(day.routines || []).slice(0, 5).map((r: any, idx: number) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                          r.status === 'completed'
                            ? 'bg-teal-400 shadow-sm shadow-teal-400/50'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Summary Fraction */}
                  <div className="text-[10px] font-bold">
                    {day.totalCount === 0 ? (
                      <span className="text-slate-600">-</span>
                    ) : day.isComplete ? (
                      <span className="text-emerald-400">{day.completedCount}/{day.totalCount} 🌟</span>
                    ) : day.completedCount > 0 ? (
                      <span className="text-teal-300">{day.completedCount}/{day.totalCount}</span>
                    ) : (
                      <span className="text-slate-600">0/{day.totalCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend Guide */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
              <span>مُنجز (أخضر زمردي / تيل)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span>في الانتظار</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">🌟</span>
              <span>اكتمال كافة الأوراد والعادات (100%)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Day Checklist (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div>
            {/* Header of selected day */}
            <div className="border-b border-slate-800 pb-4 mb-4">
              <div className="text-xs text-teal-400 font-semibold mb-1">تفاصيل إنجاز اليوم المحدد</div>
              <h4 className="text-lg font-black text-white">
                {selectedDay?.gregorianFormatted || selectedDateStr}
              </h4>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>الإنجاز: {selectedDay?.completedCount || 0} من {selectedDay?.totalCount || 0}</span>
                <span className="font-bold text-teal-300">{selectedDay?.percentage || 0}%</span>
              </div>
            </div>

            {/* Filter Tabs for selected day */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1 rounded-lg transition ${
                  filterType === 'all'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setFilterType('athkar')}
                className={`flex-1 py-1 rounded-lg transition ${
                  filterType === 'athkar'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الأوراد
              </button>
              <button
                type="button"
                onClick={() => setFilterType('habit')}
                className={`flex-1 py-1 rounded-lg transition ${
                  filterType === 'habit'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                العادات
              </button>
            </div>

            {/* Checklist of Routines */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto no-scrollbar">
              {filteredSelectedRoutines.length > 0 ? (
                filteredSelectedRoutines.map((routine: any) => {
                  const isCompleted = routine.status === 'completed';
                  const isHabit = routine.routine_type === 'habit' || routine.name?.includes('انجليز') || routine.name?.includes('رياض');
                  const Icon = getRoutineIcon(routine.icon, routine.name);
                  const isLoading = actionLoading === routine.id;

                  return (
                    <div
                      key={routine.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCompleted
                          ? 'bg-teal-950/20 border-teal-500/40'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? 'bg-teal-500/20 text-teal-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {routine.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                              {isHabit ? 'عادة يومية' : 'ورد ديني'}
                            </span>
                            {isCompleted && routine.completed_at && (
                              <span className="text-teal-400">
                                • {formatTimeArabic(routine.completed_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => handleToggleRoutineStatus(routine.id, 'completed')}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-rose-500/20 hover:text-rose-300 text-teal-300 border border-teal-500/40 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                            title="اضغط لإلغاء التسجيل"
                          >
                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                            <span>مُنجزة ✅</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleRoutineStatus(routine.id, 'pending')}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-300 border border-slate-700 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                            <span>تأكيد الإنجاز</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  لا توجد بنود تحت هذا التصنيف.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 text-center">
            💡 التزامك اليومي بالأوراد والعادات يبني استمرارية حقيقية ويزيد من سلسلة أيامك المتصلة 🔥
          </div>
        </div>
      </div>
    </div>
  );
};
