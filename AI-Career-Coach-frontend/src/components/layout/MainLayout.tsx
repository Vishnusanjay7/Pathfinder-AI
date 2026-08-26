import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, BriefcaseBusiness, Video, BookOpen, UserRound } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingAIButton from '../common/FloatingAIButton';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';

const mobileNavItems = [
  { to: '/', Icon: LayoutDashboard, label: 'Home' },
  { to: '/jobs', Icon: BriefcaseBusiness, label: 'Jobs' },
  { to: '/resume', Icon: FileText, label: 'Resume' },
  { to: '/mock-interview', Icon: Video, label: 'Interview' },
  { to: '/learning', Icon: BookOpen, label: 'Learn' },
  { to: '/profile', Icon: UserRound, label: 'Profile' },
];

const MainLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  return (
    <ThemeProvider>
      <div className="min-h-screen text-[var(--text-primary)] transition-colors duration-300 md:flex">
        <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />
        <main className="min-w-0 flex-1 flex flex-col min-h-screen">
          <Navbar onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)} />
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/5" style={{ background: 'rgba(6, 9, 15, 0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-around py-2 px-1">
            {mobileNavItems.map(({ to, Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition text-[10px] font-bold ${
                    isActive
                      ? 'text-indigo-400'
                      : 'text-[var(--text-muted)]'
                  }`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <FloatingAIButton />
      </div>
    </ThemeProvider>
  );
};

export default MainLayout;
