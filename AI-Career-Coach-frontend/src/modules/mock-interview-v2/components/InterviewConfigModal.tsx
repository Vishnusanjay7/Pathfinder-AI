import React, { useState } from "react";
import { Play, Sparkles, X, Briefcase, Award, FileText, Sliders } from "lucide-react";
import type { InterviewerProfileV2 } from "../types/interviewer";

interface InterviewConfigModalProps {
  isOpen: boolean;
  interviewer: InterviewerProfileV2;
  onClose: () => void;
  onStart: (config: {
    targetRole: string;
    difficulty: string;
    experienceLevel: string;
    jobDescription?: string;
  }) => void;
  isLoading?: boolean;
}

export const InterviewConfigModal: React.FC<InterviewConfigModalProps> = ({
  isOpen,
  interviewer,
  onClose,
  onStart,
  isLoading = false,
}) => {
  const [targetRole, setTargetRole] = useState<string>("Senior Software Engineer");
  const [difficulty, setDifficulty] = useState<string>("Hard");
  const [experienceLevel, setExperienceLevel] = useState<string>("Mid-Senior (4-7 yrs)");
  const [jobDescription, setJobDescription] = useState<string>("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#081222] border border-[#1E3252] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 text-left space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              <Sparkles size={11} /> Real-Time Mock Interview v2
            </span>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              Configure Interview Session
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interviewer: <span className="text-white font-medium">{interviewer.name}</span> ({interviewer.role})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Briefcase size={14} className="text-blue-400" /> Target Job Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Full-Stack Engineer, Staff Cloud Architect..."
              className="w-full bg-[#050C17] border border-[#1C2F4D] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sliders size={14} className="text-purple-400" /> Interview Rigor
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-[#050C17] border border-[#1C2F4D] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Medium">Medium (Standard)</option>
                <option value="Hard">Hard (Senior Deep-Dive)</option>
                <option value="Expert">Expert (Principal / FAANG Level)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Award size={14} className="text-amber-400" /> Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full bg-[#050C17] border border-[#1C2F4D] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Entry-Level (0-2 yrs)">Entry-Level (0-2 yrs)</option>
                <option value="Mid-Level (2-5 yrs)">Mid-Level (2-5 yrs)</option>
                <option value="Mid-Senior (4-7 yrs)">Mid-Senior (4-7 yrs)</option>
                <option value="Senior / Staff (8+ yrs)">Senior / Staff (8+ yrs)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-emerald-400" /> Job Description / Key Technical Skills (Optional)
            </label>
            <textarea
              rows={3}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste specific job requirements or tech stack (e.g. Distributed microservices, Golang, React, AWS, Kubernetes)..."
              className="w-full bg-[#050C17] border border-[#1C2F4D] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onStart({
                targetRole,
                difficulty,
                experienceLevel,
                jobDescription: jobDescription.trim() || undefined,
              })
            }
            disabled={isLoading || !targetRole.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>Preparing Room...</>
            ) : (
              <>
                <Play size={14} /> Start Real-Time Interview
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
