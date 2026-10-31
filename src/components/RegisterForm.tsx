import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, MapPin, AlertCircle, ArrowLeft } from 'lucide-react';
import { COUNTRIES_DATA } from '@/lib/countries';

export const RegisterForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('مصر');
  const [city, setCity] = useState('القاهرة');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCountryData = COUNTRIES_DATA.find(c => c.nameAr === country || c.nameEn === country) || COUNTRIES_DATA[0];

  const handleCountryChange = (cName: string) => {
    setCountry(cName);
    const found = COUNTRIES_DATA.find(c => c.nameAr === cName || c.nameEn === cName);
    if (found && found.cities.length > 0) {
      setCity(found.cities[0].nameAr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          countryName: country,
          cityName: city
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = '/';
      } else {
        setError(data.error || 'فشل إنشاء الحساب');
      }
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20 text-white font-black text-2xl mb-4">
          ت
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">إنشاء حساب جديد</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
          ابدأ يومك بتنظيم ومتابعة الصلاة والأهداف عبر أجهزتك
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">الاسم الكامل</label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="مثال: أحمد محمد"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition"
            />
            <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">البريد الإلكتروني</label>
          <div className="relative">
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">كلمة المرور (6 أحرف فأكثر)</label>
          <div className="relative">
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">الدولة</label>
            <select
              value={country}
              onChange={e => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
            >
              {COUNTRIES_DATA.map(c => (
                <option key={c.countryCode} value={c.nameAr}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">المدينة</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
            >
              {currentCountryData.cities.map(ci => (
                <option key={ci.nameAr} value={ci.nameAr}>
                  {ci.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block animate-spin">⏳</span>
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span>{loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب والبدء'}</span>
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          لديك حساب بالفعل؟{' '}
          <a href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold transition inline-flex items-center gap-1">
            <span>تسجيل الدخول</span>
            <ArrowLeft className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
};
