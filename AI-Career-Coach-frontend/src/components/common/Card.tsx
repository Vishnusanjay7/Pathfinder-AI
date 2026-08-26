import React, { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
}

const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

export default function Card({ children, className = '', padding = 'md', hoverEffect = false }: CardProps) {
  return (
    <div
      className={`glass rounded-2xl shadow-lg shadow-black/10 transition-all duration-300 ${
        hoverEffect ? 'hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-500/30 hover:shadow-indigo-500/5' : ''
      } ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
