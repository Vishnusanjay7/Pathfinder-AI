import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Mic,
  Volume2,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Video,
} from "lucide-react";
import type { HumanInterviewer } from "../../data/interviewAvatars";

export type PreRecordedVideoState =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "READY"
  | "GREETING"
  | "SPEAKING"
  | "GESTURING"
  | "LISTENING"
  | "THINKING"
  | "PROCESSING"
  | "NODDING"
  | "CLOSING"
  | "COMPLETED"
  | "ERROR";

export interface PreRecordedHumanInterviewerProps {
  state?: PreRecordedVideoState;
  interviewer: HumanInterviewer;
  activeQuestionText?: string | null;
  currentPhase?: string;
  lipsyncedVideoUrl?: string | null;
  onPlaybackEnded?: () => void;
  className?: string;
}

const VIDEO_ASSET_MAP: Record<string, string> = {
  GREETING: "/interviewer/greeting.mp4",
  IDLE: "/interviewer/listening.mp4",
  CONNECTING: "/interviewer/greeting.mp4",
  CONNECTED: "/interviewer/listening.mp4",
  READY: "/interviewer/listening.mp4",
  SPEAKING: "/interviewer/speaking.mp4",
  GESTURING: "/interviewer/speaking.mp4",
  LISTENING: "/interviewer/listening.mp4",
  THINKING: "/interviewer/thinking.mp4",
  PROCESSING: "/interviewer/nodding.mp4",
  NODDING: "/interviewer/nodding.mp4",
  CLOSING: "/interviewer/closing.mp4",
  COMPLETED: "/interviewer/closing.mp4",
  ERROR: "/interviewer/listening.mp4",
};

export const PreRecordedHumanInterviewer: React.FC<PreRecordedHumanInterviewerProps> = ({
  state,
  interviewer,
  activeQuestionText,
  currentPhase,
  lipsyncedVideoUrl,
  onPlaybackEnded,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const isLipSyncActive = Boolean(state === "SPEAKING" && lipsyncedVideoUrl);

  // Map state to video source
  const currentVideoSrc = useMemo(() => {
    if (isLipSyncActive && lipsyncedVideoUrl) {
      return lipsyncedVideoUrl;
    }
    return (state && VIDEO_ASSET_MAP[state]) || VIDEO_ASSET_MAP.LISTENING;
  }, [state, isLipSyncActive, lipsyncedVideoUrl]);

  // Seamlessly transition video clip on state or URL change
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.getAttribute("src") !== currentVideoSrc) {
      videoEl.src = currentVideoSrc;
      videoEl.currentTime = 0;
      videoEl.muted = !isLipSyncActive;
      videoEl.loop = !isLipSyncActive;

      videoEl.play().then(() => {
        setIsPlaying(true);
        setVideoError(null);
      }).catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("[Interviewer Video] Play notice:", err.message);
          // If unmuted autoplay blocked by browser policy, retry muted
          if (isLipSyncActive && videoEl.muted === false) {
            videoEl.muted = true;
            videoEl.play().catch(() => {});
          }
        }
      });
    }
  }, [currentVideoSrc, isLipSyncActive]);

  // State badge presentation
  const badge = useMemo(() => {
    switch (state) {
      case "SPEAKING":
        return {
          text: isLipSyncActive ? "AI Lip-Sync Active" : "Interviewer Speaking...",
          bg: isLipSyncActive
            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
            : "bg-blue-500/20 border-blue-500/40 text-blue-300",
          dot: "bg-emerald-400 animate-ping",
          icon: <Volume2 size={13} className={isLipSyncActive ? "text-emerald-400" : "text-blue-400"} />,
        };
      case "LISTENING":
        return {
          text: "Listening to Candidate...",
          bg: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
          dot: "bg-emerald-400 animate-ping",
          icon: <Mic size={13} className="text-emerald-400" />,
        };
      case "THINKING":
      case "PROCESSING":
        return {
          text: "Analyzing Response...",
          bg: "bg-purple-500/20 border-purple-500/40 text-purple-300",
          dot: "bg-purple-400 animate-pulse",
          icon: <Brain size={13} className="text-purple-400" />,
        };
      case "NODDING":
        return {
          text: "Acknowledging...",
          bg: "bg-teal-500/20 border-teal-500/40 text-teal-300",
          dot: "bg-teal-400 animate-ping",
          icon: <Sparkles size={13} className="text-teal-400" />,
        };
      case "CLOSING":
      case "COMPLETED":
        return {
          text: "Interview Completed",
          bg: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
          dot: "bg-emerald-400",
          icon: <CheckCircle2 size={13} className="text-emerald-400" />,
        };
      case "ERROR":
        return {
          text: "Interviewer Notice",
          bg: "bg-amber-500/20 border-amber-500/40 text-amber-300",
          dot: "bg-amber-400",
          icon: <AlertCircle size={13} className="text-amber-400" />,
        };
      default:
        return {
          text: "Session Active",
          bg: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
          dot: "bg-emerald-400 animate-pulse",
          icon: <Video size={13} className="text-emerald-400" />,
        };
    }
  }, [state, isLipSyncActive]);

  return (
    <div
      className={`interviewer-frame relative w-full h-full bg-[#050C17] overflow-hidden flex flex-col justify-center items-center select-none ${className}`}
      data-testid="prerecorded-human-interviewer"
    >
      {/* ── 1. REAL HD HUMAN INTERVIEWER VIDEO (AI LIP-SYNCED OR AMBIENT) ── */}
      <video
        ref={videoRef}
        src={currentVideoSrc}
        autoPlay
        playsInline
        muted={!isLipSyncActive}
        loop={!isLipSyncActive}
        className="w-full h-full object-cover object-center transition-opacity duration-500"
        onError={() => {
          setVideoError("Interviewer video asset unavailable.");
        }}
        onPlaying={() => setIsPlaying(true)}
        onEnded={() => {
          if (isLipSyncActive && onPlaybackEnded) {
            onPlaybackEnded();
          }
        }}
      />

      {/* ── Depth-of-Field Blur & Focus Overlays ── */}
      <div className="dof-blur-overlay" aria-hidden="true" />
      <div className="dof-vignette" aria-hidden="true" />
      <div className="dof-lighting-pop" aria-hidden="true" />

      {/* Error Card if video asset fails to load */}
      {videoError && (
        <div className="absolute inset-0 bg-[#071120]/95 flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl max-w-md space-y-2">
            <AlertCircle size={28} className="text-red-400 mx-auto" />
            <h4 className="text-sm font-bold text-red-300">{videoError}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify that <code className="text-emerald-400">public/interviewer/speaking.mp4</code> and other video assets are present in the public directory.
            </p>
          </div>
        </div>
      )}

      {/* Atmospheric depth vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050C17]/90 via-transparent to-[#050C17]/40 pointer-events-none" />

      {/* ── 2. TOP-LEFT STATE PILL ── */}
      <div className="absolute top-3.5 left-4 z-30 flex items-center gap-2 pointer-events-none">
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-xl font-semibold text-xs shadow-2xl transition-all duration-300 ${badge.bg}`}
        >
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          {badge.icon}
          <span>{badge.text}</span>
        </div>
      </div>

      {/* ── 3. TOP-RIGHT INTERVIEWER INFO PILL ── */}
      <div className="absolute top-3.5 right-4 z-30 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#091528]/90 border border-[#1E3355] rounded-xl text-xs font-semibold backdrop-blur-xl shadow-xl">
          <span className="text-white font-bold">{interviewer.name}</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-medium text-[11px]">{currentPhase || "Live Interview"}</span>
        </div>
      </div>

      {/* ── 4. BOTTOM ACTIVE QUESTION SUBTITLE BAR ── */}
      {activeQuestionText && (
        <div className="absolute bottom-5 left-5 right-5 z-30 pointer-events-none">
          <div className="max-w-3xl mx-auto bg-[#081220]/95 border border-[#1E3150] backdrop-blur-2xl px-5 py-3 rounded-2xl shadow-2xl text-center">
            <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed line-clamp-2">
              "{activeQuestionText}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreRecordedHumanInterviewer;
