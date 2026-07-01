import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Check, AlertTriangle } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { user, updateLocation } = useAuth();
  const [city, setCity] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateLocation(city);
      setMessage('Settings saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings, please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-[var(--spring-green-mid)] rounded-2xl shadow-xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Decorative backdrop glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--spring-green-light)]/40 rounded-full blur-3xl pointer-events-none" />

        <h3 className="text-xl font-semibold text-[var(--spring-green-dark)] flex items-center gap-2 mb-4">
          <MapPin className="text-[var(--spring-green-dark)] w-5 h-5" />
          Preferences & Settings
        </h3>

        {!user?.location && (
          <div className="mb-4 p-3 bg-[var(--spring-yellow)] border border-[var(--spring-yellow-border)] text-[var(--spring-yellow-text)] rounded-xl flex items-start gap-2 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[var(--spring-yellow-text)]" />
            <div>
              <p className="font-medium text-[var(--spring-yellow-text)]">Location Not Set</p>
              <p className="text-[var(--spring-yellow-text)]/90 mt-0.5">You must configure a city before we can automatically schedule weekend runs.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--spring-green-text)] mb-1.5" htmlFor="city">
              Current City (e.g., London, San Francisco, Tokyo)
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name..."
              className="w-full bg-[var(--spring-page-bg)] border border-[var(--spring-green-mid)] rounded-xl px-4 py-3 text-[var(--spring-green-dark)] focus:outline-none focus:border-[var(--spring-green-text)] focus:ring-1 focus:ring-[var(--spring-green-light)] transition duration-200 placeholder-[var(--spring-green-mid)]/60"
              required
            />
          </div>

          {message && (
            <p className="text-[var(--spring-green-dark)] text-sm flex items-center gap-1 font-medium">
              <Check className="w-4 h-4 text-[var(--spring-green-text)]" /> {message}
            </p>
          )}

          {error && (
            <p className="text-[var(--spring-pink-text)] text-sm font-medium">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 spring-btn-danger"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 spring-btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
