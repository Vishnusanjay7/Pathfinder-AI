import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import AnimatedBackground from '../common/AnimatedBackground';

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function PageWrapper({ title, subtitle, action, children }: PageWrapperProps) {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
