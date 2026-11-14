import React from 'react';
import { Sparkles, Target, Clock as ClockIcon } from 'lucide-react';
import { TimeWindowsManager } from './TimeWindowsManager';
import { NotificationTester } from './NotificationTester';

interface AthkarViewProps {
  refreshKey?: number;
  activeSubTab?: 'athkar' | 'habits' | 'continuous';
}

export const AthkarView: React.FC<AthkarViewProps> = ({
  refreshKey = 0,
  activeSubTab = 'athkar'
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Time Windows & Routines Manager Filtered by Active SubTab */}
      <TimeWindowsManager
        key={`windows-${refreshKey}-${activeSubTab}`}
        activeSection={activeSubTab}
      />

      {/* 2. Notification Testing Lab (Only visible on Continuous Focus / Intervals tab) */}
      {activeSubTab === 'continuous' && (
        <div className="pt-4 border-t border-slate-800/80">
          <NotificationTester />
        </div>
      )}
    </div>
  );
};
