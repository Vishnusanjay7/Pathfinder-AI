import React, { useEffect, useRef, useState } from "react";
import {
  Volume2,
  Mic,
  Brain,
  Wifi,
  Briefcase,
  Sparkles,
  Video,
  AlertCircle,
  RefreshCw,
  UserCheck,
  PhoneOff,
} from "lucide-react";
import type { RemoteVideoTrack } from "livekit-client";
import type { HumanInterviewer } from "../../data/interviewAvatars";

export type InterviewerState =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "SPEAKING"
  | "GESTURING"
  | "LISTENING"
  | "THINKING"
  | "PROCESSING"
  | "ERROR"
  | "COMPLETED";

export interface LiveKitVideoInterviewerProps {
  avatarId?: string;
  interviewer: HumanInterviewer;
  state?: InterviewerState;
  speechVolume?: number;
  isLiveKitConnected?: boolean;
  activeQuestionText?: string;
  currentPhase?: string;
  remoteVideoTrack?: RemoteVideoTrack | null;
  connectionError?: string | null;
  lipsyncedVideoUrl?: string | null;
  onPlaybackEnded?: () => void;
  onReconnect?: () => void;
  onEndInterview?: () => void;
  className?: string;
}

export const LiveKitVideoInterviewer: React.FC<LiveKitVideoInterviewerProps> = ({
  interviewer,
  state = "CONNECTED",
  isLiveKitConnected = false,
  activeQuestionText,
  currentPhase = "1. Introduction",
  remoteVideoTrack,
  connectionError,
  onReconnect,
  onEndInterview,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Attach LiveKit WebRTC Remote Video Track directly to HTML5 video element
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (remoteVideoTrack) {
      try {
        remoteVideoTrack.attach(videoEl);
        console.log(`[LiveKit] Attached remote video track (SID: ${remoteVideoTrack.sid}) to video element`);

        const handlePlaying = () => {
          setIsVideoPlaying(true);
          console.log(`[Browser] Avatar video playing: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
          console.log(`[Browser] Photorealistic human visible`);
          console.log(`[Interview] Ready`);
        };

        videoEl.addEventListener("playing", handlePlaying);
        videoEl.addEventListener("loadedmetadata", handlePlaying);

        videoEl.play().catch((err) => {
          console.warn("[Browser] Video play notice:", err.message);
        });

        return () => {
          try {
            videoEl.removeEventListener("playing", handlePlaying);
            videoEl.removeEventListener("loadedmetadata", handlePlaying);
            remoteVideoTrack.detach(videoEl);
            console.log(`[LiveKit] Detached remote video track (SID: ${remoteVideoTrack.sid})`);
            setIsVideoPlaying(false);
          } catch {}
        };
      } catch (e) {
        console.warn("[LiveKit] Video track attach notice:", e);
      }
    } else {
      setIsVideoPlaying(false);
    }
  }, [remoteVideoTrack]);

  // Determine state badge & styling
  const getStateBadge = () => {
    switch (state) {
      case "SPEAKING":
        return {
          text: "Interviewer Speaking...",
          bg: "bg-blue-500/20 border-blue-500/40 text-blue-300",
          dot: "bg-blue-400 animate-ping",
          icon: <Volume2 size={13} className="text-blue-400" />,
        };
      case "GESTURING":
        return {
          text: "Interviewer Explaining...",
          bg: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
          dot: "bg-cyan-400 animate-ping",
          icon: <Sparkles size={13} className="text-cyan-400" />,
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
      case "ERROR":
        return {
          text: "Interviewer Reconnecting...",
          bg: "bg-red-500/20 border-red-500/40 text-red-300",
          dot: "bg-red-400",
          icon: <AlertCircle size={13} className="text-red-400" />,
        };
      case "COMPLETED":
        return {
          text: "Interview Round Completed",
          bg: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
          dot: "bg-emerald-400",
          icon: <UserCheck size={13} className="text-emerald-400" />,
        };
      case "CONNECTING":
        return {
          text: "Connecting LiveKit Real-Time Video...",
          bg: "bg-amber-500/20 border-amber-500/40 text-amber-300",
          dot: "bg-amber-400 animate-pulse",
          icon: <Wifi size={13} className="text-amber-400" />,
        };
      default:
        return {
          text: "Live Video Feed Active",
          bg: "bg-slate-800/80 border-slate-700 text-slate-300",
          dot: "bg-emerald-400",
          icon: <Video size={13} className="text-emerald-400" />,
        };
    }
  };

  const badge = getStateBadge();

  return (
    <div
      className={`relative w-full h-full min-h-[440px] bg-[#050C17] rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-[#1E3150] select-none ${className}`}
    >
      {/* ── 1. REAL-TIME LIVEKIT VIDEO ELEMENT (NO 3D/CANVAS/PHOTO OVERLAYS) ── */}
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            remoteVideoTrack ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{
            maxHeight: "100%",
          }}
        />

        {/* ── 2. CONNECTING / INITIALIZING OR UNAVAILABLE STATE (NO FAKE PHOTO OVERLAYS) ── */}
        {!remoteVideoTrack && (
          <div className="absolute inset-0 bg-[#071120] flex flex-col items-center justify-center p-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-[#091830]/80 via-[#060E1A]/90 to-[#040912] pointer-events-none" />
            <div className="absolute w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-md bg-[#091528]/95 border border-[#1E3355] backdrop-blur-2xl p-7 rounded-2xl shadow-2xl space-y-4">
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-emerald-500/20 border border-blue-500/30 flex items-center justify-center shadow-lg">
                <Video size={28} className="text-blue-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#091528] animate-ping" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
                  {interviewer.name}
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded-md">
                    AI Lip-Sync Active
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {interviewer.role} · {interviewer.experience}
                </p>
              </div>

              {/* Status Table */}
              <div className="p-3.5 bg-[#050C17]/90 border border-[#182B46] rounded-xl text-left space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Wifi size={12} className={isLiveKitConnected ? "text-emerald-400" : "text-amber-400"} />
                    LiveKit Candidate WebRTC:
                  </span>
                  <span className={`font-bold ${isLiveKitConnected ? "text-emerald-400" : "text-amber-400"}`}>
                    {isLiveKitConnected ? "CONNECTED" : "NEGOTIATING..."}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-emerald-400" />
                    Video Engine:
                  </span>
                  <span className="font-bold text-emerald-400">
                    AI LIP-SYNC (WAV2LIP)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Volume2 size={12} className="text-blue-400" />
                    Speech Engine:
                  </span>
                  <span className="font-bold text-blue-300">
                    DEEPGRAM AURA TTS
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800 leading-snug">
                  Active Interviewer: <code className="text-emerald-400">Priya Sharma (HR Director)</code>
                </p>
              </div>

              {connectionError && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 text-center font-medium leading-relaxed">
                    Interviewer video could not be prepared. Continuing with the interview.
                  </div>
                  <div className="flex items-center justify-center gap-2.5">
                    {onReconnect && (
                      <button
                        onClick={onReconnect}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    )}
                    {onEndInterview && (
                      <button
                        onClick={onEndInterview}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <PhoneOff size={12} /> End Interview
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Atmospheric depth vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050C17] via-transparent to-[#050C17]/30 pointer-events-none" />

      {/* ── 3. ACTIVE QUESTION OVERLAY SUBTITLE BAR ── */}
      {activeQuestionText && (
        <div className="absolute bottom-6 left-6 right-6 z-25 pointer-events-none">
          <div className="max-w-3xl mx-auto bg-[#081220]/95 border border-[#1E3150] backdrop-blur-2xl px-5 py-2.5 rounded-2xl shadow-2xl text-center">
            <p className="text-xs text-blue-300 font-medium line-clamp-2">
              "{activeQuestionText}"
            </p>
          </div>
        </div>
      )}

      {/* ── 4. TOP-LEFT FLOATING STATE BADGE ── */}
      <div className="absolute top-3.5 left-4 z-30 flex items-center gap-2 pointer-events-none">
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-xl font-semibold text-xs shadow-2xl transition-all duration-300 ${badge.bg}`}
        >
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          {badge.icon}
          <span>{badge.text}</span>
        </div>
      </div>

      {/* ── 5. TOP-RIGHT LIVEKIT & PHASE BADGE ── */}
      <div className="absolute top-3.5 right-4 z-30 flex items-center gap-2 pointer-events-none">
        {/* LiveKit WebRTC Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#091426]/85 border border-[#1E3150] backdrop-blur-xl text-xs font-semibold shadow-xl">
          <Wifi
            size={13}
            className={isLiveKitConnected ? "text-emerald-400" : "text-amber-400"}
          />
          <span className="text-[11px] text-slate-300">
            {isLiveKitConnected ? "LiveKit WebRTC (Connected)" : "LiveKit WebRTC"}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveKitConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
        </div>

        {/* Phase Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#091426]/85 border border-[#1E3150] backdrop-blur-xl text-xs font-semibold text-slate-300 shadow-xl">
          <Briefcase size={12} className="text-blue-400" />
          <span className="text-[11px] text-blue-300">{currentPhase}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveKitVideoInterviewer;
