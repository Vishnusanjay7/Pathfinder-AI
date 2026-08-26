import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageSquare, Send } from 'lucide-react';

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-16 right-0 w-80 glass-strong rounded-3xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden"
          >
            <div className="brand-gradient p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">CareerIQ Assistant</p>
                  <p className="text-[10px] text-white/70">AI-powered guidance</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 text-white/70 hover:text-white rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 h-48 flex flex-col items-center justify-center text-center">
              <MessageSquare size={28} className="text-indigo-400/50 mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">
                Ask me anything about your career journey, resume, or interview prep.
              </p>
            </div>
            <div className="p-3 border-t border-white/5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type your question..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
              <button className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition">
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 hover:shadow-indigo-500/60 transition-shadow"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
