import React, { useState, useEffect } from 'react';
import {
  Header,
  type MainTab,
  type SubTab,
  type PrayersSubTab,
  type RoutinesSubTab,
  type CommitmentSubTab
} from './Header';
import { PushBanner } from './PushBanner';
import { PrayerTracker } from './PrayerTracker';
import { TrackingView } from './TrackingView';
import { RoutineTrackingView } from './RoutineTrackingView';
import { AthkarView } from './AthkarView';
import { PrayerMessagesView } from './PrayerMessagesView';
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

  // Pre-cache prayer & routine history in background so switching is instantaneous offline
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

      fetch(`/api/routines/history?year=${year}&month=${month}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.todayStr) {
            localStorage.setItem(`cached_routine_history_${year}_${month}`, JSON.stringify(data));
          }
        })
        .catch(() => {});
    }
  }, []);

  // Saved sub-tabs state (remembers last visited sub-tab per main tab)
  const [subTabs, setSubTabs] = useState<{
    prayers: PrayersSubTab;
    routines: RoutinesSubTab;
    commitment: CommitmentSubTab;
  }>(() => {
    let prayers: PrayersSubTab = 'times';
    let routines: RoutinesSubTab = 'athkar';
    let commitment: CommitmentSubTab = 'prayers';
    if (typeof localStorage !== 'undefined') {
      try {
        const p = localStorage.getItem('subtab_prayers') as PrayersSubTab;
        if (p === 'times' || p === 'messages') prayers = p;
        const r = localStorage.getItem('subtab_routines') as RoutinesSubTab;
        if (r === 'athkar' || r === 'habits' || r === 'continuous') routines = r;
        const c = localStorage.getItem('subtab_commitment') as CommitmentSubTab;
        if (c === 'prayers' || c === 'routines') commitment = c;
      } catch (e) {}
    }
    return { prayers, routines, commitment };
  });

  const [activeMainTab, setActiveMainTab] = useState<MainTab>('prayers');

  const currentSubTab = subTabs[activeMainTab];

  // URL Hash synchronization with backwards-compatible fallbacks
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (!hash) {
        setActiveMainTab('prayers');
        return;
      }

      const parts = hash.split('/');
      const mainPart = parts[0];
      const subPart = parts[1];

      // 1. Prayers Main Tab & Old Aliases
      if (mainPart === 'prayers' || mainPart === 'home') {
        setActiveMainTab('prayers');
        if (subPart === 'times' || subPart === 'messages') {
          saveSubTab('prayers', subPart as PrayersSubTab);
        }
      } else if (mainPart === 'reminders' || mainPart === 'messages') {
        setActiveMainTab('prayers');
        saveSubTab('prayers', 'messages');
      }
      // 2. Routines Main Tab & Aliases
      else if (mainPart === 'routines' || mainPart === 'athkar') {
        setActiveMainTab('routines');
        if (subPart === 'athkar' || subPart === 'habits' || subPart === 'continuous') {
          saveSubTab('routines', subPart as RoutinesSubTab);
        } else if (mainPart === 'athkar') {
          saveSubTab('routines', 'athkar');
        }
      } else if (mainPart === 'habits') {
        setActiveMainTab('routines');
        saveSubTab('routines', 'habits');
      } else if (mainPart === 'continuous' || mainPart === 'focus') {
        setActiveMainTab('routines');
        saveSubTab('routines', 'continuous');
      }
      // 3. Commitment Main Tab & Old Tracking Aliases
      else if (mainPart === 'commitment' || mainPart === 'tracking') {
        setActiveMainTab('commitment');
        if (subPart === 'prayers' || subPart === 'routines') {
          saveSubTab('commitment', subPart as CommitmentSubTab);
        } else {
          saveSubTab('commitment', 'prayers');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const saveSubTab = (main: MainTab, sub: SubTab) => {
    setSubTabs(prev => {
      const updated = { ...prev, [main]: sub };
      try {
        localStorage.setItem(`subtab_${main}`, sub);
      } catch (e) {}
      return updated;
    });
  };

  const handleMainTabChange = (main: MainTab) => {
    setActiveMainTab(main);
    const rememberedSub = subTabs[main];
    window.location.hash = `#${main}/${rememberedSub}`;
  };

  const handleSubTabChange = (sub: SubTab) => {
    saveSubTab(activeMainTab, sub);
    window.location.hash = `#${activeMainTab}/${sub}`;
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

  const isFullHeightHome = activeMainTab === 'prayers' && currentSubTab === 'times';

  return (
    <div className={`min-h-screen flex flex-col ${isFullHeightHome ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : ''}`}>
      <Header
        user={user}
        settings={settings}
        activeMainTab={activeMainTab}
        activeSubTab={currentSubTab}
        onMainTabChange={handleMainTabChange}
        onSubTabChange={handleSubTabChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerTest={handleTriggerQuickTest}
      />

      <main className={`flex-1 max-w-6xl w-full mx-auto px-2.5 sm:px-6 py-2 sm:py-8 ${isFullHeightHome ? 'flex flex-col justify-start overflow-hidden' : ''}`}>
        {/* Offline Status Banner */}
        {isOffline && (
          <div className="mb-2 sm:mb-4 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 animate-fade-in shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>أنت في وضع عدم الاتصال (Offline)</span>
          </div>
        )}

        {/* 1. Push Subscription Banner */}
        <PushBanner onSubscribed={() => setRefreshKey(k => k + 1)} />

        {/* 2. Main Tab 1: الفروض */}
        {activeMainTab === 'prayers' && currentSubTab === 'times' && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            <PrayerTracker key={`prayers-${refreshKey}`} initialPrayers={initialPrayers} />
          </div>
        )}

        {activeMainTab === 'prayers' && currentSubTab === 'messages' && (
          <div className="animate-fade-in">
            <PrayerMessagesView key={`prayers-messages-${refreshKey}`} />
          </div>
        )}

        {/* 3. Main Tab 2: الروتين */}
        {activeMainTab === 'routines' && (
          <div className="animate-fade-in">
            <AthkarView
              key={`athkar-${refreshKey}-${currentSubTab}`}
              activeSubTab={currentSubTab as any}
              refreshKey={refreshKey}
            />
          </div>
        )}

        {/* 4. Main Tab 3: الالتزام */}
        {activeMainTab === 'commitment' && currentSubTab === 'prayers' && (
          <div className="animate-fade-in">
            <TrackingView key={`tracking-prayers-${refreshKey}`} />
          </div>
        )}

        {activeMainTab === 'commitment' && currentSubTab === 'routines' && (
          <div className="animate-fade-in">
            <RoutineTrackingView key={`tracking-routines-${refreshKey}`} />
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
