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
    <div className="min-h-screen bg-[var(--spring-page-bg)] text-[var(--spring-green-dark)] flex flex-col font-sans relative overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-[var(--spring-green-mid)] bg-white/70 backdrop-blur sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--spring-green-light)] border border-[var(--spring-green-mid)] flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5 text-[var(--spring-green-dark)]" />
            </div>
            <div>
              <span className="font-bold text-lg text-[var(--spring-green-dark)]">Smart Schedule Assistant</span>
              <span className="text-[10px] bg-[var(--spring-pink-light)] text-[var(--spring-pink-text)] font-semibold px-2 py-0.5 rounded-full ml-2 border border-[var(--spring-pink-light)]">
                v1.0.0
              </span>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--spring-green-light)] flex items-center justify-center border border-[var(--spring-green-mid)]">
                  {user.name ? (
                    <span className="text-sm font-semibold text-[var(--spring-green-dark)] uppercase">{user.name.slice(0, 2)}</span>
                  ) : (
                    <UserIcon className="w-4 h-4 text-[var(--spring-green-text)]" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-[var(--spring-green-dark)] leading-tight">{user.name || 'User'}</p>
                  <p className="text-[10px] text-[var(--spring-green-text)] leading-none">{user.email}</p>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-[var(--spring-green-mid)] hidden sm:block" />

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSettings}
                  className="p-2 border border-[var(--spring-green-mid)] hover:bg-[var(--spring-green-light)] text-[var(--spring-green-text)] hover:text-[var(--spring-green-dark)] rounded-xl transition duration-200"
                  title="Settings"
                >
                  <Settings className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={logout}
                  className="p-2 border border-[var(--spring-green-mid)] hover:bg-[var(--spring-pink-light)] hover:border-[var(--spring-pink-light)] text-[var(--spring-green-text)] hover:text-[var(--spring-pink-text)] rounded-xl transition duration-200"
                  title="Sign Out"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 顶部导航栏右侧装饰：樱花花瓣（5瓣圆形排列） */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-15">
          <svg className="w-8 h-8 text-[#F48FB1]" viewBox="0 0 24 24" fill="currentColor">
            <g transform="translate(12,12)">
              <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" />
              <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(72)" />
              <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(144)" />
              <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(216)" />
              <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(288)" />
            </g>
          </svg>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {children}
      </main>
    </div>
  );
};
