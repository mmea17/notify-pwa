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
  ChevronDown,
  ChevronUp,
  Target,
  Trophy,
  Dumbbell,
  Languages,
  Activity
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

const formatClockTimeArabic = (timeStr?: string | null) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const isPM = hour >= 12;
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${isPM ? 'م' : 'ص'}`;
};

export const TimeWindowsManager: React.FC = () => {
  const [windows, setWindows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsgText, setNewMsgText] = useState<{ [winId: string]: string }>({});
  const [newMsgCat, setNewMsgCat] = useState<{ [winId: string]: string }>({});
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  // Expanded message bank accordion for routine cards
  const [expandedBankWinId, setExpandedBankWinId] = useState<string | null>(null);

  // Form state
  const [winForm, setWinForm] = useState({
    name: 'أذكار الصباح',
    routine_type: 'athkar' as 'athkar' | 'habit' | 'continuous',
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

  const handleToggleComplete = async (winId: string, currentStatus: string, routineType?: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const isHabit = routineType === 'habit';
    try {
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
          if (isHabit) {
            setTriggerStatus('ألف مبروك الإنجاز! 🏆 تم تسجيل إتمام العادة بنجاح، ولن تصلك إشعارات إضافية اليوم.');
          } else {
            setTriggerStatus('تقبل الله طاعتكم! 📿 تم تسجيل القراءة بنجاح، ولن تصلك إشعارات إضافية اليوم.');
          }
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
    const isFixedClock = !win.end_prayer || win.end_prayer === 'fixed_clock' || win.end_prayer === 'fixed_night';
    setEditForm({
      name: win.name,
      routine_type: win.routine_type || 'athkar',
      timing_type: win.timing_type || 'prayer_relative',
      start_prayer: win.start_prayer || 'fajr',
      start_offset_mins: win.start_offset_mins ?? 30,
      end_prayer: isFixedClock ? 'fixed_clock' : win.end_prayer,
      end_offset_mins: win.end_offset_mins ?? 0,
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
      const payload = {
        ...editForm,
        end_prayer: editForm.end_prayer === 'fixed_clock' ? null : editForm.end_prayer
      };
      const res = await fetch(`/api/windows/${winId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingWinId(null);
        setTriggerStatus('تم حفظ التعديلات بنجاح! ✨');
        setTimeout(() => setTriggerStatus(null), 4000);
        fetchWindows();
      } else {
        alert('فشل حفظ التعديلات');
      }
    } catch (e: any) {
      alert(e?.message);
    }
  };

  const handleAddMessage = async (winId: string, defaultCategory: string = 'dhikr') => {
    const text = newMsgText[winId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`/api/windows/${winId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_text: text.trim(),
          category: newMsgCat[winId] || defaultCategory
        })
      });

      if (res.ok) {
        setNewMsgText(prev => ({ ...prev, [winId]: '' }));
        setTriggerStatus('تمت إضافة الرسالة بنجاح إلى بنك الرسائل! ✨');
        setTimeout(() => setTriggerStatus(null), 3500);
        fetchWindows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (winId: string, msgId: string) => {
    if (!confirm('هل تريد حذف هذه الرسالة من البنك؟')) return;
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
        routine_type: 'athkar',
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
        routine_type: 'athkar',
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
        routine_type: 'athkar',
        timing_type: 'prayer_relative',
        start_prayer: 'fajr',
        start_offset_mins: 30,
        end_prayer: 'fixed_clock',
        end_offset_mins: 0,
        end_fixed_time: '23:00',
        start_time: '06:00',
        end_time: '23:00',
        interval_mins: 60,
        icon: 'BookOpen'
      });
    } else if (presetKey === 'english') {
      setWinForm({
        name: 'ممارسة اللغة الإنجليزية',
        routine_type: 'habit',
        timing_type: 'fixed_time',
        start_prayer: 'asr',
        start_offset_mins: 0,
        end_prayer: 'fixed_clock',
        end_offset_mins: 0,
        end_fixed_time: '23:00',
        start_time: '18:00',
        end_time: '23:00',
        interval_mins: 45,
        icon: 'Languages'
      });
    } else if (presetKey === 'workout') {
      setWinForm({
        name: 'الرياضة اليومية',
        routine_type: 'habit',
        timing_type: 'fixed_time',
        start_prayer: 'asr',
        start_offset_mins: 0,
        end_prayer: 'maghrib',
        end_offset_mins: 0,
        end_fixed_time: '21:00',
        start_time: '16:00',
        end_time: '20:00',
        interval_mins: 45,
        icon: 'Activity'
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
      const payload = {
        ...winForm,
        end_prayer: winForm.end_prayer === 'fixed_clock' ? null : winForm.end_prayer
      };
      const res = await fetch('/api/windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAddWindow(false);
        fetchWindows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3-way split
  const athkarRoutines = windows.filter(w => {
    const t = w.routine_type;
    return t === 'athkar' || (t === 'trackable' && !w.name?.includes('انجليز') && !w.name?.includes('رياض'));
  });

  const habitRoutines = windows.filter(w => {
    const t = w.routine_type;
    return t === 'habit' || (t === 'trackable' && (w.name?.includes('انجليز') || w.name?.includes('رياض')));
  });

  const continuousWindows = windows.filter(w => w.routine_type === 'continuous');

  // Shared Routine Card Renderer for Athkar & Habits
  const renderRoutineCard = (routine: any, isHabit: boolean) => {
    const isCompleted = routine.todayStatus === 'completed';
    const isActive = !!routine.is_active;
    const isEditing = editingWinId === routine.id;
    const isBankExpanded = expandedBankWinId === routine.id;
    const messages = routine.messages || [];

    // Clean Timing Description
    let timingText = '';
    if (routine.timing_type === 'prayer_relative' && routine.start_prayer) {
      const sOffset = Number(routine.start_offset_mins || 0);
      const sOffsetStr = sOffset === 0 ? '' : sOffset > 0 ? ` +${sOffset}د` : ` ${sOffset}د`;

      let endDesc = '';
      if (routine.end_prayer && routine.end_prayer !== 'fixed_clock' && routine.end_prayer !== 'fixed_night') {
        const eOffset = Number(routine.end_offset_mins || 0);
        const eOffsetStr = eOffset === 0 ? '' : eOffset > 0 ? ` +${eOffset}د` : ` ${eOffset}د`;
        endDesc = `حتى صلاة ${getPrayerLabel(routine.end_prayer)}${eOffsetStr}`;
      } else if (routine.end_fixed_time) {
        endDesc = `حتى الساعة ${formatClockTimeArabic(routine.end_fixed_time)}`;
      } else {
        endDesc = 'حتى العشاء';
      }

      timingText = `بعد ${getPrayerLabel(routine.start_prayer)}${sOffsetStr} ${endDesc}`;
    } else {
      timingText = `من ${formatClockTimeArabic(routine.start_time)} إلى ${formatClockTimeArabic(routine.end_time)}`;
    }

    const themeColors = isHabit
      ? {
          cardCompletedBg: 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5',
          toggleActiveText: 'text-amber-400',
          accentText: 'text-amber-400',
          repeatIconText: 'text-amber-400',
          selectText: 'text-amber-300',
          badgeActiveBg: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
          btnDoneBg: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold',
          doneBadgeText: 'تم إنجاز العادة اليوم بنجاح 🏆 (توقفت التنبيهات)',
          doneBtnText: 'إتمام العادة / تسجيل كـ "أنجزت" ✅',
          bankTitle: `بنك أفكار وخطوات ${routine.name}:`,
          bankPlaceholder: 'أضف رسالة تحفيزية أو خطوة لممارسة العادة...',
          bankBtnBg: 'bg-amber-600 hover:bg-amber-500 text-slate-950',
          emptyBankDesc: 'لا توجد رسائل مخصصة بعد. سيصلك التذكير التحفيزي الافتراضي باسم العادة، أو أضف خطوات وتشجيعات يختار منها النظام عشوائياً.'
        }
      : {
          cardCompletedBg: 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5',
          toggleActiveText: 'text-emerald-400',
          accentText: 'text-emerald-400',
          repeatIconText: 'text-emerald-400',
          selectText: 'text-emerald-300',
          badgeActiveBg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
          btnDoneBg: 'bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold',
          doneBadgeText: 'تمت القراءة اليوم بنجاح 🎉 (توقفت التنبيهات)',
          doneBtnText: 'قراءة الورد / تسجيل كـ "قرأت" ✅',
          bankTitle: `بنك أذكار ورسائل ${routine.name}:`,
          bankPlaceholder: 'اكتب ذكراً أو دعاءً أو توجيهاً لهذا الورد...',
          bankBtnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          emptyBankDesc: 'لا توجد رسائل مخصصة بعد. سيصلك التذكير الافتراضي باسم الورد، أو يمكنك إضافة أذكار وآيات محددة أدناه ليختار منها النظام عشوائياً في كل إشعار.'
        };

    return (
      <div
        key={routine.id}
        className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col justify-between gap-4 ${
          isCompleted
            ? themeColors.cardCompletedBg
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
                  <ToggleRight className={`w-6 h-6 ${themeColors.toggleActiveText}`} />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </button>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{routine.name}</span>
                  {isCompleted && (
                    <CheckCircle2 className={`w-4 h-4 ${themeColors.accentText} shrink-0`} />
                  )}
                </h4>
                <span className={`text-xs font-semibold ${themeColors.accentText}`}>
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
                title="تعديل الروتين والتوقيت"
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

          {/* Sub-bar: Interval & Message Bank Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 my-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
              <Repeat className={`w-3 h-3 ${themeColors.repeatIconText}`} />
              <span className="text-[11px] text-slate-300">التكرار:</span>
              <select
                value={routine.interval_mins || 30}
                onChange={e => handleQuickChangeInterval(routine.id, Number(e.target.value))}
                className={`bg-slate-900 border border-slate-700 ${themeColors.selectText} text-[11px] rounded px-1 py-0.5 outline-none font-semibold cursor-pointer`}
              >
                {INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Button to Open/Close Message Bank */}
            <button
              onClick={() => setExpandedBankWinId(isBankExpanded ? null : routine.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                isBankExpanded
                  ? themeColors.badgeActiveBg
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
              title="إضافة وعرض رسائل هذا الروتين"
            >
              <MessageSquare className={`w-3.5 h-3.5 ${themeColors.accentText}`} />
              <span>بنك الرسائل ({messages.length})</span>
              {isBankExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              )}
            </button>
          </div>
        </div>

        {/* Complete Inline Edit Form */}
        {isEditing && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-bold text-teal-300">تعديل تفاصيل وأوقات الروتين:</span>
              <button onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-white">إلغاء</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">اسم الروتين</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">القسم / النوع</label>
                <select
                  value={editForm.routine_type || (isHabit ? 'habit' : 'athkar')}
                  onChange={e => setEditForm({ ...editForm, routine_type: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 text-xs outline-none font-semibold cursor-pointer"
                >
                  <option value="athkar">📿 وِرد ديني (زر "قرأت ✅")</option>
                  <option value="habit">🎯 عادة يومية (زر "أنجزت ✅")</option>
                  <option value="continuous">⏱️ فترة تركيز مستمرة</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">تكرار الإشعار</label>
                <select
                  value={editForm.interval_mins}
                  onChange={e => setEditForm({ ...editForm, interval_mins: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300 text-xs outline-none font-semibold"
                >
                  {INTERVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timing options in edit */}
            {editForm.timing_type === 'prayer_relative' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/80">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">البداية:</label>
                  <div className="flex gap-1.5">
                    <select
                      value={editForm.start_prayer}
                      onChange={e => setEditForm({ ...editForm, start_prayer: e.target.value })}
                      className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      {PRAYERS_LIST.map(p => (
                        <option key={p.key} value={p.key}>صلاة {p.label}</option>
                      ))}
                    </select>
                    <select
                      value={editForm.start_offset_mins}
                      onChange={e => setEditForm({ ...editForm, start_offset_mins: Number(e.target.value) })}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-teal-300 text-xs"
                    >
                      <option value={0}>عند الأذان</option>
                      <option value={15}>+15 د</option>
                      <option value={30}>+30 د</option>
                      <option value={45}>+45 د</option>
                      <option value={60}>+60 د</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">النهاية (صلاة أو ساعة محددة):</label>
                  <div className="space-y-1">
                    <select
                      value={editForm.end_prayer}
                      onChange={e => setEditForm({ ...editForm, end_prayer: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      {PRAYERS_LIST.map(p => (
                        <option key={p.key} value={p.key}>صلاة {p.label}</option>
                      ))}
                      <option value="fixed_clock">ساعة محددة باليوم (اختر الوقت)</option>
                    </select>

                    {editForm.end_prayer !== 'fixed_clock' ? (
                      <select
                        value={editForm.end_offset_mins}
                        onChange={e => setEditForm({ ...editForm, end_offset_mins: Number(e.target.value) })}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-teal-300 text-xs"
                      >
                        <option value={0}>عند الأذان تماماً</option>
                        <option value={-15}>قبلها بـ 15 دقيقة</option>
                        <option value={-30}>قبلها بـ 30 دقيقة</option>
                        <option value={30}>بعدها بـ 30 دقيقة</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={editForm.end_fixed_time || '23:00'}
                          onChange={e => setEditForm({ ...editForm, end_fixed_time: e.target.value })}
                          className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-teal-300 font-bold text-xs"
                        />
                        <span className="text-[11px] text-slate-300 font-semibold">
                          {formatClockTimeArabic(editForm.end_fixed_time)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">البداية</label>
                  <input
                    type="time"
                    value={editForm.start_time}
                    onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">النهاية</label>
                  <input
                    type="time"
                    value={editForm.end_time}
                    onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-1.5 pt-1">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleSaveEdit(routine.id)}
                className="px-4 py-1 rounded-lg bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        )}

        {/* Message Bank Section */}
        {isBankExpanded && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className={`w-3.5 h-3.5 ${themeColors.accentText}`} />
                <span>{themeColors.bankTitle}</span>
              </div>
              <span className="text-[11px] text-slate-500">{messages.length} رسالة مسجلة</span>
            </div>

            {messages.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-400 leading-relaxed">
                {themeColors.emptyBankDesc}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {messages.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 group transition"
                  >
                    <div className="text-xs text-slate-200 leading-relaxed font-medium">
                      • {m.message_text}
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(routine.id, m.id)}
                      title="حذف الرسالة"
                      className="text-slate-600 hover:text-rose-400 p-1 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add message input */}
            <div className="flex gap-2 pt-2 border-t border-slate-800/60">
              <input
                type="text"
                placeholder={themeColors.bankPlaceholder}
                value={newMsgText[routine.id] || ''}
                onChange={e => setNewMsgText({ ...newMsgText, [routine.id]: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMessage(routine.id, isHabit ? 'habit' : 'dhikr');
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:border-teal-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddMessage(routine.id, isHabit ? 'habit' : 'dhikr')}
                className={`px-3 py-1.5 rounded-lg ${themeColors.bankBtnBg} font-bold text-xs transition shrink-0 flex items-center gap-1`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
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
                <span>{themeColors.doneBadgeText}</span>
              </div>
              <button
                onClick={() => handleToggleComplete(routine.id, 'completed', routine.routine_type)}
                title="تراجع عن التحديد"
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              >
                <Undo2 className="w-3 h-3" />
                <span>تراجع</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleToggleComplete(routine.id, 'pending', routine.routine_type)}
              className={`w-full py-2.5 px-4 rounded-xl ${themeColors.btnDoneBg} text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{themeColors.doneBtnText}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

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
              <span>قوالب أوراد وعادات سريعة بضغطة زر</span>
              <span className="text-emerald-400">⚡</span>
            </h3>
            <p className="text-xs text-slate-400">أضف الأوراد والعادات الشائعة بإعداداتها الموصى بها فوراً</p>
          </div>
          <button
            onClick={() => {
              setWinForm({
                name: '',
                routine_type: 'athkar',
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
            <span>تخصيص جديد</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => handleApplyPreset('morning')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 hover:border-amber-400/60 text-right transition active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Sunrise className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">أذكار الصباح</div>
              <div className="text-[10px] text-amber-400/80 truncate">بعد الفجر للظهر</div>
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
              <div className="text-[10px] text-orange-400/80 truncate">بعد العصر للمغرب</div>
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
              <div className="text-xs font-bold text-slate-100 truncate">ورد القرآن</div>
              <div className="text-[10px] text-emerald-400/80 truncate">طوال اليوم</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('english')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-cyan-500/30 hover:border-cyan-400/60 text-right transition active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Languages className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">الإنجليزية</div>
              <div className="text-[10px] text-cyan-400/80 truncate">مساءً بمتابعة</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('workout')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-rose-500/30 hover:border-rose-400/60 text-right transition active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">الرياضة اليومية</div>
              <div className="text-[10px] text-rose-400/80 truncate">عصراً بمتابعة</div>
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
              <div className="text-xs font-bold text-slate-100 truncate">فترة العمل</div>
              <div className="text-[10px] text-teal-400/80 truncate">تذكير مستمر</div>
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
              <span>إضافة روتين أو عادة أو فترة جديدة</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddWindow(false)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Routine Type Selector (3 Sections) */}
          <div>
            <label className="text-xs text-slate-300 block mb-2 font-bold">اختر نوع القسم:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  winForm.routine_type === 'athkar'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="routine_type"
                  value="athkar"
                  checked={winForm.routine_type === 'athkar'}
                  onChange={() => setWinForm({ ...winForm, routine_type: 'athkar' })}
                  className="mt-1"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold flex items-center gap-1 text-emerald-300">
                    <span>📿 وِرد ديني بمتابعة</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 inline-block my-1">
                    أذكار، قرآن
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    إشعار ديني بزر <strong>(قرأت ✅)</strong> يتوقف فور تأكيد القراءة لليوم.
                  </p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  winForm.routine_type === 'habit'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="routine_type"
                  value="habit"
                  checked={winForm.routine_type === 'habit'}
                  onChange={() => setWinForm({ ...winForm, routine_type: 'habit' })}
                  className="mt-1"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold flex items-center gap-1 text-amber-300">
                    <span>🎯 عادة يومية بمتابعة</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 inline-block my-1">
                    إنجليزي، رياضة، قراءة
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    تذكير تحفيزي بزر <strong>(أنجزت ✅)</strong> يتوقف فور إتمامك للعادة اليوم.
                  </p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  winForm.routine_type === 'continuous'
                    ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-lg shadow-teal-500/5'
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
                  <div className="text-xs sm:text-sm font-bold flex items-center gap-1 text-teal-300">
                    <span>⏱️ فترة تركيز مستمرة</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-200 inline-block my-1">
                    عمل، دراسة
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    تذكيرات دورية مستمرة بدون اشتراط رد لمحاربة التشتت وكسر السرحان.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Basic Info & Timing Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">الاسم</label>
              <input
                type="text"
                placeholder="مثال: أذكار الصباح، ممارسة الإنجليزية، فترة العمل..."
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
                  <div className="space-y-2">
                    <select
                      value={winForm.end_prayer}
                      onChange={e => setWinForm({ ...winForm, end_prayer: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                    >
                      {PRAYERS_LIST.map(p => (
                        <option key={p.key} value={p.key}>
                          صلاة {p.label}
                        </option>
                      ))}
                      <option value="fixed_clock">ساعة محددة باليوم (اختر الساعة)</option>
                    </select>

                    {winForm.end_prayer !== 'fixed_clock' ? (
                      <select
                        value={winForm.end_offset_mins}
                        onChange={e => setWinForm({ ...winForm, end_offset_mins: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 text-xs focus:border-teal-500 outline-none"
                      >
                        <option value={0}>عند الأذان تماماً</option>
                        <option value={-15}>قبلها بـ 15 دقيقة</option>
                        <option value={-30}>قبلها بـ 30 دقيقة</option>
                        <option value={30}>بعدها بـ 30 دقيقة</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={winForm.end_fixed_time}
                          onChange={e => setWinForm({ ...winForm, end_fixed_time: e.target.value })}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 font-bold text-xs outline-none"
                        />
                        <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">
                          {formatClockTimeArabic(winForm.end_fixed_time)}
                        </span>
                      </div>
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
              {winForm.routine_type === 'athkar'
                ? '💡 سيتكرر الإشعار بهذا المعدل حتى تقوم بالضغط على "قرأت ✅" فيتوقف فوراً لليوم.'
                : winForm.routine_type === 'habit'
                ? '💡 سيتكرر الإشعار بهذا المعدل حتى تقوم بالضغط على "أنجزت ✅" فيتوقف فوراً لليوم.'
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
              حفظ الإضافة
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: أوراد وعبادات اليوم (Athkar & Worship)         */}
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
                أذكار الصباح والمساء والقرآن؛ تتكرر الإشعارات طوال وقت الورد، وتتوقف تلقائياً بمجرد تأكيدك للقراءة
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
            {athkarRoutines.filter(r => r.todayStatus === 'completed').length} من {athkarRoutines.length} مكتمل اليوم
          </span>
        </div>

        {athkarRoutines.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
            <p className="text-sm text-slate-400">لا توجد أوراد يومية مضافة بعد.</p>
            <p className="text-xs text-slate-500 mt-1">
              اختر أحد القوالب السريعة بالأعلى (أذكار الصباح، أذكار المساء، ورد القرآن) للبدء بنقرة واحدة!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {athkarRoutines.map(routine => renderRoutineCard(routine, false))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: العادات والمهام اليومية (Habits Tracker)      */}
      {/* ======================================================== */}
      <div className="space-y-4 pt-6 border-t border-slate-800/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              🎯
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                العادات والمهام اليومية بمتابعة وإنجاز
              </h3>
              <p className="text-xs text-slate-400">
                ممارسة الإنجليزية، الرياضة، القراءة؛ تتكرر التذكيرات التحفيزية حتى تؤكد إتمامك للعادة بزر (أنجزت ✅)
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
            {habitRoutines.filter(r => r.todayStatus === 'completed').length} من {habitRoutines.length} منجز اليوم
          </span>
        </div>

        {habitRoutines.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
            <p className="text-sm text-slate-400">لا توجد عادات أو مهام يومية مضافة بعد.</p>
            <p className="text-xs text-slate-500 mt-1">
              اضغط على قوالب "الإنجليزية" أو "الرياضة اليومية" بالأعلى أو أضف عادتك الخاصة!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habitRoutines.map(habit => renderRoutineCard(habit, true))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: فترات التركيز المستمرة (Continuous Focus)      */}
      {/* ======================================================== */}
      <div className="space-y-4 pt-6 border-t border-slate-800/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
              ⏱️
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
                            handleAddMessage(win.id, 'focus');
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
                        onClick={() => handleAddMessage(win.id, 'focus')}
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
