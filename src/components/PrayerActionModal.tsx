import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Check,
  Send
} from 'lucide-react';

interface PrayerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayerName: string;
  prayerTime: string;
  currentStatus: 'prayed' | 'qadaa' | 'pending' | 'missed';
  currentDelayReason?: string | null;
  onSave: (status: 'prayed' | 'qadaa' | 'pending', delayReason?: string) => Promise<void>;
  loading?: boolean;
}

const QUICK_REASONS = [
  'استغراق في النوم 😴',
  'انشغال بالعمل أو الدراسة 💼',
  'مواصلات وفي الطريق 🚗',
  'سهو وتشتت ونسيان 💭',
  'ظروف طارئة وقاهرة ⚡',
  'تكاسل وتسويف (أستغفر الله) 🥀'
];

export const PrayerActionModal: React.FC<PrayerActionModalProps> = ({
  isOpen,
  onClose,
  prayerName,
  prayerTime,
  currentStatus,
  currentDelayReason,
  onSave,
  loading = false
}) => {
  const [selectedMode, setSelectedMode] = useState<'ontime' | 'qadaa' | null>(null);
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (currentStatus === 'qadaa') {
        setSelectedMode('qadaa');
        setReasonText(currentDelayReason || '');
      } else if (currentStatus === 'prayed') {
        setSelectedMode('ontime');
        setReasonText('');
      } else {
        setSelectedMode(null);
        setReasonText('');
      }
    }
  }, [isOpen, currentStatus, currentDelayReason]);

  if (!isOpen) return null;

  const handleSelectOnTime = async () => {
    setSelectedMode('ontime');
    await onSave('prayed');
  };

  const handleSelectQadaaClick = () => {
    setSelectedMode('qadaa');
  };

  const handleConfirmQadaa = async () => {
    await onSave('qadaa', reasonText.trim());
  };

  const handleResetToPending = async () => {
    await onSave('pending');
  };

  const handleQuickTagClick = (tag: string) => {
    if (!reasonText.trim()) {
      setReasonText(tag);
    } else {
      setReasonText(prev => `${prev} - ${tag}`);
    }
  };

  const isCompleted = currentStatus === 'prayed' || currentStatus === 'qadaa';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="text-xs text-emerald-400 font-bold mb-0.5">تسجيل أداء الفريضة</div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>{prayerName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {prayerTime}
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Current Status Info banner if already performed */}
          {isCompleted && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                currentStatus === 'prayed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {currentStatus === 'prayed' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>مُسجلة حالياً: في وقتها ✅</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>مُسجلة حالياً: قضاء بعد وقتها 🟡</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleResetToPending}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 transition flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إلغاء التسجيل</span>
              </button>
            </div>
          )}

          {/* Prompt Question */}
          <div className="text-center sm:text-right">
            <span className="text-xs sm:text-sm font-bold text-slate-200">
              كيف أديت هذه الصلاة؟
            </span>
          </div>

          {/* Mode Choice Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Button 1: On-Time (حاضر في وقتها) */}
            <button
              type="button"
              onClick={handleSelectOnTime}
              disabled={loading}
              className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col gap-1 active:scale-95 ${
                selectedMode === 'ontime' && currentStatus === 'prayed'
                  ? 'bg-emerald-500/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>صليتها في وقتها</span>
                </span>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                حاضر قبل خروج وقت الفريضة المشروع
              </p>
            </button>

            {/* Button 2: Qadaa (قضاء بعد خروج وقتها) */}
            <button
              type="button"
              onClick={handleSelectQadaaClick}
              disabled={loading}
              className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col gap-1 active:scale-95 ${
                selectedMode === 'qadaa'
                  ? 'bg-amber-500/20 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                  : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>قضيتها بعد وقتها</span>
                </span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                فات وقتها وقضيتها لاحقاً
              </p>
            </button>
          </div>

          {/* Qadaa Reason Box (Expands when Qadaa is selected) */}
          {selectedMode === 'qadaa' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>ليه اتأخرت؟ (سجل تذكير لنفسك لتفادي السبب)</span>
                </label>
                <span className="text-[10px] text-slate-500">اختياري</span>
              </div>

              {/* Quick Suggestion Tags */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleQuickTagClick(tag)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:text-amber-200 text-slate-400 transition active:scale-95"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                rows={2}
                value={reasonText}
                onChange={e => setReasonText(e.target.value)}
                placeholder="مثال: نمت بعد الشغل وما صحيتش إلا بعد المغرب، أو كنت في اجتماع..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 outline-none focus:border-amber-400 leading-relaxed resize-none"
              />

              {/* Confirm Qadaa Button */}
              <button
                type="button"
                onClick={handleConfirmQadaa}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {loading ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>حفظ كصلاة مقضية وتوثيق السبب</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
