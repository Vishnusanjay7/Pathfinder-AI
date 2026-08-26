import React, { useRef, useEffect } from "react";
import { Sparkles, Volume2, Mic, BrainCircuit, User } from "lucide-react";
import type { InterviewerProfileV2 } from "../types/interviewer";
import type { InterviewerStateV2 } from "../types/state";

interface HumanAvatarPresenterProps {
  interviewer: InterviewerProfileV2;
  state: InterviewerStateV2;
  activeVideoSrc: string;
  isLipSyncActive: boolean;
  activeQuestionText?: string;
  currentPhaseName?: string;
  onVideoEnded?: () => void;
  onVideoPlaying?: () => void;
  className?: string;
}

export const HumanAvatarPresenter: React.FC<HumanAvatarPresenterProps> = ({
  interviewer,
  state,
  activeVideoSrc,
  isLipSyncActive,
  activeQuestionText,
  currentPhaseName,
  onVideoEnded,
  onVideoPlaying,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isLipSyncActive) {
        videoRef.current.muted = false;
        videoRef.current.loop = false;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch((err) => {
          console.warn("[AvatarPresenter-v2] Play error:", err);
        });
      } else {
        videoRef.current.muted = true;
        videoRef.current.loop = true;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [activeVideoSrc, isLipSyncActive]);

  const getStateBadge = () => {
    switch (state) {
      case "SPEAKING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20 animate-pulse">
            <Volume2 size={13} className="text-blue-400" />
            {isLipSyncActive ? "AI Lip-Sync Active" : "Interviewer Speaking..."}
          </span>
        );
      case "LISTENING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
            <Mic size={13} className="text-emerald-400 animate-bounce" />
            Listening to You (Your Turn)
          </span>
        );
      case "THINKING":
      case "PROCESSING_ANSWER":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/20">
            <BrainCircuit size={13} className="text-purple-400 animate-spin" />
            Evaluating Response...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800/80 text-slate-300 border border-slate-700/80">
            <User size={13} className="text-slate-400" />
            {interviewer.name}
          </span>
        );
    }
  };

  return (
    <div
      data-testid="human-avatar-presenter-v2"
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* Background Ambience */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${interviewer.background_backdrop_src})` }}
      />

      {/* Main High-Definition Interviewer Video */}
      <video
        ref={videoRef}
        src={activeVideoSrc}
        autoPlay
        playsInline
        muted={!isLipSyncActive}
        loop={!isLipSyncActive}
        onEnded={onVideoEnded}
        onPlaying={onVideoPlaying}
        className="relative z-10 w-full h-full object-cover"
        style={{ objectPosition: "center 25%" }}
      />

      {/* Top Floating Overlay: Live State Badge & Phase Indicator */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5">
          {getStateBadge()}
        </div>

        {currentPhaseName && (
          <div className="pointer-events-auto bg-[#070F1E]/85 border border-[#1A2C4A] backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Phase: {currentPhaseName}</span>
          </div>
        )}
      </div>

      {/* Bottom Floating Subtitle Bar */}
      {activeQuestionText && (
        <div className="absolute bottom-5 left-6 right-6 z-20 pointer-events-none flex justify-center">
          <div className="pointer-events-auto max-w-3xl w-full bg-[#050C17]/90 border border-[#1A2C4A] backdrop-blur-xl p-4 rounded-2xl shadow-2xl text-center">
            <p className="text-sm font-semibold text-white leading-relaxed tracking-wide">
              "{activeQuestionText}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
