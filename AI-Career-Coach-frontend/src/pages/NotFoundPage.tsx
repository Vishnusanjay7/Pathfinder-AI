import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowRight, BrainCircuit } from 'lucide-react';
import AnimatedBackground from '../components/common/AnimatedBackground';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="relative min-h-screen text-white flex items-center justify-center p-6 select-none overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <AnimatedBackground />

      <div className="absolute inset-0 bg-gradient-to-br from-rose-600/5 via-transparent to-indigo-600/8 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 max-w-lg w-full glass-strong rounded-3xl p-10 text-center space-y-7 shadow-2xl"
      >
        {/* Decorative rings */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full border border-indigo-500/10 pointer-events-none" />
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full border border-indigo-500/5 pointer-events-none" />

        <div className="relative">
          <div className="w-24 h-24 brand-gradient rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/20">
            <Compass size={48} className="text-white animate-spin-slow" />
          </div>
        </div>

        <div>
          <span className="px-4 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
            Error 404 &middot; Page Not Found
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-4 leading-tight">
            Looks like your career roadmap took a wrong turn.
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed max-w-sm mx-auto">
            The destination you requested does not exist or has been relocated in our career intelligence network.
          </p>
        </div>

        <Link to="/" className="block">
          <Button variant="gradient" fullWidth size="lg" rightIcon={<ArrowRight size={16} />}>
            <BrainCircuit size={18} /> Return to CareerIQ Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
