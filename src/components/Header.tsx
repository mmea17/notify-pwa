import React, { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  LogOut,
  Send,
  Smartphone,
  CheckCircle,
  Home,
  Flame,
  Sparkles,
  MessageSquareQuote
} from 'lucide-react';
import { getSubscriptionStatus, subscribeUserToPush } from '@/lib/push-client';

export type ActiveTab = 'home' | 'tracking' | 'athkar' | 'reminders';

interface HeaderProps {
  user: { id: string; name: string; email: string };
  settings: any;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onTriggerTest: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  settings,
  activeTab,
  onTabChange,
  onOpenSettings,
  onTriggerTest
}) => {
  const [pushStatus, setPushStatus] = useState<'checking' | 'active' | 'inactive' | 'unsupported'>('checking');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const checkStatus = async () => {
    const status = await getSubscriptionStatus();
    if (!status.supported) {
      setPushStatus('unsupported');
    } else if (status.subscribed) {
      setPushStatus('active');
    } else {
      setPushStatus('inactive');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleQuickEnable = async () => {
    setIsSubscribing(true);
    const res = await subscribeUserToPush();
    setIsSubscribing(false);
    if (res.success) {
      setToastMsg('تم تفعيل الإشعارات بنجاح على هذا الجهاز! 🎉');
      setPushStatus('active');
      setTimeout(() => setToastMsg(null), 4000);
    } else {
      alert(res.error || 'فشل التفعيل');
    }
  };

  const handleLogout = async () => {
    if (confirm('هل ترغب بتسجيل الخروج؟')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }
  };

  const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: any; badge?: string }> = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'tracking', label: 'المتابعة', icon: Flame },
    { id: 'athkar', label: 'الأذكار', icon: Sparkles },
    { id: 'reminders', label: 'التذكيرات', icon: MessageSquareQuote }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      {/* Top Bar: Brand & Profile Controls */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-lg sm:text-xl shrink-0">
            ت
          </div>
          <div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              تَـذْكِـيـر
            </span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Device Push Status Pill */}
          {pushStatus === 'active' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden md:inline">الإشعارات مفعلة</span>
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          ) : pushStatus === 'inactive' ? (
            <button
              onClick={handleQuickEnable}
              disabled={isSubscribing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition text-xs font-semibold"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isSubscribing ? 'جاري التفعيل...' : 'تفعيل الإشعارات هنا'}</span>
            </button>
          ) : null}

          {/* Test Push Button */}
          <button
            onClick={onTriggerTest}
            title="تجربة إشعار تفاعلي فوري"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Send className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">تجربة إشعار</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="الإعدادات ومواقيت الصلاة"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Name & Logout */}
          <div className="flex items-center gap-2 border-r border-slate-800 pr-3 mr-1">
            <span className="text-xs text-slate-300 font-medium hidden sm:inline">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar (3 Main Pages) */}
      <div className="border-t border-slate-800/60 bg-slate-950/60">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-4 py-1.5 sm:py-2 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white text-xs font-medium py-2 px-4 text-center animate-fadeIn flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}
    </header>
  );
};
