import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Shield, Award, Play, Bot, Video, Mic, CheckCircle2, ChevronRight } from "lucide-react";
import { InterviewerSelector } from "../components/InterviewerSelector";
import { InterviewConfigModal } from "../components/InterviewConfigModal";
import { INTERVIEWER_PROFILES_CONFIG_V2 } from "../config/interviewers";
import type { InterviewerProfileV2 } from "../types/interviewer";
import { mockInterviewV2API } from "../api/endpoints";

export const MockInterviewHubPageV2: React.FC = () => {
  const navigate = useNavigate();
  const [selectedInterviewer, setSelectedInterviewer] = useState<InterviewerProfileV2>(
    INTERVIEWER_PROFILES_CONFIG_V2[0]
  );
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleStartSession = async (config: {
    targetRole: string;
    difficulty: string;
    experienceLevel: string;
    jobDescription?: string;
  }) => {
    setIsLoading(true);
    try {
      const resp = await mockInterviewV2API.startSession({
        interviewer_id: selectedInterviewer.id,
        target_role: config.targetRole,
        difficulty: config.difficulty,
        job_description: config.jobDescription,
      });

      if (resp.data && resp.data.session) {
        navigate(`/mock-interview-v2/room/${resp.data.session.session_id}`);
      }
    } catch (err) {
      console.error("[Hub-v2] Failed to start interview session:", err);
    } finally {
      setIsLoading(false);
      setIsConfigModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030814] text-white p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#071329] via-[#0A1D3D] to-[#081224] border border-[#182C4D] p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles size={13} />
              <span>Next-Gen Real-Time AI Mock Interview (v2)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Real-Time AI Mock Interview with <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Realistic Human Interviewers</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Experience authentic technical and behavioral interviews powered by realistic human video avatars, synchronized audio-driven lip movements, natural turn-taking, and in-depth recruitment scorecards.
            </p>

            <div className="pt-3 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-blue-600/30 flex items-center gap-2.5 transition-all cursor-pointer transform hover:scale-[1.02]"
              >
                <Play size={16} />
                <span>Start Interview with {selectedInterviewer.name}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-[#070F1E] border border-[#14233D] space-y-2">
            <Video size={20} className="text-blue-400" />
            <h4 className="text-sm font-bold text-white">Realistic Human Interviewers</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Photorealistic video presenters with synchronized mouth movement and natural head animations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#070F1E] border border-[#14233D] space-y-2">
            <Mic size={20} className="text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Continuous Voice & STT</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time candidate speech capture with natural silence detection and automatic submission.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#070F1E] border border-[#14233D] space-y-2">
            <Bot size={20} className="text-purple-400" />
            <h4 className="text-sm font-bold text-white">Adaptive Follow-Up Brain</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Context-aware LLM dynamically probes deeper into your past answers and architectural trade-offs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#070F1E] border border-[#14233D] space-y-2">
            <Award size={20} className="text-amber-400" />
            <h4 className="text-sm font-bold text-white">8-Metric Hiring Report</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular scoring across technical mastery, clarity, problem solving, and hiring recommendations.
            </p>
          </div>
        </div>

        {/* 4 Interviewer Selection Section */}
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Choose Your Interviewer</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select from our 4 specialized human executive and technical interview leads.
              </p>
            </div>
          </div>

          <InterviewerSelector
            selectedId={selectedInterviewer.id}
            onSelect={(interviewer) => setSelectedInterviewer(interviewer)}
          />
        </div>

        {/* Launch Modal */}
        <InterviewConfigModal
          isOpen={isConfigModalOpen}
          interviewer={selectedInterviewer}
          onClose={() => setIsConfigModalOpen(false)}
          onStart={handleStartSession}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
