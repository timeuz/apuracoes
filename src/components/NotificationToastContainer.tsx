import React from 'react';
import { PushNotificationEvent } from '../types/election';
import { X, Bell, Trophy, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface NotificationToastContainerProps {
  notifications: PushNotificationEvent[];
  onDismiss: (id: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {notifications.map((n) => {
        const isVictory = n.type === 'victory';
        const isOvertake = n.type === 'overtake';

        return (
          <div
            key={n.id}
            className={`pointer-events-auto rounded-xl p-4 shadow-xl border transition-all animate-in slide-in-from-bottom-5 duration-300 ${
              isVictory
                ? 'bg-emerald-950 text-white border-emerald-500 ring-2 ring-emerald-500/50'
                : isOvertake
                ? 'bg-amber-950 text-white border-amber-500 ring-1 ring-amber-500/50'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isVictory
                      ? 'bg-emerald-800 text-emerald-200'
                      : isOvertake
                      ? 'bg-amber-800 text-amber-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isVictory ? (
                    <Trophy className="w-4 h-4" />
                  ) : isOvertake ? (
                    <Zap className="w-4 h-4" />
                  ) : n.type === 'milestone' ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold leading-tight">
                      {n.title}
                    </h5>
                    <span className="text-[10px] font-tabular opacity-75">
                      {n.timestamp}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onDismiss(n.id)}
                className="opacity-60 hover:opacity-100 p-1 rounded transition-opacity cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
