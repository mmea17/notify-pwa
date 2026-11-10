import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Moon,
  Sun,
  Sunset,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Edit3,
  X,
  MessageSquare
} from 'lucide-react';

interface PrayerMessage {
  id: string;
  prayer: string;
  timing: 'pre' | 'azan' | 'post';
  message_text: string;
  created_at?: string;
}

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
  { key: 'fajr', label: 'الفجر', icon: Moon },
  { key: 'dhuhr', label: 'الظهر', icon: Sun },
  { key: 'asr', label: 'العصر', icon: Sunset },
  { key: 'maghrib', label: 'المغرب', icon: Sunset },
  { key: 'isha', label: 'العشاء', icon: Moon }
];

const TIMINGS_CONFIG = [
  { key: 'pre', label: 'قبل', desc: 'قبل الأذان' },
  { key: 'azan', label: 'نفسها', desc: 'وقت الأذان' },
  { key: 'post', label: 'بعد', desc: 'بعد الصلاة والمتابعة' }
];

export const PrayerMessagesView: React.FC = () => {
  const [messages, setMessages] = useState<PrayerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [messageText, setMessageText] = useState('');
  const [selectedPrayers, setSelectedPrayers] = useState<string[]>(['fajr']);
  const [selectedTimings, setSelectedTimings] = useState<string[]>(['pre']);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected prayer tab for viewing in Card 2
  const [activePrayerTab, setActivePrayerTab] = useState<string>('fajr');

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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingQadaaId(null);
    }
  };

  const filteredQadaa = qadaaList.filter(item => {
    if (qadaaFilter === 'all') return true;
    return item.prayer === qadaaFilter;
  });

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

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/prayers/messages');
      if (res.ok) {
        const data = await res.json();
        const list = data.messages || [];
        setMessages(list);
        try {
          localStorage.setItem('cached_prayer_messages', JSON.stringify(list));
        } catch (e) {}
      } else {
        // Fallback to local storage if offline
        const cached = localStorage.getItem('cached_prayer_messages');
        if (cached) setMessages(JSON.parse(cached));
      }
    } catch (e) {
      const cached = localStorage.getItem('cached_prayer_messages');
      if (cached) setMessages(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchQadaaList();
  }, []);

  const handleTogglePrayer = (key: string) => {
    setSelectedPrayers(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSelectAllPrayers = () => {
    if (selectedPrayers.length === PRAYERS_CONFIG.length) {
      setSelectedPrayers([]);
    } else {
      setSelectedPrayers(PRAYERS_CONFIG.map(p => p.key));
    }
  };

  const handleToggleTiming = (key: string) => {
    setSelectedTimings(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmed = messageText.trim();
    if (!trimmed) {
      setStatusMessage({ type: 'error', text: 'يرجى كتابة نص الجملة أولاً' });
      return;
    }
    if (selectedPrayers.length === 0) {
      setStatusMessage({ type: 'error', text: 'يرجى تحديد صلاة واحدة على الأقل' });
      return;
    }
    if (selectedTimings.length === 0) {
      setStatusMessage({ type: 'error', text: 'يرجى تحديد فترة تذكير واحدة على الأقل (قبل، نفسها، بعد)' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/prayers/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_text: trimmed,
          prayers: selectedPrayers,
          timings: selectedTimings
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `تمت إضافة الجملة بنجاح إلى (${data.count || selectedPrayers.length}) موضعاً!` });
        setMessageText('');
        fetchMessages();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'حدث خطأ أثناء حفظ الجملة' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'تعذر الاتصال بالسيرفر' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/prayers/messages?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== id));
      } else {
        alert('فشل حذف الجملة');
      }
    } catch (e: any) {
      alert(e?.message || 'تعذر الاتصال');
    } finally {
      setDeletingId(null);
    }
  };

  // Group messages for active prayer by timing
  const prayerMessages = messages.filter(m => m.prayer === activePrayerTab);
  const preMessages = prayerMessages.filter(m => m.timing === 'pre');
  const azanMessages = prayerMessages.filter(m => m.timing === 'azan');
  const postMessages = prayerMessages.filter(m => m.timing === 'post');

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. TOP CARD: Add New Reminder Sentence (Matches User Mockup) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800/70">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">إضافة جملة تذكير جديدة</h2>
            <p className="text-xs text-slate-400">خصص الرسائل التي ستصلك في إشعارات الصلوات</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sentence Input */}
          <div>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="اكتب جملة التذكير هنا... (مثال: قم وتوضأ واستعد للصلاة، فالصلاة راحة وطمأنينة)"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-emerald-500/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition resize-none"
            />
          </div>

          {/* Two Columns: Prayer Selection & Timing Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
            {/* Column 1: Prayer Selection */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs sm:text-sm font-bold text-slate-200">الصلاة:</span>
                <button
                  type="button"
                  onClick={handleSelectAllPrayers}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition"
                >
                  {selectedPrayers.length === PRAYERS_CONFIG.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRAYERS_CONFIG.map(p => {
                  const isChecked = selectedPrayers.includes(p.key);
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleTogglePrayer(p.key)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all text-right active:scale-95 ${
                        isChecked
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <Icon className="w-3.5 h-3.5 opacity-80 shrink-0" />
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Timing Selection */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs sm:text-sm font-bold text-slate-200">النوع / التوقيت:</span>
                <span className="text-[11px] text-slate-400 font-medium">اختر فترة أو أكثر</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TIMINGS_CONFIG.map(t => {
                  const isChecked = selectedTimings.includes(t.key);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleToggleTiming(t.key)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all text-right active:scale-95 ${
                        isChecked
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate">{t.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback status alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>جاري الإضافة...</span>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>إضافة</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. BOTTOM CARD: Display & Manage Sentences Bank */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shadow-xl">
        {/* Header with Title & Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">بنك جمل التذكير المخصصة</h3>
              <p className="text-xs text-slate-400">إجمالي الجمل المسجلة: {messages.length} جملة</p>
            </div>
          </div>

          {/* Prayer Tabs Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {PRAYERS_CONFIG.map(p => {
              const isActive = activePrayerTab === p.key;
              const count = messages.filter(m => m.prayer === p.key).length;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActivePrayerTab(p.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span>{p.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sections: قبل / نفسها / بعد for the selected prayer */}
        <div className="space-y-4">
          {/* Section A: قبل (قبل الأذان) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                قبل (قبل موعد الأذان بربع ساعة)
              </h4>
              <span className="text-[11px] text-slate-500 mr-auto">
                {preMessages.length} {preMessages.length === 1 ? 'جملة' : 'جمل'}
              </span>
            </div>

            {preMessages.length > 0 ? (
              <ul className="space-y-2">
                {preMessages.map(msg => (
                  <li
                    key={msg.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition"
                  >
                    <span className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      • {msg.message_text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      disabled={deletingId === msg.id}
                      title="حذف هذه الجملة"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    >
                      {deletingId === msg.id ? (
                        <span className="text-[10px] animate-spin">⏳</span>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                لا توجد جمل مخصصة (يتم استخدام النص الافتراضي للتطبيق تلقائياً).
              </p>
            )}
          </div>

          {/* Section B: نفسها (وقت الأذان) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                نفسها (وقت أذان الصلاة تماماً)
              </h4>
              <span className="text-[11px] text-slate-500 mr-auto">
                {azanMessages.length} {azanMessages.length === 1 ? 'جملة' : 'جمل'}
              </span>
            </div>

            {azanMessages.length > 0 ? (
              <ul className="space-y-2">
                {azanMessages.map(msg => (
                  <li
                    key={msg.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition"
                  >
                    <span className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      • {msg.message_text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      disabled={deletingId === msg.id}
                      title="حذف هذه الجملة"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    >
                      {deletingId === msg.id ? (
                        <span className="text-[10px] animate-spin">⏳</span>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                لا توجد جمل مخصصة (يتم استخدام النص الافتراضي للتطبيق تلقائياً).
              </p>
            )}
          </div>

          {/* Section C: بعد (بعد الصلاة والمتابعة) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                بعد (تذكيرات المتابعة بعد الصلاة كل ربع ساعة)
              </h4>
              <span className="text-[11px] text-slate-500 mr-auto">
                {postMessages.length} {postMessages.length === 1 ? 'جملة' : 'جمل'}
              </span>
            </div>

            {postMessages.length > 0 ? (
              <ul className="space-y-2">
                {postMessages.map(msg => (
                  <li
                    key={msg.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition"
                  >
                    <span className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      • {msg.message_text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      disabled={deletingId === msg.id}
                      title="حذف هذه الجملة"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    >
                      {deletingId === msg.id ? (
                        <span className="text-[10px] animate-spin">⏳</span>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                لا توجد جمل مخصصة (يتم استخدام النص الافتراضي للتطبيق تلقائياً).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 3: سجل أسباب تأخير الصلوات وقضائها (المحاسبة الذاتية) */}
      {/* ======================================================== */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shadow-xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base">
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
          <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-1">
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
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-amber-500/30 transition flex flex-col justify-between gap-2.5 group"
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
                            <Calendar className="w-3 h-3 text-slate-500" />
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
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs text-amber-200/90 leading-relaxed font-medium">
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
    </div>
  );
};
