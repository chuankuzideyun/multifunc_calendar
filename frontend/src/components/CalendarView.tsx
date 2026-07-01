import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Mail, Activity, Mic, Calendar, MapPin, X } from 'lucide-react';
import type { EventItem } from './EventItem';

interface CalendarViewProps {
  events: EventItem[];
  onDeleteEvent: (id: string) => Promise<void>;
  onConfirmEvent: (id: string) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onDeleteEvent, onConfirmEvent }) => {
  const [selectedEvent, setSelectedEvent] = React.useState<EventItem | null>(null);

  // Convert DB events to FullCalendar event format
  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime,
    end: e.endTime,
    extendedProps: {
      description: e.description,
      location: e.location,
      source: e.source,
      status: e.status,
      confidence: e.confidence
    }
  }));

  const handleEventClick = (info: any) => {
    const { id, title, start, end, extendedProps } = info.event;
    setSelectedEvent({
      id,
      title,
      startTime: start.toISOString(),
      endTime: end ? end.toISOString() : start.toISOString(),
      description: extendedProps.description,
      location: extendedProps.location,
      source: extendedProps.source,
      status: extendedProps.status,
      confidence: extendedProps.confidence
    });
  };

  const renderEventContent = (eventInfo: any) => {
    const source = eventInfo.event.extendedProps.source;
    const status = eventInfo.event.extendedProps.status;

    let sourceStyles = 'bg-slate-600/10 text-slate-400 border-slate-600/30';
    let Icon = Calendar;

    if (source === 'gmail') {
      sourceStyles = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      Icon = Mail;
    } else if (source === 'weather') {
      sourceStyles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      Icon = Activity;
    } else if (source === 'voice') {
      sourceStyles = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      Icon = Mic;
    }

    const borderStyle = status === 'pending' ? 'border-dashed border-2' : 'border-solid border';

    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs w-full overflow-hidden truncate ${sourceStyles} ${borderStyle}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium truncate">{eventInfo.event.title}</span>
      </div>
    );
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 shadow-lg h-full flex flex-col relative">
      <div className="flex-1 overflow-y-auto min-h-[450px]">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          allDaySlot={false}
          firstDay={1} // Monday
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          height="auto"
          locale="en"
        />
      </div>

      {/* Event Details Dialog Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-dark-muted hover:text-dark-text transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                selectedEvent.source === 'gmail' ? 'bg-blue-500/15 text-blue-400' :
                selectedEvent.source === 'weather' ? 'bg-emerald-500/15 text-emerald-400' :
                selectedEvent.source === 'voice' ? 'bg-purple-500/15 text-purple-400' :
                'bg-slate-500/15 text-slate-400'
              }`}>
                {selectedEvent.source === 'gmail' && 'Gmail Extracted'}
                {selectedEvent.source === 'weather' && 'Weather Planned'}
                {selectedEvent.source === 'voice' && 'Voice Assistant'}
                {selectedEvent.source === 'manual' && 'Manually Created'}
              </span>

              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                selectedEvent.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' :
                selectedEvent.status === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-dashed border-amber-500/30' :
                'bg-rose-500/15 text-rose-400'
              }`}>
                {selectedEvent.status === 'confirmed' && 'Confirmed'}
                {selectedEvent.status === 'pending' && 'Pending'}
                {selectedEvent.status === 'rejected' && 'Rejected'}
              </span>
            </div>

            <h4 className="text-xl font-bold text-dark-text mb-3">{selectedEvent.title}</h4>

            <div className="space-y-2.5 mb-6 text-sm">
              <p className="text-dark-muted flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                {new Date(selectedEvent.startTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })} - {new Date(selectedEvent.endTime).toLocaleString('en-US', {
                  timeStyle: 'short'
                })}
              </p>

              {selectedEvent.location && (
                <p className="text-dark-muted flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                  {selectedEvent.location}
                </p>
              )}

              {selectedEvent.description && (
                <div className="text-dark-muted border-t border-dark-border/40 pt-3 mt-3 text-xs leading-relaxed max-h-32 overflow-y-auto bg-dark-bg/40 p-2.5 rounded-xl">
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-dark-border pt-4 mt-4 justify-end">
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this event?')) {
                    await onDeleteEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-rose-400 border border-dark-border hover:bg-rose-500/10 hover:border-rose-500/30 rounded-xl transition duration-200"
              >
                Delete
              </button>

              {selectedEvent.status === 'pending' && (
                <button
                  onClick={async () => {
                    await onConfirmEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/15 transition duration-200"
                >
                  Confirm Event
                </button>
              )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-dark-text border border-dark-border hover:bg-dark-border rounded-xl transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
