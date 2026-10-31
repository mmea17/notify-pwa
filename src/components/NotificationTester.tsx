import React, { useState } from 'react';
import { Send, Sparkles, CheckCircle2, Clock, RefreshCw, Smartphone, Laptop } from 'lucide-react';

export const NotificationTester: React.FC = () => {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendTest = async (type: 'prayer' | 'focus') => {
    setLoadingType(type);
    setResultMsg(null);
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok) {
        setResultMsg({ type: 'success', text: data.message || 'تم إرسال الإشعار بنجاح!' });
      } else {
        setResultMsg({ type: 'error', text: data.error || 'فشل إرسال الإشعار' });
      }
    } catch (e: any) {
      setResultMsg({ type: 'error', text: e?.message || 'حدث خطأ' });
    } finally {
      setLoadingType(null);
    }
  };

  const handleSimulateCron = async () => {
    setLoadingType('cron');
    setResultMsg(null);
    try {
      const res = await fetch('/api/cron/tick', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResultMsg({
          type: 'success',
          text: `تم تشغيل محرك الجدولة! تم فحص ${data.activeUsersCount || 0} مستخدمين وإرسال ${data.notificationsDispatched || 0} إشعار.`
        });
      } else {
        setResultMsg({ type: 'error', text: data.error || 'فشل تشغيل الجدولة' });
      }
    } catch (e: any) {
      setResultMsg({ type: 'error', text: e?.message || 'خطأ' });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 sm:p-6 mb-8 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>مختبر واختبار الإشعارات التفاعلية</span>
            <span className="text-emerald-400">⚡</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            اختبر وصول الإشعارات التفاعلية إلى شاشة هاتفك أو جهازك الآن وتأكد من عمل أزرار الرد المباشر.
          </p>
        </div>
      </div>

      {resultMsg && (
        <div
          className={`mb-5 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            resultMsg.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
          }`}
        >
          {resultMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <span className="shrink-0">⚠️</span>
          )}
          <span>{resultMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Test Prayer Notification */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
              <span>🕌 إشعار صلاة تفاعلي</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              إرسال إشعار فوري يحتوي على أزرار تفاعلية (<span className="text-emerald-300 font-semibold">صليت ✅</span> و <span className="text-amber-300 font-semibold">لسة ⏰</span>) لتجربة الرد من قفل الشاشة أو شريط المهام.
            </p>
          </div>

          <button
            onClick={() => handleSendTest('prayer')}
            disabled={loadingType !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingType === 'prayer' ? (
              <span className="animate-spin text-xs">⏳</span>
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>إرسال إشعار الصلاة الآن</span>
          </button>
        </div>

        {/* Test Focus Reminder */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm mb-1">
              <span>🎯 إشعار تركيز ومحاربة تشتت</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              إرسال إشعار عشوائي يحتوي على أزرار تفاعلية (<span className="text-teal-300 font-semibold">مستمر بتركيز 💪</span> و <span className="text-indigo-300 font-semibold">أنجزت 🎉</span>) لتأكيد حالة تقدمك.
            </p>
          </div>

          <button
            onClick={() => handleSendTest('focus')}
            disabled={loadingType !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingType === 'focus' ? (
              <span className="animate-spin text-xs">⏳</span>
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>إرسال إشعار التركيز الآن</span>
          </button>
        </div>

        {/* Simulate Cloudflare Cron Engine */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-1">
              <span>⚙️ محاكاة فحص الجدولة (Cron)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              تشغيل محرك فحص الدقيقة الحالي يدويًا للتأكد من حسابات أوقات الصلاة والرسائل العشوائية المجدولة.
            </p>
          </div>

          <button
            onClick={handleSimulateCron}
            disabled={loadingType !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingType === 'cron' ? (
              <span className="animate-spin text-xs">⏳</span>
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>تشغيل فحص الجدولة الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
