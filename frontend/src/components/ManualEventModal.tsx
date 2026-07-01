import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { Calendar, MapPin, X } from 'lucide-react';

interface ManualEventModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualEventModal: React.FC<ManualEventModalProps> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (new Date(startTime) >= new Date(endTime)) {
      setError('End time must be after start time.');
      setLoading(false);
      return;
    }

    try {
      await apiFetch('/events/manual', {
        method: 'POST',
        body: { title, description, startTime, endTime, location }
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create event, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white border border-[var(--spring-green-mid)] rounded-2xl shadow-xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--spring-green-text)] hover:text-[var(--spring-green-dark)] transition duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-semibold text-[var(--spring-green-dark)] flex items-center gap-2 mb-6">
          <Calendar className="text-[var(--spring-green-dark)] w-5 h-5" />
          Create Event
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--spring-green-text)] mb-1" htmlFor="title">
              Event Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Team Sync"
              className="w-full bg-[var(--spring-page-bg)] border border-[var(--spring-green-mid)] rounded-xl px-4 py-2.5 text-[var(--spring-green-dark)] focus:outline-none focus:border-[var(--spring-green-text)] focus:ring-1 focus:ring-[var(--spring-green-light)] transition duration-200 placeholder-[var(--spring-green-mid)]/60"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--spring-green-text)] mb-1" htmlFor="startTime">
                Start Time
              </label>
              <input
                id="startTime"
                type="datetime-local"
                lang="en"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[var(--spring-page-bg)] border border-[var(--spring-green-mid)] rounded-xl px-4 py-2.5 text-[var(--spring-green-dark)] focus:outline-none focus:border-[var(--spring-green-text)] focus:ring-1 focus:ring-[var(--spring-green-light)] transition duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--spring-green-text)] mb-1" htmlFor="endTime">
                End Time
              </label>
              <input
                id="endTime"
                type="datetime-local"
                lang="en"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[var(--spring-page-bg)] border border-[var(--spring-green-mid)] rounded-xl px-4 py-2.5 text-[var(--spring-green-dark)] focus:outline-none focus:border-[var(--spring-green-text)] focus:ring-1 focus:ring-[var(--spring-green-light)] transition duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--spring-green-text)] mb-1" htmlFor="location">
              Location / Meeting Link
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-[var(--spring-green-text)]" />
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Conference Room 3B or Zoom Link"
                className="w-full bg-[var(--spring-page-bg)] border border-[var(--spring-green-mid)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--spring-green-dark)] focus:outline-none focus:border-[var(--spring-green-text)] focus:ring-1 focus:ring-[var(--spring-green-light)] transition duration-200 placeholder-[var(--spring-green-mid)]/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--spring-green-text)] mb-1" htmlFor="description">
              Description / Notes
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter meeting notes or details..."
              rows={3}
              className="w-full bg-[var(--spring-page-bg)] border border-[var(--spring-green-mid)] rounded-xl px-4 py-2.5 text-[var(--spring-green-dark)] focus:outline-none focus:border-[var(--spring-green-text)] focus:ring-1 focus:ring-[var(--spring-green-light)] transition duration-200 placeholder-[var(--spring-green-mid)]/60"
            />
          </div>

          {error && (
            <p className="text-[var(--spring-pink-text)] text-sm font-medium">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--spring-green-mid)] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 spring-btn-danger"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 spring-btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
