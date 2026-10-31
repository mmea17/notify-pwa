import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, Sparkles, Moon, Sun, Sunrise, Sunset } from 'lucide-react';

interface PrayerTrackerProps {
  initialPrayers?: any;
}

export const PrayerTracker: React.FC<PrayerTrackerProps> = ({ initialPrayers }) => {
  const [data, setData] = useState<any>(initialPrayers || null);
  const [loading, setLoading] = useState(!initialPrayers);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPrayers = async () => {
    try {
      const res = await fetch('/api/prayers/today');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch prayers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialPrayers) {
      fetchPrayers();
    }
    const interval = setInterval(fetchPrayers, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleTogglePrayer = async (prayerKey: string, currentStatus: string) => {
    const newStatus = currentStatus === 'prayed' ? 'pending' : 'prayed';
    setActionLoading(prayerKey);
    try {
      const res = await fetch('/api/prayers/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prayer: prayerKey, status: newStatus })
      });
      if (res.ok) {
        await fetchPrayers();
      }
    } catch (e) {
      console.error(e);
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

  const { prayers, city, country, todayStr } = data;
  const next = prayers.nextPrayer;

  const prayerItems = [
    { key: 'fajr', label: 'صلاة الفجر', icon: Moon, info: prayers.fajr, color: 'from-indigo-600/20 to-sky-600/10' },
    { key: 'sunrise', label: 'الشروق', icon: Sunrise, info: prayers.sunrise, isSunrise: true, color: 'from-amber-600/20 to-orange-600/10' },
    { key: 'dhuhr', label: 'صلاة الظهر', icon: Sun, info: prayers.dhuhr, color: 'from-amber-500/20 to-yellow-500/10' },
    { key: 'asr', label: 'صلاة العصر', icon: Sunset, info: prayers.asr, color: 'from-orange-500/20 to-amber-600/10' },
    { key: 'maghrib', label: 'صلاة المغرب', icon: Sunset, info: prayers.maghrib, color: 'from-rose-500/20 to-purple-600/10' },
    { key: 'isha', label: 'صلاة العشاء', icon: Moon, info: prayers.isha, color: 'from-purple-600/20 to-indigo-700/10' }
  ];

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 sm:p-6 mb-8 backdrop-blur-sm">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>صلوات اليوم</span>
              <span className="text-emerald-400">🕌</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {city}، {country}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            حساب فلكي دقيق - ينبهك النظام قبل الأذان للاستعداد ويتابع معك بعده بأزرار تفاعلية
          </p>
        </div>

        {/* Next Prayer Countdown Card */}
        {next && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/30">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="text-[11px] text-emerald-400 font-semibold">الصلاة القادمة: {next.nameAr}</div>
              <div className="text-xs text-slate-200 font-bold">
                {next.timeFormatted} ({next.diffMinutes > 0 ? `باقي ${next.diffMinutes} دقيقة` : 'حان وقتها الآن'})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prayers Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {prayerItems.map((item) => {
          const Icon = item.icon;
          const isSunrise = item.isSunrise;
          const isPrayed = item.info?.status === 'prayed';
          const isSnoozed = item.info?.status === 'snoozed';
          const isNext = next && next.key === item.key;

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
                    <CheckCircle2 className="w-3 h-3" /> تم
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
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                        : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700'
                    }`}
                  >
                    {actionLoading === item.key ? (
                      <span className="animate-spin text-[10px]">⏳</span>
                    ) : isPrayed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>صليت ✅</span>
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
