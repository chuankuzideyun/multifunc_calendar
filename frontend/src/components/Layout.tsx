import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Settings, Calendar, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenSettings }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-dark-text">Smart Schedule Assistant</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded-full ml-2 border border-blue-500/20">
                v1.0.0
              </span>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-dark-border">
                  {user.name ? (
                    <span className="text-sm font-semibold text-white uppercase">{user.name.slice(0, 2)}</span>
                  ) : (
                    <UserIcon className="w-4 h-4 text-dark-muted" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-dark-text leading-tight">{user.name || 'User'}</p>
                  <p className="text-[10px] text-dark-muted leading-none">{user.email}</p>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-dark-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSettings}
                  className="p-2 border border-dark-border hover:bg-dark-border hover:text-dark-text text-dark-muted rounded-xl transition duration-200"
                  title="Settings"
                >
                  <Settings className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={logout}
                  className="p-2 border border-dark-border hover:bg-rose-500/10 hover:border-rose-500/30 text-dark-muted hover:text-rose-400 rounded-xl transition duration-200"
                  title="Sign Out"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};
