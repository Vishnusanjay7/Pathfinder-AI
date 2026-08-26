import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Sliders, Palette, LayoutGrid, Eye } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [compact, setCompact] = useState(() => localStorage.getItem('compact-ui') === 'true');

  const updateCompact = (value: boolean) => {
    setCompact(value);
    localStorage.setItem('compact-ui', String(value));
  };

  return (
    <PageWrapper
      title="Application Settings"
      subtitle="Customize theme appearance, interface density, and privacy preferences."
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Appearance Section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card className="space-y-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Palette size={16} className="text-purple-400" />
              </div>
              Appearance & Theme
            </h3>

            {/* Theme Switcher Row */}
            <div className="flex items-center justify-between py-5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  {theme === 'dark'
                    ? <Moon size={18} className="text-amber-400" />
                    : <Sun size={18} className="text-indigo-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Theme Color Mode</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Currently using {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </p>
                </div>
              </div>

              <button
                onClick={toggleTheme}
                className="group relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform duration-300 ${
                    theme === 'dark'
                      ? 'translate-x-6 bg-indigo-500 shadow-indigo-500/30'
                      : 'translate-x-1 bg-amber-400 shadow-amber-400/30'
                  }`}
                />
                <span
                  className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                    theme === 'dark' ? 'bg-indigo-500/20' : 'bg-amber-500/20'
                  }`}
                />
              </button>
            </div>

            {/* Compact UI Toggle Row */}
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <LayoutGrid size={18} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Compact Interface Density</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Reduce spacing in list views and data cards
                  </p>
                </div>
              </div>

              <button
                onClick={() => updateCompact(!compact)}
                className="group relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform duration-300 ${
                    compact
                      ? 'translate-x-6 bg-indigo-500 shadow-indigo-500/30'
                      : 'translate-x-1 bg-slate-400 shadow-slate-400/30 dark:bg-slate-500'
                  }`}
                />
                <span
                  className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                    compact ? 'bg-indigo-500/20' : 'bg-white/5'
                  }`}
                />
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Privacy Section Placeholder */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
          <Card className="space-y-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Eye size={16} className="text-emerald-400" />
              </div>
              Privacy & Data
            </h3>

            <div className="py-5 text-center">
              <p className="text-sm text-[var(--text-muted)]">Additional privacy settings coming soon.</p>
            </div>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
