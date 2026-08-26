import React from "react";
import { UserCheck, Sparkles, Briefcase, Award, Shield, ChevronRight } from "lucide-react";
import type { InterviewerProfileV2 } from "../types/interviewer";
import { INTERVIEWER_PROFILES_CONFIG_V2 } from "../config/interviewers";

interface InterviewerSelectorProps {
  selectedId: string;
  onSelect: (interviewer: InterviewerProfileV2) => void;
}

export const InterviewerSelector: React.FC<InterviewerSelectorProps> = ({
  selectedId,
  onSelect,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {INTERVIEWER_PROFILES_CONFIG_V2.map((interviewer) => {
        const isSelected = selectedId === interviewer.id;

        return (
          <div
            key={interviewer.id}
            onClick={() => onSelect(interviewer)}
            className={`group relative flex flex-col justify-between rounded-2xl p-5 cursor-pointer transition-all duration-300 backdrop-blur-xl border ${
              isSelected
                ? "bg-[#0C1A30]/90 border-blue-500 shadow-2xl shadow-blue-500/20 ring-2 ring-blue-500/50 scale-[1.02]"
                : "bg-[#070F1E]/80 border-[#1B2A4A] hover:border-slate-600 hover:bg-[#0A162B]/80"
            }`}
          >
            {/* Header & Avatar Thumbnail */}
            <div>
              <div className="relative mb-4 overflow-hidden rounded-xl aspect-[4/3] bg-slate-900 border border-slate-800">
                <img
                  src={interviewer.avatar_thumbnail_src}
                  alt={interviewer.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070F1E] via-transparent to-transparent opacity-80" />

                {/* Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      interviewer.id.includes("tech")
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    <Sparkles size={10} />
                    {interviewer.id.includes("tech") ? "Technical Lead" : "HR Director"}
                  </span>
                </div>
              </div>

              {/* Title & Role */}
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors flex items-center justify-between">
                {interviewer.name}
                {isSelected && <UserCheck size={16} className="text-blue-400" />}
              </h3>
              <p className="text-xs text-blue-300/80 font-medium mt-0.5 line-clamp-1">
                {interviewer.role}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Award size={12} className="text-amber-400 shrink-0" />
                {interviewer.experience}
              </p>

              {/* Specialization */}
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {interviewer.description}
                </p>
              </div>
            </div>

            {/* Selection indicator */}
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold">
              <span className={isSelected ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}>
                {isSelected ? "Selected Interviewer" : "Click to Select"}
              </span>
              <ChevronRight size={14} className={isSelected ? "text-blue-400 translate-x-0.5" : "text-slate-600"} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
