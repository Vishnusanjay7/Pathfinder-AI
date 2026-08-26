import React, { useRef, useEffect } from "react";
import { Camera, CameraOff, Mic, MicOff, User } from "lucide-react";

interface CandidateCameraPreviewProps {
  stream: MediaStream | null;
  isCameraActive: boolean;
  isMicActive: boolean;
  isListening?: boolean;
  candidateName?: string;
  className?: string;
}

export const CandidateCameraPreview: React.FC<CandidateCameraPreviewProps> = ({
  stream,
  isCameraActive,
  isMicActive,
  isListening = false,
  candidateName = "You (Candidate)",
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative w-full h-full bg-[#050C17] border border-[#192A45] rounded-2xl overflow-hidden shadow-xl flex items-center justify-center ${className}`}
    >
      {stream && isCameraActive ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <User size={24} />
          </div>
          <span className="text-xs font-semibold">Camera Inactive</span>
        </div>
      )}

      {/* Top Overlay Badge */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <span className="bg-[#050C17]/80 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white border border-slate-700/60">
          {candidateName}
        </span>

        <div className="flex items-center gap-1.5">
          <span
            className={`p-1 rounded-md text-[10px] ${
              isMicActive ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            {isMicActive ? <Mic size={12} /> : <MicOff size={12} />}
          </span>
          <span
            className={`p-1 rounded-md text-[10px] ${
              isCameraActive ? "bg-blue-500/20 text-blue-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            {isCameraActive ? <Camera size={12} /> : <CameraOff size={12} />}
          </span>
        </div>
      </div>

      {/* Listening Waveform Indicator */}
      {isListening && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-center gap-1 bg-emerald-950/80 border border-emerald-500/40 backdrop-blur-md py-1 px-3 rounded-lg">
          <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-pulse delay-75" />
          <span className="w-1.5 h-2.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
          <span className="text-[10px] font-bold text-emerald-300 ml-1.5">Microphone Active</span>
        </div>
      )}
    </div>
  );
};
