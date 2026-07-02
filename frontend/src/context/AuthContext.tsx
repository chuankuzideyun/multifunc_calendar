import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, BASE_URL } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  location: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  updateLocation: (city: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await apiFetch<User>('/auth/me');
      setUser(userData);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithGoogle = () => {
    // Redirect directly to Google OAuth route on backend
    window.location.href = `${BASE_URL}/api/auth/google`;
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async (city: string) => {
    try {
      const res = await apiFetch('/auth/settings', {
        method: 'POST',
        body: { location: city }
      });
      setUser(prev => prev ? { ...prev, location: res.user.location } : null);
    } catch (err: any) {
      console.error('Failed to update location:', err);
      throw new Error(err.message || 'Failed to update location.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, updateLocation, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
