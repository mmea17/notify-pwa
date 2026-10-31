import React, { useState } from 'react';
import { Header } from './Header';
import { PushBanner } from './PushBanner';
import { PrayerTracker } from './PrayerTracker';
import { TimeWindowsManager } from './TimeWindowsManager';
import { NotificationTester } from './NotificationTester';
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerTest={handleTriggerQuickTest}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Quick Welcome & Goal Banner */}
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

        {/* 1. Push Subscription Banner (if not subscribed on this device) */}
        <PushBanner onSubscribed={() => setRefreshKey(k => k + 1)} />

        {/* 2. Today's Prayers Tracker */}
        <PrayerTracker key={`prayers-${refreshKey}`} initialPrayers={initialPrayers} />

        {/* 3. Time Windows & Messages Pool */}
        <TimeWindowsManager key={`windows-${refreshKey}`} />

        {/* 4. Notification Testing Lab */}
        <NotificationTester />
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        تطبيق تذكير PWA • مدعوم بـ Cloudflare Workers & Astro • مصمم لمحاربة التشتت ومتابعة الصلوات
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
