import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BriefcaseBusiness,
  ClipboardCheck,
  Video,
  BookOpen,
  Bell,
  UserRound,
  Settings,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Target,
  X,
  type LucideIcon,
} from 'lucide-react';

const navItems: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/resume', label: 'My Resume', Icon: FileText },
  { to: '/jobs', label: 'Jobs', Icon: BriefcaseBusiness },
  { to: '/applications', label: 'Applications', Icon: ClipboardCheck },
  { to: '/assessment', label: 'Skill Assessment', Icon: Target },
  { to: '/mock-interview', label: 'Mock Interview', Icon: Video },
  { to: '/learning', label: 'Learning', Icon: BookOpen },
  { to: '/notifications', label: 'Notifications', Icon: Bell },
  { to: '/profile', label: 'Profile', Icon: UserRound },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen border-r border-white/5 transition-all duration-300 flex flex-col justify-between ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          background: 'rgba(6, 9, 15, 0.92)',
          backdropFilter: 'blur(24px) saturate(1.5)',
        }}
      >
        <div>
          {/* Header Logo */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 brand-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                <BrainCircuit size={20} className="text-white" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <h2 className="text-base font-black tracking-tight text-[var(--text-primary)]">
                    Career<span className="brand-gradient-text">IQ</span>
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-cyan-400">
                    AI Career Intelligence
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-[var(--text-muted)] hover:text-white rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-hide">
            {navItems.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                  }`
                }
              >
                <Icon size={18} className="shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && <span className="truncate">{label}</span>}
                {collapsed && (
                  <span className="hidden md:block absolute left-full ml-3 px-2.5 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold rounded-xl shadow-xl border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex p-3 border-t border-white/5">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="w-full flex items-center justify-center p-2 text-[var(--text-muted)] hover:text-white hover:bg-white/5 rounded-xl transition"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ChevronLeft size={18} /> Collapse
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
