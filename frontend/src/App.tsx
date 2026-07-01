import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { apiFetch } from './utils/api';
import { Layout } from './components/Layout';
import { CalendarView } from './components/CalendarView';
import { PendingQueue } from './components/PendingQueue';
import type { EventItem } from './components/EventItem';
import { AgentChat } from './components/AgentChat';
import { SettingsPanel } from './components/SettingsPanel';
import { ManualEventModal } from './components/ManualEventModal';
import { Calendar, Plus, AlertTriangle } from 'lucide-react';

function AppContent() {
  const { user, loading, loginWithGoogle } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  
  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Sync loadings
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [syncingWeather, setSyncingWeather] = useState(false);

  const fetchEvents = async () => {
    if (!user) return;
    setEventsLoading(true);
    try {
      const data = await apiFetch<EventItem[]>('/events');
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const handleConfirmEvent = async (id: string) => {
    try {
      await apiFetch(`/events/${id}/confirm`, { method: 'POST' });
      await fetchEvents();
    } catch (err: any) {
      alert(`Failed to confirm event: ${err.message}`);
    }
  };

  const handleRejectEvent = async (id: string) => {
    try {
      await apiFetch(`/events/${id}/reject`, { method: 'POST' });
      await fetchEvents();
    } catch (err: any) {
      alert(`Failed to reject event: ${err.message}`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await apiFetch(`/events/${id}`, { method: 'DELETE' });
      await fetchEvents();
    } catch (err: any) {
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  const handleSyncGmail = async () => {
    setSyncingGmail(true);
    try {
      const res = await apiFetch('/mail/sync', { method: 'POST' });
      alert(res.message || 'Gmail sync completed.');
      await fetchEvents();
    } catch (err: any) {
      alert(`Failed to sync Gmail: ${err.message}`);
    } finally {
      setSyncingGmail(false);
    }
  };

  const handleSyncWeather = async () => {
    setSyncingWeather(true);
    try {
      const res = await apiFetch('/weather/check-weekend', { method: 'POST' });
      alert(res.message || 'Weekend run planning completed.');
      await fetchEvents();
    } catch (err: any) {
      alert(`Failed to plan run: ${err.message}`);
    } finally {
      setSyncingWeather(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-dark-muted font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  // Login Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-dark-card/60 backdrop-blur-md border border-dark-border rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mx-auto mb-6">
            <Calendar className="w-9 h-9 text-white" />
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight">Smart Schedule Assistant</h2>
          <p className="text-dark-muted text-sm mt-3 mb-8 leading-relaxed">
            A minimalist, secure, and intelligent schedule integration hub.<br />
            Automatically extract schedules from Gmail, plan weekend running sessions based on weather, and create manual events instantly using voice commands.
          </p>

          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-2xl shadow-xl hover:scale-[1.01] transition active:scale-100"
          >
            {/* Custom Google logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 14.99 1 12 1 7.35 1 3.37 3.68 1.43 7.57l3.96 3.07C6.35 7.42 8.94 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.46h6.44c-.28 1.47-1.11 2.71-2.35 3.55l3.66 2.84c2.14-1.98 3.38-4.89 3.38-8.5z"
              />
              <path
                fill="#FBBC05"
                d="M5.39 14.36c-.24-.72-.38-1.49-.38-2.36s.14-1.64.38-2.36L1.43 6.57C.52 8.39 0 10.42 0 12.5s.52 4.11 1.43 5.93l3.96-3.07z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-3.96 1.09-3.06 0-5.65-2.38-6.61-5.6l-3.96 3.07C3.37 19.32 7.35 23 12 23z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="text-[10px] text-dark-muted mt-6 leading-normal">
            By signing in, you authorize this application to read your Gmail messages (read-only) and manage your Google Calendar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout onOpenSettings={() => setSettingsOpen(true)}>
      {/* Onboarding / Location Alert banner */}
      {!user.location && (
        <div className="mb-6 p-4 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Setup Reminder: Location Not Set</p>
              <p className="text-xs text-amber-400/80 mt-0.5">Please configure your current city name in settings so we can automatically schedule weekend runs for you!</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-4 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold rounded-xl transition duration-200"
          >
            Configure Now
          </button>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Pending cards queue + Voice assistant */}
        <div className="lg:col-span-1 space-y-6">
          <div className="h-[430px]">
            <PendingQueue
              events={events}
              onConfirm={handleConfirmEvent}
              onReject={handleRejectEvent}
              onSyncGmail={handleSyncGmail}
              onSyncWeather={handleSyncWeather}
              syncingGmail={syncingGmail}
              syncingWeather={syncingWeather}
            />
          </div>

          <div className="h-[450px]">
            <AgentChat onEventCreated={fetchEvents} />
          </div>
        </div>

        {/* Right Side: Big Calendar View */}
        <div className="lg:col-span-2">
          {eventsLoading && events.length === 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-8 flex items-center justify-center min-h-[500px]">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CalendarView
              events={events}
              onDeleteEvent={handleDeleteEvent}
              onConfirmEvent={handleConfirmEvent}
            />
          )}
        </div>
      </div>

      {/* Floating Action Button for Manual creation */}
      <button
        onClick={() => setCreateModalOpen(true)}
        className="fixed bottom-6 right-6 z-30 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl hover:scale-105 active:scale-100 flex items-center justify-center transition duration-200"
        title="新建日程"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}

      {createModalOpen && (
        <ManualEventModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={fetchEvents}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
