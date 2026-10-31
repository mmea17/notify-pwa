import React, { useState, useEffect } from 'react';
import { Header, type ActiveTab } from './Header';
import { PushBanner } from './PushBanner';
import { PrayerTracker } from './PrayerTracker';
import { TrackingView } from './TrackingView';
import { AthkarView } from './AthkarView';
import { SettingsModal } from './SettingsModal';

interface DashboardAppProps {
  user: any;
  settings: any;
  initialPrayers?: any;
}

export const DashboardApp: React.FC<DashboardAppProps> = ({ user, settings: initSettings, initialPrayers }) => {
  const [settings, setSettings] = useState(initSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab management (home | tracking | athkar) with URL hash synchronization
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'tracking' || hash === 'athkar' || hash === 'home') {
        setActiveTab(hash as ActiveTab);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.location.hash = tab === 'home' ? '' : tab;
  };

  const handleSettingsSaved = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerQuickTest = async () => {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'prayer' })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'تم إرسال إشعار تجريبي!');
      } else {
        alert(data.error || 'فشل إرسال الإشعار. تأكد من تفعيل الإشعارات أولاً.');
      }
    } catch (e: any) {
      alert(e?.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        user={user}
        settings={settings}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerTest={handleTriggerQuickTest}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Quick Welcome Banner */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              أهلاً بك، {user.name} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              لوحة تحكمك لإدارة التنبيهات المزامنة بين أجهزتك لمتابعة صلاتك وأهدافك اليومية بدقة.
            </p>
          </div>
        </div>

        {/* 1. Push Subscription Banner (shows on all pages if not yet subscribed on this device) */}
        <PushBanner onSubscribed={() => setRefreshKey(k => k + 1)} />

        {/* 2. Dynamic Tab Views */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            <PrayerTracker key={`prayers-${refreshKey}`} initialPrayers={initialPrayers} />
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="animate-fade-in">
            <TrackingView key={`tracking-${refreshKey}`} />
          </div>
        )}

        {activeTab === 'athkar' && (
          <div className="animate-fade-in">
            <AthkarView key={`athkar-${refreshKey}`} refreshKey={refreshKey} />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        تطبيق تذكير PWA • مدعوم بـ Cloudflare Workers & Astro • مصمم لمتابعة الصلوات والأذكار ومحاربة التشتت
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={settings}
        onSaved={handleSettingsSaved}
      />
    </div>
  );
};
