import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, Smartphone, Check, AlertCircle } from 'lucide-react';
import { getSubscriptionStatus, subscribeUserToPush } from '@/lib/push-client';

interface PushBannerProps {
  onSubscribed?: () => void;
}

export const PushBanner: React.FC<PushBannerProps> = ({ onSubscribed }) => {
  const [status, setStatus] = useState<'checking' | 'active' | 'inactive' | 'unsupported'>('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    const s = await getSubscriptionStatus();
    if (!s.supported) {
      setStatus('unsupported');
    } else if (s.subscribed) {
      setStatus('active');
    } else {
      setStatus('inactive');
    }
  };

  useEffect(() => {
    check();
  }, []);

  if (status === 'active' || status === 'checking') {
    return null;
  }

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    const res = await subscribeUserToPush();
    setLoading(false);
    if (res.success) {
      setStatus('active');
      if (onSubscribed) onSubscribed();
    } else {
      setError(res.error || 'فشل تفعيل الإشعارات');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 p-5 sm:p-6 mb-8 shadow-xl shadow-emerald-950/40">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                فعّل الإشعارات التفاعلية على هذا الجهاز الآن 🚀
              </h3>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300">
                أزرار تفاعل فورية
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              لتصلك تذكيرات الصلاة مع خيارات الرد المباشر (<span className="text-emerald-400 font-semibold">صليت ✅</span> أو <span className="text-amber-400 font-semibold">لسة ⏰</span>)، وتنبيهات محاربة التشتت في فترات اليوم المختلفة.
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-1">⏳</span>
            ) : (
              <Bell className="w-4 h-4 text-slate-950" />
            )}
            <span>{loading ? 'جاري التفعيل والربط...' : 'تفعيل الإشعارات بنقرة واحدة'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
