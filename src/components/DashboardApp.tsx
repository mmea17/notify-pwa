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
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pre-cache tracking history for current month in the background so "المتابعة" is never zeroed out offline
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      fetch(`/api/prayers/history?year=${year}&month=${month}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.todayStr) {
            localStorage.setItem(`cached_history_${year}_${month}`, JSON.stringify(data));
          }
        })
        .catch(() => {});
    }
  }, []);

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

      <main className="flex-1 max-w-6xl w-full mx-auto px-2.5 sm:px-6 py-2.5 sm:py-8">
        {/* Offline Status Banner */}
        {isOffline && (
          <div className="mb-2.5 sm:mb-4 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>أنت في وضع عدم الاتصال (Offline)</span>
          </div>
        )}

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
