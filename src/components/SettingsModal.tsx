import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, BellRing, Compass, Check } from 'lucide-react';
import { COUNTRIES_DATA, CALCULATION_METHODS } from '@/lib/countries';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: any;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialSettings, onSaved }) => {
  if (!isOpen) return null;

  const [country, setCountry] = useState(initialSettings?.country || 'مصر');
  const [city, setCity] = useState(initialSettings?.city || 'القاهرة');
  const [method, setMethod] = useState(initialSettings?.calculation_method || 'Egyptian');
  const [madhab, setMadhab] = useState(initialSettings?.madhab || 'Shafi');
  const [preMins, setPreMins] = useState(initialSettings?.pre_prayer_mins ?? 15);
  const [postMins, setPostMins] = useState(initialSettings?.post_prayer_mins ?? 15);
  const [snoozeMins, setSnoozeMins] = useState(initialSettings?.snooze_interval_mins ?? 15);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Available cities for the selected country
  const currentCountryData = COUNTRIES_DATA.find(c => c.nameAr === country || c.nameEn === country) || COUNTRIES_DATA[0];

  const handleCountryChange = (newCountryName: string) => {
    setCountry(newCountryName);
    const found = COUNTRIES_DATA.find(c => c.nameAr === newCountryName || c.nameEn === newCountryName);
    if (found) {
      setMethod(found.defaultMethod);
      if (found.cities.length > 0) {
        setCity(found.cities[0].nameAr);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const foundCity = currentCountryData.cities.find(c => c.nameAr === city || c.nameEn === city) || currentCountryData.cities[0];

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          city,
          latitude: foundCity ? foundCity.latitude : 30.0444,
          longitude: foundCity ? foundCity.longitude : 31.2357,
          calculation_method: method,
          madhab,
          pre_prayer_mins: Number(preMins),
          post_prayer_mins: Number(postMins),
          snooze_interval_mins: Number(snoozeMins)
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSaved();
          onClose();
        }, 1200);
      } else {
        alert('فشل حفظ الإعدادات');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">إعدادات الموقع ومواقيت الصلاة</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Country & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>الدولة</span>
              </label>
              <select
                value={country}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
              >
                {COUNTRIES_DATA.map(c => (
                  <option key={c.countryCode} value={c.nameAr}>
                    {c.nameAr} ({c.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">المدينة</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
              >
                {currentCountryData.cities.map(ci => (
                  <option key={ci.nameAr} value={ci.nameAr}>
                    {ci.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculation Method */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">طريقة الحساب الفلكي</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
            >
              {CALCULATION_METHODS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Madhab for Asr */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">المذهب الفقهي (لوقت العصر)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMadhab('Shafi')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  madhab === 'Shafi'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                الجمهور (الشافعي، المالكي، الحنبلي)
              </button>
              <button
                type="button"
                onClick={() => setMadhab('Hanafi')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  madhab === 'Hanafi'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                المذهب الحنفي
              </button>
            </div>
          </div>

          {/* Reminder Offsets */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-teal-400" />
              <span>إعدادات التنبيه التفاعلي الذكي</span>
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">قبل الأذان</label>
                <select
                  value={preMins}
                  onChange={e => setPreMins(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value={5}>5 دقائق</option>
                  <option value={10}>10 دقائق</option>
                  <option value={15}>15 دقيقة</option>
                  <option value={20}>20 دقيقة</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">متابعة بعد الأذان</label>
                <select
                  value={postMins}
                  onChange={e => setPostMins(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value={10}>بعد 10 د</option>
                  <option value={15}>بعد 15 د</option>
                  <option value={20}>بعد 20 د</option>
                  <option value={30}>بعد 30 د</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">إعادة التذكير (لسة)</label>
                <select
                  value={snoozeMins}
                  onChange={e => setSnoozeMins(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value={10}>كل 10 د</option>
                  <option value={15}>كل 15 د</option>
                  <option value={20}>كل 20 د</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {success ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> تم الحفظ بنجاح!
              </span>
            ) : <span />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
