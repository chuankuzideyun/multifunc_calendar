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
    let Icon = Calendar;

    if (source === 'gmail') {
      Icon = Mail;
    } else if (source === 'weather') {
      Icon = Activity;
    } else if (source === 'voice') {
      Icon = Mic;
    }

    return (
      <div className="flex items-center gap-1 px-1 py-0.5 text-xs w-full overflow-hidden truncate bg-transparent text-current">
        <Icon className="w-3 h-3 shrink-0" />
        <span className="font-semibold truncate">{eventInfo.event.title}</span>
      </div>
    );
  };

  return (
    <div className="spring-card p-5 shadow-sm h-full flex flex-col relative overflow-hidden">
      {/* 日历面板右上角装饰：3片叶子 + 细树枝 */}
      <div className="absolute top-0 right-0 z-0 pointer-events-none opacity-15">
        <svg viewBox="0 0 100 100" fill="#A5D6A7" className="w-28 h-28">
          <path d="M100,0 C98,0 80,15 65,30 C64.5,29.5 64,29 63,29.5 C60,27 50,27 45,35 C52,38 58,35 62,31 C78,16 98,1.5 100,0 Z" fill="#A5D6A7" />
          <path d="M65,30 C58,22 45,22 40,32 C48,34 58,34 65,30 Z" fill="#A5D6A7" />
          <path d="M80,15 C73,7 60,7 55,17 C63,19 73,19 80,15 Z" fill="#A5D6A7" />
          <path d="M50,45 C43,37 30,37 25,47 C33,49 43,49 50,45 Z" fill="#A5D6A7" />
        </svg>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[450px] relative z-10">
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
          eventDidMount={(info) => {
            const source = info.event.extendedProps.source;
            const status = info.event.extendedProps.status;
            if (source) {
              info.el.setAttribute('data-source', source);
            }
            if (status) {
              info.el.setAttribute('data-status', status);
            }
          }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[var(--spring-green-mid)] rounded-2xl shadow-xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-[var(--spring-green-text)] hover:text-[var(--spring-green-dark)] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${
                selectedEvent.source === 'gmail' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                selectedEvent.source === 'weather' ? 'bg-[var(--spring-green-light)] text-[var(--spring-green-dark)] border-[var(--spring-green-mid)]' :
                selectedEvent.source === 'voice' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {selectedEvent.source === 'gmail' && 'Gmail Extracted'}
                {selectedEvent.source === 'weather' && 'Weather Planned'}
                {selectedEvent.source === 'voice' && 'Voice Assistant'}
                {selectedEvent.source === 'manual' && 'Manually Created'}
              </span>

              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${
                selectedEvent.status === 'confirmed' ? 'bg-[var(--spring-green-light)] text-[var(--spring-green-dark)] border-[var(--spring-green-mid)]' :
                selectedEvent.status === 'pending' ? 'bg-[var(--spring-yellow)] text-[var(--spring-yellow-text)] border-dashed border-[var(--spring-yellow-border)]' :
                'bg-[var(--spring-pink-light)] text-[var(--spring-pink-text)] border-[var(--spring-pink-light)]'
              }`}>
                {selectedEvent.status === 'confirmed' && 'Confirmed'}
                {selectedEvent.status === 'pending' && 'Pending'}
                {selectedEvent.status === 'rejected' && 'Rejected'}
              </span>
            </div>

            <h4 className="text-xl font-bold text-[var(--spring-green-dark)] mb-3">{selectedEvent.title}</h4>

            <div className="space-y-2.5 mb-6 text-sm">
              <p className="text-[var(--spring-green-text)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--spring-green-dark)] shrink-0" />
                {new Date(selectedEvent.startTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })} - {new Date(selectedEvent.endTime).toLocaleString('en-US', {
                  timeStyle: 'short'
                })}
              </p>

              {selectedEvent.location && (
                <p className="text-[var(--spring-green-text)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--spring-green-dark)] shrink-0" />
                  {selectedEvent.location}
                </p>
              )}

              {selectedEvent.description && (
                <div className="text-[var(--spring-green-dark)] border-t border-[var(--spring-green-mid)]/40 pt-3 mt-3 text-xs leading-relaxed max-h-32 overflow-y-auto bg-[var(--spring-page-bg)] p-2.5 rounded-xl">
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-[var(--spring-green-mid)] pt-4 mt-4 justify-end">
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this event?')) {
                    await onDeleteEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }
                }}
                className="px-4 py-2 spring-btn-danger text-xs"
              >
                Delete
              </button>

              {selectedEvent.status === 'pending' && (
                <button
                  onClick={async () => {
                    await onConfirmEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 spring-btn-primary text-xs"
                >
                  Confirm Event
                </button>
              )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--spring-green-text)] border border-[var(--spring-green-mid)] hover:bg-[var(--spring-green-light)] rounded-xl transition duration-200"
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
