import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Send, Shuffle, Sparkles, Check, AlertCircle, ToggleLeft, ToggleRight, MessageSquare } from 'lucide-react';

export const TimeWindowsManager: React.FC = () => {
  const [windows, setWindows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsgText, setNewMsgText] = useState<{ [winId: string]: string }>({});
  const [newMsgCat, setNewMsgCat] = useState<{ [winId: string]: string }>({});
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [winForm, setWinForm] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    mode: 'random',
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
          mode: 'random',
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
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 sm:p-6 mb-8 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>فترات اليوم وبنك الرسائل ومحاربة التشتت</span>
            <span className="text-teal-400">🎯</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            حدد فترات يومك وبنك رسائل لكل فترة، ليختار النظام وقتاً عشوائياً ويرسل لك رسالة تكسر السرحان وتذكرك بأهدافك.
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
        <form onSubmit={handleCreateWindow} className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-4">
          <h3 className="text-sm font-bold text-white">إضافة فترة زمنية جديدة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">اسم الفترة</label>
              <input
                type="text"
                placeholder="مثال: العمل العميق"
                required
                value={winForm.name}
                onChange={e => setWinForm({ ...winForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">وقت البداية</label>
              <input
                type="time"
                required
                value={winForm.start_time}
                onChange={e => setWinForm({ ...winForm, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">وقت النهاية</label>
              <input
                type="time"
                required
                value={winForm.end_time}
                onChange={e => setWinForm({ ...winForm, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">نمط الإرسال</label>
              <select
                value={winForm.mode}
                onChange={e => setWinForm({ ...winForm, mode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
              >
                <option value="random">وقت عشوائي مفاجئ داخل الفترة (موصى به لكسر التشتت)</option>
                <option value="fixed">موعد ثابت يومياً برسالة عشوائية</option>
                <option value="interval">تكرار دوري كل فترة</option>
              </select>
            </div>

            {winForm.mode === 'fixed' && (
              <div>
                <label className="text-xs text-slate-300 block mb-1">الموعد الثابت</label>
                <input
                  type="time"
                  value={winForm.fixed_time}
                  onChange={e => setWinForm({ ...winForm, fixed_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                />
              </div>
            )}

            {winForm.mode === 'interval' && (
              <div>
                <label className="text-xs text-slate-300 block mb-1">التكرار (بالدقائق)</label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={winForm.interval_mins}
                  onChange={e => setWinForm({ ...winForm, interval_mins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddWindow(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400"
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

            return (
              <div
                key={win.id}
                className={`rounded-2xl border transition-all ${
                  isActive ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-950/60 border-slate-800/50 opacity-60'
                }`}
              >
                {/* Window Bar */}
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
                        <h3 className="text-base font-bold text-white">{win.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                          {win.start_time} - {win.end_time}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[11px] text-teal-300">
                          {win.mode === 'random'
                            ? '🎲 وقت عشوائي مفاجئ'
                            : win.mode === 'fixed'
                            ? `⏰ موعد ثابت (${win.fixed_time})`
                            : `🔄 تكرار كل ${win.interval_mins} دقيقة`}
                        </span>
                        <span>•</span>
                        <span>{messages.length} رسالة في البنك</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Trigger Random Now Button */}
                    <button
                      onClick={() => handleTriggerRandomNow(win.id)}
                      disabled={messages.length === 0}
                      title="إرسال إشعار عشوائي فوري من هذه المجموعة لأجهزتك"
                      className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>تجربة إشعار عشوائي الآن</span>
                    </button>

                    <button
                      onClick={() => handleDeleteWindow(win.id)}
                      title="حذف الفترة"
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
                    <span>بنك رسائل هذه الفترة (يتم اختيار رسالة منها وإرسالها):</span>
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
                      placeholder="أضف تذكيراً أو هدفاً جديداً هنا (مثل: هل راجعت أهدافك؟ اشرب ماء)..."
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
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-teal-500 outline-none"
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
