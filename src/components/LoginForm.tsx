import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = '/';
      } else {
        setError(data.error || 'فشل تسجيل الدخول');
      }
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20 text-white font-black text-2xl mb-4">
          ت
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">تسجيل الدخول</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
          مرحباً بك مجدداً في نظام تذكير ومحاربة التشتت
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">البريد الإلكتروني</label>
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
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">كلمة المرور</label>
          <div className="relative">
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block animate-spin">⏳</span>
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          <span>{loading ? 'جاري تسجيل الدخول...' : 'دخول'}</span>
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          ليس لديك حساب بعد؟{' '}
          <a href="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition inline-flex items-center gap-1">
            <span>إنشاء حساب جديد</span>
            <ArrowLeft className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
};
