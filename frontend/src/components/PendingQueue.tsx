import React from 'react';
import { Mail, RefreshCw, Check, X, Calendar, CloudLightning } from 'lucide-react';
import type { EventItem } from './EventItem';

interface PendingQueueProps {
  events: EventItem[];
  onConfirm: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onSyncGmail: () => Promise<void>;
  onSyncWeather: () => Promise<{ suggestionsCreated: number } | undefined>;
  syncingGmail: boolean;
  syncingWeather: boolean;
}

const RunnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="18" cy="4" r="1.5" />
    <path d="M14 7.5c-1-1-2.5-1.5-4-1.5H7.5L5.5 10" />
    <path d="M14 7.5v5.5l-3.5 5.5" />
    <path d="M10.5 13l2 5.5H16" />
    <path d="M10.5 7.5H8l-2 3" />
    <path d="M8 13.5v4" />
  </svg>
);

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
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

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

  const handlePlanWeather = async () => {
    setStatusMessage(null);
    const res = await onSyncWeather();
    if (res) {
      setStatusMessage(`已检查未来7天天气，找到 ${res.suggestionsCreated} 个适合跑步的时间段`);
      // Auto-clear after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    }
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
          <p className="text-xs text-[var(--spring-green-text)] mt-0.5">Schedules extracted from emails & weather</p>
        </div>
        <span className="bg-[var(--spring-green-light)] text-[var(--spring-green-dark)] px-2 py-0.5 rounded-full text-xs font-semibold border border-[var(--spring-green-mid)]">
          {pendingEvents.length}
        </span>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="bg-[var(--spring-green-light)] text-[var(--spring-green-text)] border border-[var(--spring-green-mid)] rounded-xl p-3 mb-3 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 relative z-10 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--spring-green-text)] animate-ping shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

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
          onClick={handlePlanWeather}
          disabled={syncingWeather}
          className="flex items-center justify-center gap-1.5 py-2 px-3 spring-btn-primary disabled:opacity-50 text-sm"
        >
          <CloudLightning className={`w-4 h-4 ${syncingWeather ? 'animate-spin' : ''}`} />
          {syncingWeather ? 'Checking...' : '检查本周跑步天气'}
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 relative z-10 font-sans">
        {pendingEvents.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-[var(--spring-green-text)] border border-dashed border-[var(--spring-green-mid)] rounded-xl px-4">
            <Calendar className="w-8 h-8 mb-2 stroke-1 text-[var(--spring-green-dark)]" />
            <p className="text-sm font-semibold text-[var(--spring-green-dark)]">No Pending Schedules</p>
            <p className="text-xs mt-1 max-w-[200px]">Click the buttons above to fetch emails or evaluate weather runs.</p>
          </div>
        ) : (
          pendingEvents.map(event => {
            const isWeather = event.source === 'weather';
            if (isWeather) {
              const dateObj = new Date(event.startTime);
              const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
              const weekdayStr = weekdays[dateObj.getDay()];
              const cleanReason = event.description 
                ? event.description.replace('天气建议: ', '').replace('，适合晨跑', '').replace(/，/g, ' ') 
                : '';
              const subtitle = `${weekdayStr} · ${cleanReason}`;

              return (
                <div
                  key={event.id}
                  className="bg-[var(--spring-page-bg)] border-[0.5px] border-dashed border-[var(--spring-green-mid)] hover:border-[var(--spring-green-text)] rounded-xl p-4 relative group transition duration-200"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-[var(--spring-green-light)] text-[var(--spring-green-text)] rounded-lg shrink-0">
                      <RunnerIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-[var(--spring-green-dark)] truncate">
                        建议晨跑
                      </h4>
                      <p className="text-xs text-[var(--spring-green-text)] truncate mt-0.5 font-medium">
                        {subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
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
              );
            }

            // Normal email / voice pending card
            return (
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
            );
          })
        )}
      </div>
    </div>
  );
};
