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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Decorative backdrop glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <h3 className="text-xl font-semibold text-dark-text flex items-center gap-2 mb-4">
          <MapPin className="text-blue-500 w-5 h-5" />
          Preferences & Settings
        </h3>

        {!user?.location && (
          <div className="mb-4 p-3 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl flex items-start gap-2 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Location Not Set</p>
              <p className="text-amber-400/80 mt-0.5">You must configure a city before we can automatically schedule weekend runs.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-1.5" htmlFor="city">
              Current City (e.g., London, San Francisco, Tokyo)
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name..."
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-200"
              required
            />
          </div>

          {message && (
            <p className="text-emerald-400 text-sm flex items-center gap-1">
              <Check className="w-4 h-4" /> {message}
            </p>
          )}

          {error && (
            <p className="text-rose-400 text-sm">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-dark-border text-dark-text hover:bg-dark-border transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 transition duration-200"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
