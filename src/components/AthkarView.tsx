import React from 'react';
import { Sparkles, Compass } from 'lucide-react';
import { TimeWindowsManager } from './TimeWindowsManager';
import { NotificationTester } from './NotificationTester';

interface AthkarViewProps {
  refreshKey?: number;
}

export const AthkarView: React.FC<AthkarViewProps> = ({ refreshKey = 0 }) => {
  return (
    <div className="space-y-8">
      {/* Introduction Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 border border-teal-500/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold w-fit mb-3">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>الأذكار والأوراد ومحاربة التشتت</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          الأذكار والأوراد اليومية وفترات التركيز 📿
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          خصص أورادك اليومية (أذكار الصباح، أذكار المساء، ورد القرآن) بإشعارات تفاعلية تتوقف فور تأكيد القراءة، بجانب فترات العمل والتركيز المستمرة لمحاربة التشتت.
        </p>
      </div>

      {/* 1. Time Windows & Messages Pool */}
      <TimeWindowsManager key={`windows-${refreshKey}`} />

      {/* 2. Notification Testing & Anti-Distraction Lab */}
      <NotificationTester />
    </div>
  );
};
