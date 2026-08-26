import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LogOut, Sun, Moon, Bell, Search, Menu, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { notificationsAPI } from '../../api/endpoints';
import CommandPalette from '../common/CommandPalette';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export default function Navbar({ onToggleMobileSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);

  useEffect(() => {
    notificationsAPI.list()
      .then((res) => {
        if (res.data.success) {
          setUnreadCount(res.data.unread_count || 0);
        }
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const title = pathname === '/' ? 'Dashboard' : pathname.split('/').filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join(' / ');

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/5" style={{ background: 'rgba(6, 9, 15, 0.8)', backdropFilter: 'blur(16px) saturate(1.5)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="md:hidden p-2 text-[var(--text-muted)] hover:text-white rounded-xl hover:bg-white/5"
                aria-label="Open mobile menu"
              >
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCommandOpen(true)}
              className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[var(--text-muted)] hover:border-indigo-500/40 hover:bg-white/5 transition cursor-pointer"
            >
              <Search size={14} className="text-indigo-400" />
              <span>Search...</span>
              <kbd className="bg-white/5 px-1.5 py-0.5 text-[10px] rounded-lg text-[var(--text-muted)] font-mono border border-white/10">⌘K</kbd>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold">
              <Sparkles size={13} /> Active
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 text-[var(--text-muted)] hover:text-white rounded-xl hover:bg-white/5 transition"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
            </button>

            <Link
              to="/notifications"
              className="relative p-2 text-[var(--text-muted)] hover:text-white rounded-xl hover:bg-white/5 transition"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              )}
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <Link to="/profile" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-indigo-600/20">
                  {user?.full_name?.charAt(0).toUpperCase() || <User size={14} />}
                </div>
                <span className="hidden sm:inline-block max-w-[120px] truncate">{user?.full_name || 'User'}</span>
              </Link>

              <button
                onClick={logout}
                className="p-2 text-[var(--text-muted)] hover:text-rose-400 rounded-xl hover:bg-white/5 transition"
                aria-label="Sign out"
                title="Sign Out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </>
  );
}
