import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  ChevronRight,
  ChevronLeft,
  Calendar
} from 'lucide-react';

interface PrayerTrackerProps {
  initialPrayers?: any;
}

export const PrayerTracker: React.FC<PrayerTrackerProps> = ({ initialPrayers }) => {
  const [data, setData] = useState<any>(initialPrayers || null);
  const [loading, setLoading] = useState(!initialPrayers);
  const [dateLoading, setDateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    initialPrayers?.selectedDateStr || initialPrayers?.todayStr || ''
  );
  const [hasOfflineQueue, setHasOfflineQueue] = useState(false);

  // Queue offline prayer toggle to localStorage
  const queueOfflinePrayerAction = (prayer: string, status: string, date: string) => {
    try {
      const queue = JSON.parse(localStorage.getItem('offline_prayer_actions') || '[]');
      const filtered = queue.filter((item: any) => !(item.prayer === prayer && item.date === date));
      filtered.push({ prayer, status, date, timestamp: Date.now() });
      localStorage.setItem('offline_prayer_actions', JSON.stringify(filtered));
      setHasOfflineQueue(true);
    } catch (e) {}
  };

  // Sync queued offline prayer actions with Cloudflare D1
  const flushOfflineQueue = async () => {
    try {
      const rawQueue = localStorage.getItem('offline_prayer_actions');
      if (!rawQueue) return;
      const queue = JSON.parse(rawQueue);
      if (!Array.isArray(queue) || queue.length === 0) return;

      for (const item of queue) {
        await fetch('/api/prayers/today', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prayer: item.prayer,
            status: item.status,
            date: item.date
          })
        });
      }
      localStorage.removeItem('offline_prayer_actions');
      setHasOfflineQueue(false);
      fetchPrayers(selectedDate);
    } catch (e) {
      console.warn('Failed to flush offline queue:', e);
    }
  };

  const fetchPrayers = async (dateStr?: string) => {
    const target = dateStr !== undefined ? dateStr : selectedDate;
    try {
      if (dateStr) setDateLoading(true);
      const url = target ? `/api/prayers/today?date=${target}` : '/api/prayers/today';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (!json.offline && json.prayers) {
          setData(json);
          try {
            localStorage.setItem('cached_prayers_' + (json.selectedDateStr || 'today'), JSON.stringify(json));
            localStorage.setItem('last_active_prayers', JSON.stringify(json));
          } catch (e) {}
          if (!selectedDate && json.selectedDateStr) {
            setSelectedDate(json.selectedDateStr);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Network error fetching prayers, checking offline cache:', err);
    } finally {
      setLoading(false);
      setDateLoading(false);
    }

    // Offline cache fallback
    try {
      const cached = localStorage.getItem('cached_prayers_' + (target || 'today')) || localStorage.getItem('last_active_prayers');
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed);
        if (!selectedDate && parsed.selectedDateStr) {
          setSelectedDate(parsed.selectedDateStr);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Initial cache save
    if (initialPrayers?.prayers) {
      try {
        localStorage.setItem('cached_prayers_' + (initialPrayers.selectedDateStr || 'today'), JSON.stringify(initialPrayers));
        localStorage.setItem('last_active_prayers', JSON.stringify(initialPrayers));
      } catch (e) {}
    }

    // Check existing offline queue
    try {
      const q = localStorage.getItem('offline_prayer_actions');
      if (q && JSON.parse(q).length > 0) {
        setHasOfflineQueue(true);
      }
    } catch (e) {}

    fetchPrayers();

    // Auto-sync when internet reconnects
    window.addEventListener('online', flushOfflineQueue);
    if (navigator.onLine) {
      flushOfflineQueue();
    }

    const interval = setInterval(() => {
      fetchPrayers(selectedDate);
    }, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', flushOfflineQueue);
    };
  }, [selectedDate]);

  const changeDateByDays = (delta: number) => {
    const baseStr = selectedDate || data?.todayStr || new Date().toISOString().split('T')[0];
    const [y, m, d] = baseStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d + delta, 12, 0, 0));
    const nextStr = dateObj.toISOString().split('T')[0];
    setSelectedDate(nextStr);
    fetchPrayers(nextStr);
  };

  const goToToday = () => {
    if (data?.todayStr) {
      setSelectedDate(data.todayStr);
      fetchPrayers(data.todayStr);
    }
  };

  // Toggle clicked prayer for the currently viewed date
  const handleTogglePrayer = async (prayerKey: string, currentStatus: string) => {
    const newStatus = currentStatus === 'prayed' ? 'pending' : 'prayed';
    const targetDate = data?.selectedDateStr || selectedDate || data?.todayStr;

    // 1. Optimistic update
    setData((prev: any) => {
      if (!prev || !prev.prayers) return prev;
      return {
        ...prev,
        prayers: {
          ...prev.prayers,
          [prayerKey]: {
            ...prev.prayers[prayerKey],
            status: newStatus
          }
        }
      };
    });

    // Save updated state to localStorage immediately for offline persistence
    try {
      const updated = {
        ...data,
        prayers: {
          ...data?.prayers,
          [prayerKey]: {
            ...data?.prayers?.[prayerKey],
            status: newStatus
          }
        }
      };
      localStorage.setItem('cached_prayers_' + (targetDate || 'today'), JSON.stringify(updated));
      localStorage.setItem('last_active_prayers', JSON.stringify(updated));
    } catch (e) {}

    setActionLoading(prayerKey);

    // If device is offline, queue action locally and skip network
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflinePrayerAction(prayerKey, newStatus, targetDate);
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
          date: targetDate
        })
      });
      if (!res.ok) {
        queueOfflinePrayerAction(prayerKey, newStatus, targetDate);
      }
    } catch (e) {
      console.warn('Network error toggling prayer, queued for sync:', e);
      queueOfflinePrayerAction(prayerKey, newStatus, targetDate);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !data?.prayers) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse text-center text-slate-400">
        جاري حساب مواقيت الصلاة الفلكية لمدينتك...
      </div>
    );
  }

  const { prayers, city, country, todayStr, selectedDateStr, gregorianFormatted, hijriFormatted } = data;
  const isToday = !selectedDateStr || selectedDateStr === todayStr;
  const next = prayers.nextPrayer;

  const prayerItems = [
    { key: 'fajr', label: 'صلاة الفجر', icon: Moon, info: prayers.fajr },
    { key: 'sunrise', label: 'الشروق', icon: Sunrise, info: prayers.sunrise, isSunrise: true },
    { key: 'dhuhr', label: 'صلاة الظهر', icon: Sun, info: prayers.dhuhr },
    { key: 'asr', label: 'صلاة العصر', icon: Sunset, info: prayers.asr },
    { key: 'maghrib', label: 'صلاة المغرب', icon: Sunset, info: prayers.maghrib },
    { key: 'isha', label: 'صلاة العشاء', icon: Moon, info: prayers.isha }
  ];

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 sm:p-6 mb-8 backdrop-blur-sm">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
        {/* Right side: Title & City */}
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <span>{isToday ? 'صلوات اليوم' : 'مواقيت الصلاة'}</span>
            <span className="text-emerald-400">🕌</span>
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
            {city}، {country}
          </span>
        </div>

        {/* Left side: Stacked Countdown Card + Date Navigator with identical width */}
        <div className="flex flex-col gap-2 w-full sm:w-[450px] md:w-[480px] shrink-0">
          {/* Top: Next Prayer Countdown Card */}
          {next && (
            <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/30 shadow-inner">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Clock className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-emerald-400 font-semibold truncate">
                    الصلاة القادمة {isToday ? '' : '(اليوم)'}: {next.nameAr}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200 font-bold truncate">
                    {next.timeFormatted} ({next.remainingFormatted || (next.diffMinutes > 0 ? `باقي ${next.diffMinutes} دقيقة` : 'حان وقتها الآن')})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom: Day Navigation Buttons & Gregorian / Hijri Dates */}
          <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 bg-slate-950/70 border border-slate-800/90 p-1 sm:p-1.5 rounded-2xl shadow-inner">
            {/* Previous Day Button */}
            <button
              type="button"
              onClick={() => changeDateByDays(-1)}
              title="اليوم السابق"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition-all border border-slate-700/60 flex items-center gap-1 active:scale-95 shrink-0"
            >
              <ChevronRight className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium hidden sm:inline">السابق</span>
            </button>

            {/* Date Info Display (Gregorian & Hijri) */}
            <div className="text-center px-1 flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-bold text-white min-w-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate sm:whitespace-nowrap">{gregorianFormatted || selectedDateStr}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-emerald-400/90 font-medium mt-0.5 truncate sm:whitespace-nowrap">
                {hijriFormatted}
              </div>
            </div>

            {/* Next Day Button */}
            <button
              type="button"
              onClick={() => changeDateByDays(1)}
              title="اليوم التالي"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition-all border border-slate-700/60 flex items-center gap-1 active:scale-95 shrink-0"
            >
              <span className="text-xs font-medium hidden sm:inline">التالي</span>
              <ChevronLeft className="w-4 h-4 shrink-0" />
            </button>

            {/* Today Button: Only rendered when viewing a different day, so on current day 'التالي' sits flush at the end */}
            {!isToday && (
              <button
                type="button"
                onClick={goToToday}
                className="text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 active:scale-95 shadow-sm shadow-emerald-500/20 whitespace-nowrap shrink-0 transition-all"
                title="الرجوع إلى تاريخ اليوم"
              >
                اليوم
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prayers Cards Grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 transition-opacity duration-200 ${dateLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {prayerItems.map((item) => {
          const Icon = item.icon;
          const isSunrise = item.isSunrise;
          const isPrayed = item.info?.status === 'prayed';
          const isSnoozed = item.info?.status === 'snoozed';
          const isNext = isToday && next && next.key === item.key;

          return (
            <div
              key={item.key}
              className={`relative rounded-xl p-4 border transition-all flex flex-col justify-between ${
                isPrayed
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                  : isNext
                  ? 'bg-slate-800/90 border-emerald-400 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Icon & Status */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPrayed
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isNext
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {isSunrise ? (
                  <span className="text-[10px] text-amber-400/90 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
                    شروق
                  </span>
                ) : isPrayed ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> تم ✅
                  </span>
                ) : isSnoozed ? (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    مؤجل ⏰
                  </span>
                ) : isNext ? (
                  <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                    القادمة ⏳
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">في الانتظار</span>
                )}
              </div>

              {/* Title & Time */}
              <div>
                <div className="text-xs font-bold text-slate-200">{item.label}</div>
                <div className="text-sm sm:text-base font-extrabold text-white mt-0.5 tracking-tight">
                  {item.info?.timeFormatted}
                </div>
              </div>

              {/* Interactive Button */}
              {!isSunrise && (
                <div className="mt-3 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleTogglePrayer(item.key, item.info?.status)}
                    disabled={actionLoading === item.key}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isPrayed
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 border border-emerald-500/30'
                        : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700'
                    }`}
                  >
                    {actionLoading === item.key ? (
                      <span className="animate-spin text-[10px]">⏳</span>
                    ) : isPrayed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>صليت (إلغاء؟)</span>
                      </>
                    ) : (
                      <span>تأكيد الصلاة</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};