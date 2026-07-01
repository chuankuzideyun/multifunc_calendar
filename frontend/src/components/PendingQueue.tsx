import React from 'react';
import { Mail, RefreshCw, Check, X, Calendar, CloudLightning } from 'lucide-react';
import type { EventItem } from './EventItem';

interface PendingQueueProps {
  events: EventItem[];
  onConfirm: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onSyncGmail: () => Promise<void>;
  onSyncWeather: () => Promise<void>;
  syncingGmail: boolean;
  syncingWeather: boolean;
}

export const PendingQueue: React.FC<PendingQueueProps> = ({
  events,
  onConfirm,
  onReject,
  onSyncGmail,
  onSyncWeather,
  syncingGmail,
  syncingWeather
}) => {
  const pendingEvents = events.filter(e => e.status === 'pending');

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 0.7) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-[var(--spring-yellow)] text-[var(--spring-yellow-text)] border-[var(--spring-yellow-border)]';
  };

  return (
    <div className="spring-card p-5 flex flex-col h-full shadow-sm relative overflow-hidden">
      {/* 统计卡片背景角落装饰：单片叶子/花瓣轮廓 */}
      <div className="absolute -bottom-2 -right-2 z-0 pointer-events-none opacity-15">
        <svg viewBox="0 0 24 24" fill="#A5D6A7" className="w-16 h-16">
          <path d="M2,22 C8,18 12,12 22,2 C12,12 6,10 2,22 Z" fill="#A5D6A7" />
        </svg>
      </div>

      <div className="flex items-center justify-between border-b border-[var(--spring-green-mid)] pb-4 mb-4 relative z-10">
        <div>
          <h3 className="font-semibold text-lg text-[var(--spring-green-dark)] flex items-center gap-2">
            <Mail className="w-5 h-5 text-[var(--spring-green-dark)]" />
            Pending Reviews
          </h3>
          <p className="text-xs text-[var(--spring-green-text)] mt-0.5">Schedules extracted from emails</p>
        </div>
        <span className="bg-[var(--spring-green-light)] text-[var(--spring-green-dark)] px-2 py-0.5 rounded-full text-xs font-semibold border border-[var(--spring-green-mid)]">
          {pendingEvents.length}
        </span>
      </div>

      {/* Sync triggers */}
      <div className="grid grid-cols-2 gap-2.5 mb-4 relative z-10">
        <button
          onClick={onSyncGmail}
          disabled={syncingGmail}
          className="flex items-center justify-center gap-1.5 py-2 px-3 spring-btn-primary disabled:opacity-50 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${syncingGmail ? 'animate-spin' : ''}`} />
          {syncingGmail ? 'Syncing...' : 'Sync Gmail'}
        </button>
        <button
          onClick={onSyncWeather}
          disabled={syncingWeather}
          className="flex items-center justify-center gap-1.5 py-2 px-3 spring-btn-primary disabled:opacity-50 text-sm"
        >
          <CloudLightning className={`w-4 h-4 ${syncingWeather ? 'animate-spin' : ''}`} />
          {syncingWeather ? 'Evaluating...' : 'Plan Weekend Run'}
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 relative z-10">
        {pendingEvents.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-[var(--spring-green-text)] border border-dashed border-[var(--spring-green-mid)] rounded-xl px-4">
            <Calendar className="w-8 h-8 mb-2 stroke-1 text-[var(--spring-green-dark)]" />
            <p className="text-sm font-semibold text-[var(--spring-green-dark)]">No Pending Schedules</p>
            <p className="text-xs mt-1 max-w-[200px]">Click the buttons above to fetch emails or evaluate weekend runs.</p>
          </div>
        ) : (
          pendingEvents.map(event => (
            <div
              key={event.id}
              className="bg-[var(--spring-page-bg)] border-[0.5px] border-dashed border-[var(--spring-green-mid)] hover:border-[var(--spring-green-text)] rounded-xl p-4 relative group transition duration-200"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold text-sm text-[var(--spring-green-dark)] group-hover:text-[var(--spring-green-text)] transition">
                  {event.title}
                </h4>
                {event.confidence !== null && (
                  <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-md ${getConfidenceColor(event.confidence)}`}>
                    Confidence: {Math.round(event.confidence * 100)}%
                  </span>
                )}
              </div>

              {event.location && (
                <p className="text-xs text-[var(--spring-green-text)] truncate mb-1">
                  Location: {event.location}
                </p>
              )}

              <p className="text-xs text-[var(--spring-green-dark)] font-semibold mb-2">
                {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
              </p>

              {event.description && (
                <p className="text-[11px] text-[var(--spring-green-text)] line-clamp-2 bg-white border border-[var(--spring-green-mid)]/40 rounded-lg p-2 mb-3">
                  {event.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onConfirm(event.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 spring-btn-primary text-xs rounded-lg shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm
                </button>
                <button
                  onClick={() => onReject(event.id)}
                  className="flex items-center justify-center p-1.5 spring-btn-danger text-xs rounded-lg shadow-sm"
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
