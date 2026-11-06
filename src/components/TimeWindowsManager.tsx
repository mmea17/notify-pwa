import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Send,
  Shuffle,
  Sparkles,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Edit3,
  X,
  Save,
  Repeat,
  Sunrise,
  Sunset,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Undo2,
  Flame,
  Sun,
  Moon
} from 'lucide-react';

const INTERVAL_OPTIONS = [
  { value: 15, label: 'كل ربع ساعة (15 دقيقة)' },
  { value: 30, label: 'كل نصف ساعة (30 دقيقة)' },
  { value: 45, label: 'كل 45 دقيقة' },
  { value: 60, label: 'كل ساعة (60 دقيقة)' },
  { value: 90, label: 'كل ساعة ونصف (90 دقيقة)' },
  { value: 120, label: 'كل ساعتين (120 دقيقة)' }
];

const PRAYERS_LIST = [
  { key: 'fajr', label: 'الفجر' },
  { key: 'sunrise', label: 'الشروق' },
  { key: 'dhuhr', label: 'الظهر' },
  { key: 'asr', label: 'العصر' },
  { key: 'maghrib', label: 'المغرب' },
  { key: 'isha', label: 'العشاء' }
];

const formatInterval = (mins?: number) => {
  const m = Number(mins || 30);
  if (m === 15) return 'ربع ساعة (15 دقيقة)';
  if (m === 30) return 'نصف ساعة (30 دقيقة)';
  if (m === 45) return '45 دقيقة';
  if (m === 60) return 'ساعة واحدة (60 دقيقة)';
  if (m === 90) return 'ساعة ونصف (90 دقيقة)';
  if (m === 120) return 'ساعتين (120 دقيقة)';
  return `${m} دقيقة`;
};

const getPrayerLabel = (key?: string | null) => {
  if (!key) return '';
  const match = PRAYERS_LIST.find(p => p.key === key);
  return match ? match.label : key;
};

export const TimeWindowsManager: React.FC = () => {
  const [windows, setWindows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsgText, setNewMsgText] = useState<{ [winId: string]: string }>({});
  const [newMsgCat, setNewMsgCat] = useState<{ [winId: string]: string }>({});
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  // Form state
  const [winForm, setWinForm] = useState({
    name: 'أذكار الصباح',
    routine_type: 'trackable' as 'trackable' | 'continuous',
    timing_type: 'prayer_relative' as 'prayer_relative' | 'fixed_time',
    start_prayer: 'fajr',
    start_offset_mins: 30,
    end_prayer: 'dhuhr',
    end_offset_mins: -30,
    end_fixed_time: '23:00',
    start_time: '09:00',
    end_time: '17:00',
    interval_mins: 30,
    icon: 'Sunrise'
  });

  // Edit form state
  const [editingWinId, setEditingWinId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const fetchWindows = async () => {
    try {
      const res = await fetch('/api/windows');
      if (res.ok) {
        const data = await res.json();
        if (!data.offline && data.windows) {
          setWindows(data.windows);
          try {
            localStorage.setItem('cached_time_windows', JSON.stringify(data.windows));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {
      console.warn('Network error loading windows, checking offline cache:', e);
    } finally {
      setLoading(false);
    }

    try {
      const cached = localStorage.getItem('cached_time_windows');
      if (cached) {
        setWindows(JSON.parse(cached));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchWindows();
  }, []);

  const handleToggleActive = async (winId: string, currentActive: number) => {
    try {
      await fetch(`/api/windows/${winId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentActive ? 0 : 1 })
      });
      fetchWindows();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleComplete = async (winId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      // Optimistic update
      setWindows(prev =>
        prev.map(w => (w.id === winId ? { ...w, todayStatus: newStatus } : w))
      );

      const res = await fetch('/api/routines/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine_id: winId, status: newStatus })
      });

      if (res.ok) {
        if (newStatus === 'completed') {
          setTriggerStatus('تقبل الله طاعتكم! 📿 تم تسجيل القراءة بنجاح، ولن تصلك إشعارات إضافية اليوم.');
        } else {
          setTriggerStatus('تم إلغاء التحديد وإعادة تفعيل التذكيرات لليوم.');
        }
        setTimeout(() => setTriggerStatus(null), 4000);
      } else {
        fetchWindows();
      }
    } catch (e) {
      fetchWindows();
    }
  };

  const handleQuickChangeInterval = async (winId: string, intervalMins: number) => {
    try {
      setTriggerStatus(`جاري تحديث التكرار إلى: ${formatInterval(intervalMins)}...`);
      const res = await fetch(`/api/windows/${winId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval_mins: intervalMins })
      });
      if (res.ok) {
        setTriggerStatus(`تم تعديل التكرار بنجاح إلى: كل ${formatInterval(intervalMins)} 🎉`);
        setTimeout(() => setTriggerStatus(null), 4000);
        fetchWindows();
      }
    } catch (e) {
      setTriggerStatus(null);
    }
  };

  const handleStartEdit = (win: any) => {
    setEditingWinId(win.id);
    setEditForm({
      name: win.name,
      routine_type: win.routine_type || 'trackable',
      timing_type: win.timing_type || 'prayer_relative',
      start_prayer: win.start_prayer || 'fajr',
      start_offset_mins: win.start_offset_mins ?? 30,
      end_prayer: win.end_prayer || 'dhuhr',
      end_offset_mins: win.end_offset_mins ?? -30,
      end_fixed_time: win.end_fixed_time || '23:00',
      start_time: win.start_time || '09:00',
      end_time: win.end_time || '17:00',
      interval_mins: Number(win.interval_mins) || 30,
      icon: win.icon || 'Sunrise'
    });
  };

  const handleCancelEdit = () => {
    setEditingWinId(null);
  };

  const handleSaveEdit = async (winId: string) => {
    try {
      const res = await fetch(`/api/windows/${winId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingWinId(null);
        setTriggerStatus('تم حفظ التعديلات بنجاح! ✨');
        setTimeout(() => setTriggerStatus(null), 4000);
        fetchWindows();
      }
    } catch (e: any) {
      alert(e?.message);
    }
  };

  const handleAddMessage = async (winId: string) => {
    const text = newMsgText[winId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`/api/windows/${winId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_text: text.trim(),
          category: newMsgCat[winId] || 'dhikr'
        })
      });

      if (res.ok) {
        setNewMsgText(prev => ({ ...prev, [winId]: '' }));
        fetchWindows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (winId: string, msgId: string) => {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    try {
      await fetch(`/api/windows/${winId}/messages?messageId=${msgId}`, {
        method: 'DELETE'
      });
      fetchWindows();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWindow = async (winId: string) => {
    if (!confirm('هل تريد حذف هذا الروتين بجميع رسائله؟')) return;
    try {
      await fetch(`/api/windows/${winId}`, { method: 'DELETE' });
      fetchWindows();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerRandomNow = async (winId: string) => {
    setTriggerStatus('جاري إرسال إشعار تجريبي تفاعلي إلى أجهزتك...');
    try {
      const res = await fetch(`/api/windows/${winId}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTriggerStatus(`تم إرسال الإشعار بنجاح: "${data.messageText}"`);
        setTimeout(() => setTriggerStatus(null), 5000);
      } else {
        alert(data.error || 'فشل الإرسال');
        setTriggerStatus(null);
      }
    } catch (e: any) {
      alert(e?.message);
      setTriggerStatus(null);
    }
  };

  const handleApplyPreset = (presetKey: string) => {
    if (presetKey === 'morning') {
      setWinForm({
        name: 'أذكار الصباح',
        routine_type: 'trackable',
        timing_type: 'prayer_relative',
        start_prayer: 'fajr',
        start_offset_mins: 30,
        end_prayer: 'dhuhr',
        end_offset_mins: -30,
        end_fixed_time: '12:00',
        start_time: '05:30',
        end_time: '11:30',
        interval_mins: 30,
        icon: 'Sunrise'
      });
    } else if (presetKey === 'evening') {
      setWinForm({
        name: 'أذكار المساء',
        routine_type: 'trackable',
        timing_type: 'prayer_relative',
        start_prayer: 'asr',
        start_offset_mins: 0,
        end_prayer: 'maghrib',
        end_offset_mins: 0,
        end_fixed_time: '18:00',
        start_time: '15:00',
        end_time: '17:30',
        interval_mins: 30,
        icon: 'Sunset'
      });
    } else if (presetKey === 'quran') {
      setWinForm({
        name: 'ورد القرآن الكريم',
        routine_type: 'trackable',
        timing_type: 'prayer_relative',
        start_prayer: 'fajr',
        start_offset_mins: 30,
        end_prayer: 'isha',
        end_offset_mins: 0,
        end_fixed_time: '23:00',
        start_time: '06:00',
        end_time: '23:00',
        interval_mins: 60,
        icon: 'BookOpen'
      });
    } else if (presetKey === 'work') {
      setWinForm({
        name: 'فترة العمل والتركيز',
        routine_type: 'continuous',
        timing_type: 'fixed_time',
        start_prayer: 'dhuhr',
        start_offset_mins: 0,
        end_prayer: 'asr',
        end_offset_mins: 0,
        end_fixed_time: '17:00',
        start_time: '09:00',
        end_time: '17:00',
        interval_mins: 60,
        icon: 'Briefcase'
      });
    }
    setShowAddWindow(true);
  };

  const handleCreateWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(winForm)
      });
      if (res.ok) {
        setShowAddWindow(false);
        fetchWindows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const trackableRoutines = windows.filter(w => (w.routine_type || 'trackable') === 'trackable');
  const continuousWindows = windows.filter(w => w.routine_type === 'continuous');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Alert */}
      {triggerStatus && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fadeIn shadow-lg shadow-teal-500/10">
          <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
          <span>{triggerStatus}</span>
        </div>
      )}

      {/* Quick Presets Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span>قوالب أوراد وتذكيرات سريعة بضغطة زر</span>
              <span className="text-emerald-400">⚡</span>
            </h3>
            <p className="text-xs text-slate-400">أضف الأوراد اليومية الشائعة بإعداداتها الموصى بها فوراً</p>
          </div>
          <button
            onClick={() => {
              setWinForm({
                name: '',
                routine_type: 'trackable',
                timing_type: 'prayer_relative',
                start_prayer: 'fajr',
                start_offset_mins: 30,
                end_prayer: 'dhuhr',
                end_offset_mins: -30,
                end_fixed_time: '23:00',
                start_time: '09:00',
                end_time: '17:00',
                interval_mins: 30,
                icon: 'Clock'
              });
              setShowAddWindow(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>تخصيص روتين جديد</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => handleApplyPreset('morning')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 hover:border-amber-400/60 text-right transition active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Sunrise className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">أذكار الصباح</div>
              <div className="text-[10px] text-amber-400/80 truncate">بعد الفجر إلى قبل الظهر</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('evening')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-orange-500/30 hover:border-orange-400/60 text-right transition active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Sunset className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">أذكار المساء</div>
              <div className="text-[10px] text-orange-400/80 truncate">بعد العصر إلى المغرب</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('quran')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 hover:border-emerald-400/60 text-right transition active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">ورد القرآن الكريم</div>
              <div className="text-[10px] text-emerald-400/80 truncate">طوال اليوم حتى 11 م</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('work')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-teal-500/30 hover:border-teal-400/60 text-right transition active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">فترة العمل والتركيز</div>
              <div className="text-[10px] text-teal-400/80 truncate">تذكير مستمر بدون توقف</div>
            </div>
          </button>
        </div>
      </div>

      {/* Add New Routine / Window Modal/Form */}
      {showAddWindow && (
        <form onSubmit={handleCreateWindow} className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-400" />
              <span>إضافة روتين أو فترة جديدة</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddWindow(false)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Routine Type Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                winForm.routine_type === 'trackable'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="routine_type"
                value="trackable"
                checked={winForm.routine_type === 'trackable'}
                onChange={() => setWinForm({ ...winForm, routine_type: 'trackable' })}
                className="mt-1"
              />
              <div>
                <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-emerald-300">
                  <span>📿 وِرد يومي بمتابعة وتأكيد</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200">موصى به للأذكار</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  يصلك إشعار تفاعلي بزر <strong>(قرأت ✅)</strong>، ويتوقف التكرار فور تأكيدك للقراءة لباقي اليوم.
                </p>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                winForm.routine_type === 'continuous'
                  ? 'bg-teal-500/10 border-teal-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="routine_type"
                value="continuous"
                checked={winForm.routine_type === 'continuous'}
                onChange={() => setWinForm({ ...winForm, routine_type: 'continuous' })}
                className="mt-1"
              />
              <div>
                <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-teal-300">
                  <span>🎯 تذكيرات تحفيز مستمرة</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  لفترات العمل والدراسة؛ تذكيرات تتكرر دورياً طوال الفترة بدون اشتراط إنجاز لكسر السرحان.
                </p>
              </div>
            </label>
          </div>

          {/* 2. Basic Info & Timing Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">اسم الروتين / الفترة</label>
              <input
                type="text"
                placeholder="مثال: أذكار الصباح، ورد القرآن، العمل العميق..."
                required
                value={winForm.name}
                onChange={e => setWinForm({ ...winForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">طريقة تحديد التوقيت</label>
              <select
                value={winForm.timing_type}
                onChange={e => setWinForm({ ...winForm, timing_type: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-teal-500 outline-none cursor-pointer"
              >
                <option value="prayer_relative">مرتبط بمواقيت الصلاة ديناميكياً (فلكي)</option>
                <option value="fixed_time">ساعات محددة ثابتة بالساعة (HH:MM)</option>
              </select>
            </div>
          </div>

          {/* 3. Timing Details */}
          {winForm.timing_type === 'prayer_relative' ? (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-teal-300">نافذة التوقيت المرتبطة بالصلاة:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">وقت البداية:</label>
                  <div className="flex gap-2">
                    <select
                      value={winForm.start_prayer}
                      onChange={e => setWinForm({ ...winForm, start_prayer: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                    >
                      {PRAYERS_LIST.map(p => (
                        <option key={p.key} value={p.key}>
                          صلاة {p.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={winForm.start_offset_mins}
                      onChange={e => setWinForm({ ...winForm, start_offset_mins: Number(e.target.value) })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 text-xs focus:border-teal-500 outline-none"
                    >
                      <option value={0}>عند الأذان مباشرة</option>
                      <option value={15}>بعدها بـ 15 دقيقة</option>
                      <option value={30}>بعدها بـ 30 دقيقة</option>
                      <option value={45}>بعدها بـ 45 دقيقة</option>
                      <option value={60}>بعدها بساعة</option>
                    </select>
                  </div>
                </div>

                {/* End */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">وقت النهاية:</label>
                  <div className="flex gap-2">
                    <select
                      value={winForm.end_prayer}
                      onChange={e => setWinForm({ ...winForm, end_prayer: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                    >
                      {PRAYERS_LIST.map(p => (
                        <option key={p.key} value={p.key}>
                          صلاة {p.label}
                        </option>
                      ))}
                      <option value="fixed_night">ساعة محددة ليلاً (11:00 م)</option>
                    </select>
                    {winForm.end_prayer !== 'fixed_night' ? (
                      <select
                        value={winForm.end_offset_mins}
                        onChange={e => setWinForm({ ...winForm, end_offset_mins: Number(e.target.value) })}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 text-xs focus:border-teal-500 outline-none"
                      >
                        <option value={0}>عند الأذان تماماً</option>
                        <option value={-15}>قبلها بـ 15 دقيقة</option>
                        <option value={-30}>قبلها بـ 30 دقيقة</option>
                        <option value={30}>بعدها بـ 30 دقيقة</option>
                      </select>
                    ) : (
                      <input
                        type="time"
                        value={winForm.end_fixed_time}
                        onChange={e => setWinForm({ ...winForm, end_fixed_time: e.target.value })}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">وقت البداية</label>
                <input
                  type="time"
                  required
                  value={winForm.start_time}
                  onChange={e => setWinForm({ ...winForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">وقت النهاية</label>
                <input
                  type="time"
                  required
                  value={winForm.end_time}
                  onChange={e => setWinForm({ ...winForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* 4. Repetition Interval */}
          <div>
            <label className="text-xs text-slate-300 block mb-1 font-semibold">
              تكرار الإشعار طوال الفترة
            </label>
            <select
              value={winForm.interval_mins}
              onChange={e => setWinForm({ ...winForm, interval_mins: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-teal-300 font-semibold text-xs focus:border-teal-500 outline-none cursor-pointer"
            >
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-teal-400/80 mt-1">
              {winForm.routine_type === 'trackable'
                ? '💡 سيتكرر الإشعار بهذا المعدل حتى تقوم بالضغط على "قرأت ✅" فيتوقف فوراً لليوم.'
                : '💡 سيستمر إرسال رسائل التذكير والتركيز بهذا المعدل طوال مدة الفترة.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddWindow(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-extrabold hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/20"
            >
              حفظ الروتين
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: أوراد اليوم (Trackable Routines)              */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              📿
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                أوراد وعبادات اليوم بمتابعة وتأكيد
              </h3>
              <p className="text-xs text-slate-400">
                تتكرر الإشعارات التفاعلية طوال وقت الورد، وتتوقف تلقائياً بمجرد تأكيدك للقراءة
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
            {trackableRoutines.filter(r => r.todayStatus === 'completed').length} من {trackableRoutines.length} مكتمل اليوم
          </span>
        </div>

        {trackableRoutines.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
            <p className="text-sm text-slate-400">لا توجد أوراد يومية مضافة بعد.</p>
            <p className="text-xs text-slate-500 mt-1">
              اختر أحد القوالب السريعة بالأعلى (أذكار الصباح، أذكار المساء، ورد القرآن) للبدء بنقرة واحدة!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trackableRoutines.map(routine => {
              const isCompleted = routine.todayStatus === 'completed';
              const isActive = !!routine.is_active;
              const isEditing = editingWinId === routine.id;
              const messages = routine.messages || [];

              // Timing subtitle
              let timingText = '';
              if (routine.timing_type === 'prayer_relative' && routine.start_prayer) {
                const sOffset = Number(routine.start_offset_mins || 0);
                const sOffsetStr = sOffset === 0 ? '' : sOffset > 0 ? ` +${sOffset}د` : ` ${sOffset}د`;
                const eOffset = Number(routine.end_offset_mins || 0);
                const eOffsetStr = eOffset === 0 ? '' : eOffset > 0 ? ` +${eOffset}د` : ` ${eOffset}د`;
                timingText = `بعد ${getPrayerLabel(routine.start_prayer)}${sOffsetStr} حتى ${
                  routine.end_prayer ? getPrayerLabel(routine.end_prayer) + eOffsetStr : routine.end_fixed_time || 'العشاء'
                }`;
              } else {
                timingText = `${routine.start_time} - ${routine.end_time}`;
              }

              return (
                <div
                  key={routine.id}
                  className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col justify-between gap-4 ${
                    isCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                      : isActive
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700/90 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleToggleActive(routine.id, routine.is_active)}
                          title={isActive ? 'تعطيل الروتين' : 'تفعيل الروتين'}
                          className="text-slate-400 hover:text-white"
                        >
                          {isActive ? (
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-600" />
                          )}
                        </button>
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>{routine.name}</span>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </h4>
                          <span className="text-xs text-emerald-400/90 font-medium font-mono">
                            {timingText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTriggerRandomNow(routine.id)}
                          title="تجربة إشعار تفاعلي فوري الآن"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition"
                        >
                          <Shuffle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => (isEditing ? handleCancelEdit() : handleStartEdit(routine))}
                          title="تعديل الروتين"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWindow(routine.id)}
                          title="حذف"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-bar: Interval & Messages count */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 my-2 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
                        <Repeat className="w-3 h-3 text-emerald-400" />
                        <span className="text-[11px] text-slate-300">التكرار:</span>
                        <select
                          value={routine.interval_mins || 30}
                          onChange={e => handleQuickChangeInterval(routine.id, Number(e.target.value))}
                          className="bg-slate-900 border border-slate-700 text-emerald-300 text-[11px] rounded px-1 py-0.5 outline-none font-semibold cursor-pointer"
                        >
                          {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-slate-500">•</span>
                      <span className="text-[11px] text-slate-400">{messages.length} رسالة في البنك</span>
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {isEditing && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-teal-300">تعديل الروتين:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">الاسم</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">التكرار</label>
                          <select
                            value={editForm.interval_mins}
                            onChange={e => setEditForm({ ...editForm, interval_mins: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300 text-xs outline-none font-semibold"
                          >
                            {INTERVAL_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={() => handleSaveEdit(routine.id)}
                          className="px-3 py-1 rounded-lg bg-teal-500 text-slate-950 font-bold text-xs"
                        >
                          حفظ
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Big Action Button: Mark Completed for Today */}
                  <div>
                    {isCompleted ? (
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>تمت القراءة اليوم بنجاح 🎉 (توقفت التنبيهات)</span>
                        </div>
                        <button
                          onClick={() => handleToggleComplete(routine.id, 'completed')}
                          title="تراجع عن القراءة"
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>تراجع</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleComplete(routine.id, 'pending')}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>قراءة الورد / تسجيل كـ "قرأت" ✅</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: فترات التركيز المستمرة (Continuous Focus)      */}
      {/* ======================================================== */}
      <div className="space-y-4 pt-6 border-t border-slate-800/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
              🎯
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                فترات التركيز والعمل ومحاربة التشتت
              </h3>
              <p className="text-xs text-slate-400">
                تنبيهات مستمرة طوال فترة العمل/الدراسة دون اشتراط رد لتنشيط الانتباه وكسر السرحان
              </p>
            </div>
          </div>
        </div>

        {continuousWindows.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
            <p className="text-sm text-slate-400">لا توجد فترات عمل أو تركيز مستمرة مضافة.</p>
            <button
              onClick={() => handleApplyPreset('work')}
              className="mt-2 text-xs font-bold text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة فترة العمل والتركيز بنقرة واحدة</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {continuousWindows.map(win => {
              const isActive = !!win.is_active;
              const messages = win.messages || [];

              return (
                <div
                  key={win.id}
                  className={`rounded-2xl border transition-all ${
                    isActive ? 'bg-slate-900/90 border-slate-700/80 shadow-md' : 'bg-slate-950/60 border-slate-800/50 opacity-60'
                  }`}
                >
                  {/* Bar Header */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleActive(win.id, win.is_active)}
                        title={isActive ? 'تعطيل الفترة' : 'تفعيل الفترة'}
                        className="text-slate-400 hover:text-white"
                      >
                        {isActive ? (
                          <ToggleRight className="w-7 h-7 text-teal-400" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-slate-600" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{win.name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                            {win.start_time} - {win.end_time}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
                            <Repeat className="w-3 h-3 text-teal-400" />
                            <span className="text-[11px] text-slate-300">التكرار:</span>
                            <select
                              value={win.interval_mins || 60}
                              onChange={e => handleQuickChangeInterval(win.id, Number(e.target.value))}
                              className="bg-slate-900 border border-slate-700 text-teal-300 text-[11px] rounded px-1 py-0.5 outline-none font-semibold cursor-pointer"
                            >
                              {INTERVAL_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <span>•</span>
                          <span className="text-[11px] text-emerald-400/90 font-medium">
                            🎲 رسائل عشوائية مستمرة
                          </span>
                          <span>•</span>
                          <span className="text-[11px] text-slate-400">{messages.length} رسالة</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleTriggerRandomNow(win.id)}
                        disabled={messages.length === 0}
                        title="تجربة إشعار عشوائي فوري"
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>تجربة إشعار</span>
                      </button>
                      <button
                        onClick={() => handleDeleteWindow(win.id)}
                        title="حذف"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Messages Pool Content */}
                  <div className="p-4 sm:p-5">
                    <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                      <span>بنك رسائل هذه الفترة (يتم اختيار رسالة منها عشوائياً في كل تكرار):</span>
                    </div>

                    {messages.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        لا توجد رسائل بعد. أضف رسائل توجيهية أو تذكيرات أدناه.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
                        {messages.map((m: any) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 group transition"
                          >
                            <div className="text-xs text-slate-200 leading-relaxed font-medium">
                              {m.message_text}
                            </div>
                            <button
                              onClick={() => handleDeleteMessage(win.id, m.id)}
                              title="حذف الرسالة"
                              className="text-slate-600 hover:text-rose-400 p-1 opacity-60 group-hover:opacity-100 transition shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Message Input */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-slate-800/60">
                      <input
                        type="text"
                        placeholder="أضف تذكيراً أو هدفاً جديداً هنا..."
                        value={newMsgText[win.id] || ''}
                        onChange={e => setNewMsgText({ ...newMsgText, [win.id]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMessage(win.id);
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-teal-500 outline-none"
                      />

                      <select
                        value={newMsgCat[win.id] || 'focus'}
                        onChange={e => setNewMsgCat({ ...newMsgCat, [win.id]: e.target.value })}
                        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-teal-500 outline-none cursor-pointer"
                      >
                        <option value="focus">🎯 تركيز وأهداف</option>
                        <option value="health">💧 صحة وماء</option>
                        <option value="dhikr">✨ ذكر ودعاء</option>
                        <option value="break">☕ راحة واستراحة</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAddMessage(win.id)}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center justify-center gap-1 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة للبنوك</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
