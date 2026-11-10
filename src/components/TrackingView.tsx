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
  RotateCcw,
  AlertCircle,
  Trash2,
  Edit3,
  X
} from 'lucide-react';
import { PrayerActionModal } from './PrayerActionModal';

interface QadaaRecord {
  id: string;
  date: string;
  prayer: string;
  prayerNameAr: string;
  scheduled_time: string;
  responded_at?: string;
  delay_reason?: string;
}

const PRAYERS_CONFIG = [
  { key: 'fajr', label: 'الفجر' },
  { key: 'dhuhr', label: 'الظهر' },
  { key: 'asr', label: 'العصر' },
  { key: 'maghrib', label: 'المغرب' },
  { key: 'isha', label: 'العشاء' }
];

interface TrackingViewProps {
  initialData?: any;
}

export const TrackingView: React.FC<TrackingViewProps> = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  // Initialize data directly from cached localStorage so it NEVER shows 0 or spinner if cached!
  const [data, setData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem(`cached_history_${today.getFullYear()}_${today.getMonth() + 1}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(!data);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(`cached_history_${today.getFullYear()}_${today.getMonth() + 1}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.todayStr || '';
      }
    } catch (e) {}
    return '';
  });
  const [modalPrayer, setModalPrayer] = useState<{
    key: string;
    label: string;
    timeFormatted: string;
    status: 'prayed' | 'qadaa' | 'pending' | 'missed';
    delayReason?: string | null;
  } | null>(null);

  // Qadaa Journal State
  const [qadaaList, setQadaaList] = useState<QadaaRecord[]>([]);
  const [qadaaLoading, setQadaaLoading] = useState(true);
  const [qadaaFilter, setQadaaFilter] = useState<string>('all');
  const [editingQadaaId, setEditingQadaaId] = useState<string | null>(null);
  const [editingReasonText, setEditingReasonText] = useState('');
  const [deletingQadaaId, setDeletingQadaaId] = useState<string | null>(null);

  const fetchQadaaList = async () => {
    try {
      const res = await fetch('/api/prayers/qadaa');
      if (res.ok) {
        const data = await res.json();
        const list = data.qadaaList || [];
        setQadaaList(list);
        try {
          localStorage.setItem('cached_qadaa_list', JSON.stringify(list));
        } catch (e) {}
      } else {
        const cached = localStorage.getItem('cached_qadaa_list');
        if (cached) setQadaaList(JSON.parse(cached));
      }
    } catch (e) {
      const cached = localStorage.getItem('cached_qadaa_list');
      if (cached) setQadaaList(JSON.parse(cached));
    } finally {
      setQadaaLoading(false);
    }
  };

  const handleUpdateQadaaReason = async (id: string) => {
    try {
      const res = await fetch('/api/prayers/qadaa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, delay_reason: editingReasonText })
      });
      if (res.ok) {
        setQadaaList(prev =>
          prev.map(item => (item.id === id ? { ...item, delay_reason: editingReasonText } : item))
        );
        setEditingQadaaId(null);
        fetchHistory(currentYear, currentMonth);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQadaa = async (id: string) => {
    if (!confirm('هل تريد حذف هذه الصلاة من سجل القضاء وإعادتها كصلاة غير مؤكدة؟')) return;
    setDeletingQadaaId(id);
    try {
      const res = await fetch(`/api/prayers/qadaa?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQadaaList(prev => prev.filter(item => item.id !== id));
        fetchHistory(currentYear, currentMonth);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingQadaaId(null);
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

  const filteredQadaa = qadaaList.filter(item => {
    if (qadaaFilter === 'all') return true;
    return item.prayer === qadaaFilter;
  });

  const fetchHistory = async (year = currentYear, month = currentMonth) => {
    try {
      if (!data) setLoading(true);
      const res = await fetch(`/api/prayers/history?year=${year}&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        if (!json.offline && json.todayStr) {
          setData(json);
          try {
            localStorage.setItem(`cached_history_${year}_${month}`, JSON.stringify(json));
          } catch (e) {}
          if (!selectedDateStr) {
            setSelectedDateStr(json.todayStr);
          }
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Network error loading history, checking offline cache:', e);
    } finally {
      setLoading(false);
    }

    // Offline fallback from cache
    try {
      const cached = localStorage.getItem(`cached_history_${year}_${month}`);
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
    fetchQadaaList();

    const onOnline = () => {
      fetchHistory(currentYear, currentMonth);
      fetchQadaaList();
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

  // Open modal for selected prayer in history
  const handleOpenModal = (prayerKey: string, pInfo: any) => {
    const meta = PRAYER_META[prayerKey];
    setModalPrayer({
      key: prayerKey,
      label: meta.label,
      timeFormatted: pInfo?.timeFormatted || '',
      status: pInfo?.status || 'pending',
      delayReason: pInfo?.delayReason || null
    });
  };

  // Save prayer status from modal (prayed, qadaa, pending)
  const handleSavePrayerStatus = async (newStatus: 'prayed' | 'qadaa' | 'pending', delayReason?: string) => {
    if (!selectedDateStr || !modalPrayer) return;
    const prayerKey = modalPrayer.key;
    setActionLoading(prayerKey);
    setModalPrayer(null);

    // Optimistic update
    let updatedData: any = null;
    setData((prev: any) => {
      if (!prev || !prev.days) return prev;
      const newDays = prev.days.map((d: any) => {
        if (d.date !== selectedDateStr) return d;
        const currentP = d.prayers[prayerKey];
        const updatedPrayers = {
          ...d.prayers,
          [prayerKey]: {
            ...currentP,
            status: newStatus,
            delayReason: delayReason || null
          }
        };
        const performedCount = Object.values(updatedPrayers).filter(
          (p: any) => p.status === 'prayed' || p.status === 'qadaa'
        ).length;
        const hasQadaa = Object.values(updatedPrayers).some((p: any) => p.status === 'qadaa');
        return {
          ...d,
          prayedCount: performedCount,
          isComplete: performedCount === 5,
          hasQadaa,
          prayers: updatedPrayers
        };
      });

      updatedData = {
        ...prev,
        days: newDays
      };
      return updatedData;
    });

    // Save updated data to localStorage immediately for offline persistence
    if (updatedData) {
      try {
        localStorage.setItem(`cached_history_${currentYear}_${currentMonth}`, JSON.stringify(updatedData));
      } catch (e) {}
    }

    // Queue in offline actions
    try {
      const queue = JSON.parse(localStorage.getItem('offline_prayer_actions') || '[]');
      const filtered = queue.filter((item: any) => !(item.prayer === prayerKey && item.date === selectedDateStr));
      filtered.push({
        prayer: prayerKey,
        status: newStatus,
        date: selectedDateStr,
        delayReason: delayReason || null,
        timestamp: Date.now()
      });
      localStorage.setItem('offline_prayer_actions', JSON.stringify(filtered));
    } catch (e) {}

    // Also update cached_prayers_ for that day if cached
    try {
      const dayCache = localStorage.getItem('cached_prayers_' + selectedDateStr);
      if (dayCache) {
        const parsed = JSON.parse(dayCache);
        if (parsed?.prayers?.[prayerKey]) {
          parsed.prayers[prayerKey].status = newStatus;
          parsed.prayers[prayerKey].delayReason = delayReason || null;
          localStorage.setItem('cached_prayers_' + selectedDateStr, JSON.stringify(parsed));
        }
      }
    } catch (e) {}

    // If offline, finish early
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActionLoading(null);
      return;
    }

    try {
      const res = await fetch('/api/prayers/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prayer: prayerKey,
          status: newStatus,
          date: selectedDateStr,
          delay_reason: delayReason
        })
      });
      if (res.ok) {
        fetchHistory(currentYear, currentMonth);
        fetchQadaaList();
      }
    } catch (err) {
      console.warn('Network error updating prayer from history, queued for sync:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl animate-pulse text-slate-400">
        <Clock className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-3" />
        جاري تحميل سجل الالتزام والتقويم الشهري...
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
                              : p.status === 'qadaa'
                              ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
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
                      day.hasQadaa ? (
                        <span className="text-amber-300">5/5 🟡</span>
                      ) : (
                        <span className="text-emerald-400">5/5 ✅</span>
                      )
                    ) : day.prayedCount > 0 ? (
                      <span className={day.hasQadaa ? 'text-amber-300' : 'text-emerald-400/90'}>
                        {day.prayedCount}/5 {day.hasQadaa ? '🟡' : ''}
                      </span>
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span>صُلّيت في وقتها (صح أخضر ✅)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <span>صُلّيت قضاءً (دائرة صفراء ⚠️)</span>
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
                const isQadaa = pInfo?.status === 'qadaa';
                const isMissed = pInfo?.status === 'missed';
                const isLoading = actionLoading === pKey;

                return (
                  <div
                    key={pKey}
                    className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                      isPrayed
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : isQadaa
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-500/5'
                        : isMissed
                        ? 'bg-rose-950/20 border-rose-900/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPrayed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isQadaa
                            ? 'bg-amber-500/20 text-amber-300'
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

                      {/* Status Badge & Action Button */}
                      <div className="flex items-center gap-2">
                        {isPrayed ? (
                          <button
                            onClick={() => handleOpenModal(pKey, pInfo)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                            title="اضغط للتعديل"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>في وقتها ✅</span>
                          </button>
                        ) : isQadaa ? (
                          <button
                            onClick={() => handleOpenModal(pKey, pInfo)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition text-xs font-bold flex items-center gap-1 active:scale-95 shadow-sm shadow-amber-500/10"
                            title="اضغط للتعديل أو مراجعة السبب"
                          >
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span>قضيتها 🟡</span>
                          </button>
                        ) : isMissed ? (
                          <button
                            onClick={() => handleOpenModal(pKey, pInfo)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                            title="اضغط لتسجيل قضائها"
                          >
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>فاتت ❌</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenModal(pKey, pInfo)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-bold flex items-center gap-1 active:scale-95"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>صليت</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Show Delay Reason if Qadaa */}
                    {isQadaa && pInfo?.delayReason && (
                      <div className="mt-1 p-2 rounded-xl bg-slate-950/70 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed font-medium">
                        <span className="text-amber-400 font-bold ml-1">سبب التأخير:</span>
                        <span>"{pInfo.delayReason}"</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Motivational Tip */}
          <div className="mt-5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 text-center">
            💡 يمكنك النقر على أي فريضة في أي يوم لتسجيل أدائها (في وقتها أو قضاءً) وتدوين الأسباب فورياً.
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. سجل أسباب تأخير الصلوات وقضائها (المحاسبة الذاتية) */}
      {/* ======================================================== */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-sm shadow-xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base">
              📝
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>سجل أسباب تأخير الصلوات وقضائها</span>
                <span className="text-amber-400">🟡</span>
              </h3>
              <p className="text-xs text-slate-400">
                مراجعة أسباب تأخير الفروض وقضائها لمحاسبة النفس وتفادي مسببات التأخير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
              {qadaaList.length} {qadaaList.length === 1 ? 'صلاة مقضية مسجلة' : 'صلوات مقضية مسجلة'}
            </span>
          </div>
        </div>

        {/* Filter Tabs by Prayer */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setQadaaFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              qadaaFilter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({qadaaList.length})
          </button>
          {PRAYERS_CONFIG.map(p => {
            const count = qadaaList.filter(q => q.prayer === p.key).length;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setQadaaFilter(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  qadaaFilter === p.key
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>

        {/* List of Qadaa Cards */}
        {qadaaLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            جاري تحميل سجل الصلوات المقضية...
          </div>
        ) : filteredQadaa.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-1">
            <p className="text-sm font-bold text-slate-300">
              {qadaaList.length === 0
                ? 'ما شاء الله! لا توجد صلوات مسجلة كقضاء 🌟'
                : 'لا توجد صلوات مقضية مسجلة لهذه الفريضة.'}
            </p>
            <p className="text-xs text-slate-500">
              {qadaaList.length === 0
                ? 'جميع صلواتك تؤدى في مواعيدها بانتظام. تقبل الله طاعتكم وثبتكم!'
                : 'يمكنك اختيار تبويب (الكل) لعرض كافة السجلات.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredQadaa.map(item => {
              const isEditing = editingQadaaId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-amber-500/30 transition flex flex-col justify-between gap-2.5 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                          <span>صلاة {item.prayerNameAr}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                            قضاء
                          </span>
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 text-slate-500" />
                            <span>{item.date}</span>
                          </span>
                          {item.responded_at && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>سُجلت: {formatTimeArabic(item.responded_at)}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingQadaaId(null);
                          } else {
                            setEditingQadaaId(item.id);
                            setEditingReasonText(item.delay_reason || '');
                          }
                        }}
                        title={isEditing ? 'إلغاء التعديل' : 'تعديل سبب التأخير'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition"
                      >
                        {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQadaa(item.id)}
                        disabled={deletingQadaaId === item.id}
                        title="حذف من سجل القضاء"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        {deletingQadaaId === item.id ? (
                          <span className="text-[10px] animate-spin">⏳</span>
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Delay Reason Text / Edit Input */}
                  {isEditing ? (
                    <div className="space-y-2 pt-2 border-t border-slate-800 animate-fadeIn">
                      <textarea
                        rows={2}
                        value={editingReasonText}
                        onChange={e => setEditingReasonText(e.target.value)}
                        placeholder="عدل سبب التأخير..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-amber-400 resize-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingQadaaId(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs font-semibold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateQadaaReason(item.id)}
                          className="px-3 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition"
                        >
                          حفظ التعديل
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-amber-200/90 leading-relaxed font-medium">
                      <span className="text-amber-400 font-bold ml-1">سبب التأخير:</span>
                      <span>
                        {item.delay_reason && item.delay_reason.trim()
                          ? `"${item.delay_reason}"`
                          : 'لم يُسجل سبب محدد.'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prayer Action Modal (On-time vs Qadaa with reason) */}
      {modalPrayer && (
        <PrayerActionModal
          isOpen={!!modalPrayer}
          onClose={() => setModalPrayer(null)}
          prayerName={modalPrayer.label}
          prayerTime={modalPrayer.timeFormatted}
          currentStatus={modalPrayer.status}
          currentDelayReason={modalPrayer.delayReason}
          onSave={handleSavePrayerStatus}
          loading={!!actionLoading}
        />
      )}
    </div>
  );
};
