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
  Repeat
} from 'lucide-react';

const INTERVAL_OPTIONS = [
  { value: 15, label: 'كل ربع ساعة (15 دقيقة)' },
  { value: 30, label: 'كل نصف ساعة (30 دقيقة)' },
  { value: 45, label: 'كل 45 دقيقة' },
  { value: 60, label: 'كل ساعة (60 دقيقة)' },
  { value: 90, label: 'كل ساعة ونصف (90 دقيقة)' },
  { value: 120, label: 'كل ساعتين (120 دقيقة)' }
];

const formatInterval = (mins?: number) => {
  const m = Number(mins || 60);
  if (m === 15) return 'ربع ساعة (15 دقيقة)';
  if (m === 30) return 'نصف ساعة (30 دقيقة)';
  if (m === 45) return '45 دقيقة';
  if (m === 60) return 'ساعة واحدة (60 دقيقة)';
  if (m === 90) return 'ساعة ونصف (90 دقيقة)';
  if (m === 120) return 'ساعتين (120 دقيقة)';
  return `${m} دقيقة`;
};

export const TimeWindowsManager: React.FC = () => {
  const [windows, setWindows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsgText, setNewMsgText] = useState<{ [winId: string]: string }>({});
  const [newMsgCat, setNewMsgCat] = useState<{ [winId: string]: string }>({});
  const [showAddWindow, setShowAddWindow] = useState(false);

  // Add form state
  const [winForm, setWinForm] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    mode: 'interval',
    fixed_time: '11:00',
    interval_mins: 60
  });

  // Edit form state
  const [editingWinId, setEditingWinId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    mode: 'interval',
    fixed_time: '11:00',
    interval_mins: 60
  });

  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

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

  const handleQuickChangeInterval = async (winId: string, intervalMins: number) => {
    try {
      setTriggerStatus(`جاري تحديث التكرار إلى: ${formatInterval(intervalMins)}...`);
      const res = await fetch(`/api/windows/${winId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval_mins: intervalMins, mode: 'interval' })
      });
      if (res.ok) {
        setTriggerStatus(`تم تعديل تكرار الفترة بنجاح إلى: كل ${formatInterval(intervalMins)} 🎉`);
        setTimeout(() => setTriggerStatus(null), 4000);
        fetchWindows();
      } else {
        alert('فشل تحديث التكرار');
        setTriggerStatus(null);
      }
    } catch (e: any) {
      alert(e?.message);
      setTriggerStatus(null);
    }
  };

  const handleStartEdit = (win: any) => {
    setEditingWinId(win.id);
    setEditForm({
      name: win.name,
      start_time: win.start_time,
      end_time: win.end_time,
      mode: win.mode || 'interval',
      fixed_time: win.fixed_time || '11:00',
      interval_mins: Number(win.interval_mins) || 60
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
        setTriggerStatus('تم حفظ تعديلات الفترة بنجاح! ✨');
        setTimeout(() => setTriggerStatus(null), 4000);
        fetchWindows();
      } else {
        alert('فشل حفظ التعديلات');
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
          category: newMsgCat[winId] || 'focus'
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
    if (!confirm('هل تريد حذف هذه الرسالة من المجموعة؟')) return;
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
    if (!confirm('هل تريد حذف هذه الفترة بجميع رسائلها؟')) return;
    try {
      await fetch(`/api/windows/${winId}`, { method: 'DELETE' });
      fetchWindows();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerRandomNow = async (winId: string) => {
    setTriggerStatus('جاري إرسال إشعار عشوائي إلى أجهزتك...');
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
        setWinForm({
          name: '',
          start_time: '09:00',
          end_time: '17:00',
          mode: 'interval',
          fixed_time: '11:00',
          interval_mins: 60
        });
        fetchWindows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 sm:p-6 mb-8 backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>فترات اليوم وبنك الرسائل ومحاربة التشتت</span>
            <span className="text-teal-400">🎯</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            حدد فترات يومك وبنك رسائل لكل فترة، مع إمكانية ضبط تكرار الإشعار (كل ربع ساعة، كل ساعة، إلخ) ليختار النظام جملاً عشوائية طوال الفترة.
          </p>
        </div>

        <button
          onClick={() => setShowAddWindow(!showAddWindow)}
          className="px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فترة جديدة</span>
        </button>
      </div>

      {triggerStatus && (
        <div className="mb-4 p-3 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
          <span>{triggerStatus}</span>
        </div>
      )}

      {/* Add Window Form */}
      {showAddWindow && (
        <form onSubmit={handleCreateWindow} className="mb-6 p-4 sm:p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-400" />
              <span>إضافة فترة زمنية جديدة</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddWindow(false)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">اسم الفترة</label>
              <input
                type="text"
                placeholder="مثال: فترة العمل الصباحية"
                required
                value={winForm.name}
                onChange={e => setWinForm({ ...winForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">وقت البداية</label>
              <input
                type="time"
                required
                value={winForm.start_time}
                onChange={e => setWinForm({ ...winForm, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">وقت النهاية</label>
              <input
                type="time"
                required
                value={winForm.end_time}
                onChange={e => setWinForm({ ...winForm, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">نمط الإرسال</label>
              <select
                value={winForm.mode}
                onChange={e => setWinForm({ ...winForm, mode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              >
                <option value="interval">تكرار دوري طوال الفترة مع جمل عشوائية (موصى به)</option>
                <option value="fixed">موعد ثابت محدد يومياً</option>
              </select>
            </div>

            {winForm.mode === 'interval' ? (
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">
                  معدل التكرار طوال الفترة
                </label>
                <select
                  value={winForm.interval_mins}
                  onChange={e => setWinForm({ ...winForm, interval_mins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 font-medium text-xs focus:border-teal-500 outline-none"
                >
                  {INTERVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-teal-400/90 mt-1">
                  💡 سيقوم النظام باختيار جملة عشوائية وإرسالها لك طوال الفترة وفق هذا التكرار.
                </p>
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">الموعد الثابت</label>
                <input
                  type="time"
                  value={winForm.fixed_time}
                  onChange={e => setWinForm({ ...winForm, fixed_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowAddWindow(false)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-600 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition"
            >
              حفظ الفترة
            </button>
          </div>
        </form>
      )}

      {/* Windows List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs animate-pulse">جاري تحميل الفترات...</div>
      ) : windows.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          لا توجد فترات مضافة حتى الآن. اضغط على "إضافة فترة جديدة" للبدء.
        </div>
      ) : (
        <div className="space-y-6">
          {windows.map(win => {
            const isActive = !!win.is_active;
            const messages = win.messages || [];
            const isEditing = editingWinId === win.id;

            return (
              <div
                key={win.id}
                className={`rounded-2xl border transition-all ${
                  isActive ? 'bg-slate-900/90 border-slate-700/80 shadow-md' : 'bg-slate-950/60 border-slate-800/50 opacity-60'
                }`}
              >
                {/* Window Bar Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800">
                  <div className="flex items-start sm:items-center gap-3 w-full lg:w-auto">
                    <button
                      onClick={() => handleToggleActive(win.id, win.is_active)}
                      title={isActive ? 'تعطيل الفترة' : 'تفعيل الفترة'}
                      className="text-slate-400 hover:text-white shrink-0 mt-0.5 sm:mt-0"
                    >
                      {isActive ? (
                        <ToggleRight className="w-7 h-7 text-teal-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white">{win.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                          {win.start_time} - {win.end_time}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-2.5">
                        {/* Quick Interval Dropdown directly on the card */}
                        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-lg">
                          <Repeat className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="text-[11px] text-slate-300 font-medium">التكرار:</span>
                          <select
                            value={win.interval_mins || 60}
                            onChange={e => handleQuickChangeInterval(win.id, Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 text-teal-300 text-xs rounded px-1.5 py-0.5 outline-none focus:border-teal-500 font-semibold cursor-pointer"
                            title="تغيير معدل تكرار الإشعار طوال الفترة مباشرة"
                          >
                            {INTERVAL_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-slate-500">•</span>
                        <span className="text-[11px] text-emerald-400/90 font-medium">
                          🎲 رسائل عشوائية
                        </span>

                        <span className="text-slate-500">•</span>
                        <span className="text-[11px] text-slate-400">{messages.length} رسالة في البنك</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    {/* Trigger Random Now Button */}
                    <button
                      onClick={() => handleTriggerRandomNow(win.id)}
                      disabled={messages.length === 0}
                      title="إرسال إشعار عشوائي فوري من هذه المجموعة لأجهزتك"
                      className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تجربة إشعار عشوائي الآن</span>
                      <span className="sm:hidden">تجربة</span>
                    </button>

                    {/* Edit Window Button */}
                    <button
                      onClick={() => (isEditing ? handleCancelEdit() : handleStartEdit(win))}
                      title="تعديل أوقات وتفاصيل الفترة"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Window Button */}
                    <button
                      onClick={() => handleDeleteWindow(win.id)}
                      title="حذف الفترة"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Form for this window */}
                {isEditing && (
                  <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل تفاصيل الفترة: {win.name}</span>
                      </h4>
                      <button
                        onClick={handleCancelEdit}
                        className="text-slate-400 hover:text-slate-200 text-xs"
                      >
                        إلغاء
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">اسم الفترة</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">وقت البداية</label>
                        <input
                          type="time"
                          value={editForm.start_time}
                          onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">وقت النهاية</label>
                        <input
                          type="time"
                          value={editForm.end_time}
                          onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">معدل التكرار طوال الفترة</label>
                        <select
                          value={editForm.interval_mins}
                          onChange={e => setEditForm({ ...editForm, interval_mins: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 font-semibold text-xs outline-none focus:border-teal-500"
                        >
                          {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(win.id)}
                        className="px-4 py-1 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>حفظ التعديلات</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages Pool Content */}
                <div className="p-4 sm:p-5">
                  <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                    <span>بنك رسائل هذه الفترة (يتم اختيار رسالة منها عشوائياً في كل تكرار):</span>
                  </div>

                  {messages.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                      لا توجد رسائل بعد. أضف رسائل توجيهية أو تذكيرات أدناه لتصلك عشوائياً خلال الفترة.
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
                      placeholder="أضف تذكيراً أو هدفاً جديداً هنا (مثل: هل راجعت أهدافك؟ اشرب ماء، سبحان الله وبحمده)..."
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
  );
};
