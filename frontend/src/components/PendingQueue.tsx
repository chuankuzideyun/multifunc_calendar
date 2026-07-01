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
    if (score >= 0.85) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 0.7) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between border-b border-dark-border pb-4 mb-4">
        <div>
          <h3 className="font-semibold text-lg text-dark-text flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Pending Reviews
          </h3>
          <p className="text-xs text-dark-muted mt-0.5">Schedules extracted from emails</p>
        </div>
        <span className="bg-dark-bg text-dark-text px-2 py-0.5 rounded-full text-xs font-semibold border border-dark-border">
          {pendingEvents.length}
        </span>
      </div>

      {/* Sync triggers */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <button
          onClick={onSyncGmail}
          disabled={syncingGmail}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 disabled:opacity-50 text-blue-400 text-sm font-medium rounded-xl transition duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${syncingGmail ? 'animate-spin' : ''}`} />
          {syncingGmail ? 'Syncing...' : 'Sync Gmail'}
        </button>
        <button
          onClick={onSyncWeather}
          disabled={syncingWeather}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 disabled:opacity-50 text-emerald-400 text-sm font-medium rounded-xl transition duration-200"
        >
          <CloudLightning className={`w-4 h-4 ${syncingWeather ? 'animate-spin' : ''}`} />
          {syncingWeather ? 'Evaluating...' : 'Plan Weekend Run'}
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {pendingEvents.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-dark-muted border border-dashed border-dark-border rounded-xl px-4">
            <Calendar className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-sm font-medium">No Pending Schedules</p>
            <p className="text-xs mt-1 max-w-[200px]">Click the buttons above to fetch emails or evaluate weekend runs.</p>
          </div>
        ) : (
          pendingEvents.map(event => (
            <div
              key={event.id}
              className="bg-dark-bg border border-dark-border hover:border-dark-border/80 rounded-xl p-4 relative group transition duration-200"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold text-sm text-dark-text group-hover:text-blue-400 transition">
                  {event.title}
                </h4>
                {event.confidence !== null && (
                  <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-md ${getConfidenceColor(event.confidence)}`}>
                    Confidence: {Math.round(event.confidence * 100)}%
                  </span>
                )}
              </div>

              {event.location && (
                <p className="text-xs text-dark-muted truncate mb-1">
                  Location: {event.location}
                </p>
              )}

              <p className="text-xs text-blue-500 font-medium mb-2">
                {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
              </p>

              {event.description && (
                <p className="text-[11px] text-dark-muted line-clamp-2 bg-dark-card border border-dark-border/40 rounded-lg p-2 mb-3">
                  {event.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onConfirm(event.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg shadow-md shadow-blue-600/10 transition duration-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm
                </button>
                <button
                  onClick={() => onReject(event.id)}
                  className="flex items-center justify-center p-1.5 border border-dark-border hover:bg-rose-500/10 hover:border-rose-500/30 text-dark-muted hover:text-rose-400 rounded-lg transition duration-200"
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
