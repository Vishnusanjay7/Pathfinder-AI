import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  X
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const commands = [
  { label: 'Go to Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload & Analyze Resume', path: '/resume', icon: FileText },
  { label: 'Find Matching Jobs', path: '/jobs', icon: BriefcaseBusiness },
  { label: 'Start Adaptive AI Skill Assessment', path: '/assessment', icon: ClipboardCheck },
  { label: 'Launch AI Mock Interview', path: '/mock-interview', icon: Video },
  { label: 'Open Learning Center Roadmap', path: '/learning', icon: BookOpen },
  { label: 'View Notifications', path: '/notifications', icon: Bell },
  { label: 'Manage Candidate Profile', path: '/profile', icon: UserRound },
  { label: 'Account Settings', path: '/settings', icon: Settings },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-24 px-4 select-none">
      <div className="w-full max-w-lg bg-[#0B1024] border border-indigo-500/30 rounded-3xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Search size={16} className="text-indigo-400" />
            <span className="font-semibold text-white">CareerIQ Quick Navigation (Cmd+K)</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-hide">
          {commands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.path}
                onClick={() => {
                  navigate(cmd.path);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-indigo-600/20 hover:border hover:border-indigo-500/30 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className="text-indigo-400" />
                  <span>{cmd.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Jump →</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
