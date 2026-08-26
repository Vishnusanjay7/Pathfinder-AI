import { type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  image?: string;
}

export default function EmptyState({ icon, title, description, action, image }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {image && (
        <div className="w-40 h-40 rounded-3xl overflow-hidden mb-6 border border-white/5 shadow-xl shadow-black/20">
          <img src={image} alt="" className="w-full h-full object-cover opacity-60" loading="lazy" />
        </div>
      )}
      {!image && icon && (
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-5 text-indigo-400 border border-indigo-500/20">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">{title}</h3>
      {description && <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-5 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}
