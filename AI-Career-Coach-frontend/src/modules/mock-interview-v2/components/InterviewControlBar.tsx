import React from "react";
import { Mic, MicOff, Camera, CameraOff, Send, PhoneOff, Maximize, Minimize, Volume2 } from "lucide-react";

interface InterviewControlBarProps {
  isMicActive: boolean;
  isCameraActive: boolean;
  isListening: boolean;
  canSubmitManually: boolean;
  isFullscreen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onManualSubmit: () => void;
  onToggleFullscreen: () => void;
  onEndInterview: () => void;
}

export const InterviewControlBar: React.FC<InterviewControlBarProps> = ({
  isMicActive,
  isCameraActive,
  isListening,
  canSubmitManually,
  isFullscreen,
  onToggleMic,
  onToggleCamera,
  onManualSubmit,
  onToggleFullscreen,
  onEndInterview,
}) => {
  return (
    <div className="w-full bg-[#050C17]/90 border-t border-[#162742] backdrop-blur-xl px-6 py-3.5 flex items-center justify-between shadow-2xl">
      {/* Left controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMic}
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            isMicActive
              ? "bg-[#0B1E38] border-blue-500/40 text-blue-300 hover:bg-blue-900/40"
              : "bg-red-950/60 border-red-500/40 text-red-300 hover:bg-red-900/60"
          }`}
        >
          {isMicActive ? <Mic size={15} /> : <MicOff size={15} />}
          <span className="hidden sm:inline">{isMicActive ? "Mute Mic" : "Unmute Mic"}</span>
        </button>

        <button
          onClick={onToggleCamera}
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            isCameraActive
              ? "bg-[#0B1E38] border-blue-500/40 text-blue-300 hover:bg-blue-900/40"
              : "bg-red-950/60 border-red-500/40 text-red-300 hover:bg-red-900/60"
          }`}
        >
          {isCameraActive ? <Camera size={15} /> : <CameraOff size={15} />}
          <span className="hidden sm:inline">{isCameraActive ? "Stop Video" : "Start Video"}</span>
        </button>
      </div>

      {/* Center primary submit action */}
      <div className="flex items-center gap-3">
        <button
          onClick={onManualSubmit}
          disabled={!canSubmitManually}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Send size={14} />
          <span>Submit Answer</span>
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleFullscreen}
          className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>

        <button
          onClick={onEndInterview}
          className="px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-xl border border-red-500/50 shadow-lg shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <PhoneOff size={14} />
          <span className="hidden sm:inline">Finish & View Report</span>
        </button>
      </div>
    </div>
  );
};
