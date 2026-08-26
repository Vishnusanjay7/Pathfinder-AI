import React, { useEffect, useState } from "react";
import { CameraOff, Video } from "lucide-react";
import { useBodyLanguage } from "../../hooks/useBodyLanguage";
import type { BodyLanguageMetrics } from "../../utils/bodyLanguageAnalyzer";

interface CameraPreviewProps {
  stream?: MediaStream | null;
  isRecording?: boolean;
  isMicActive?: boolean;
  active?: boolean;
  onObservationsUpdate?: (observations: string[]) => void;
  onMetricsUpdate?: (metrics: BodyLanguageMetrics) => void;
}

function toneClass(label: string): string {
  if (label === "Upright" || label === "Stable" || label === "Good") return "text-emerald-400";
  if (label === "Neutral" || label === "Moderate" || label === "To the side" || label === "Slightly off-center") return "text-amber-400";
  return "text-red-400";
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  stream,
  isRecording = false,
  isMicActive = true,
  active = false,
  onObservationsUpdate,
  onMetricsUpdate,
}) => {
  const [internalStream, setInternalStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const activeStream = stream !== undefined ? stream : internalStream;

  const { videoRef, metrics } = useBodyLanguage({
    enabled: active && isCameraActive,
    onObservationsUpdate,
    onMetricsUpdate,
  });

  // Attach the candidate's camera stream to the video element. The video is
  // always mounted so the ref stays stable across stream changes.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (activeStream) {
      el.srcObject = activeStream;
      setIsCameraActive(true);
    } else {
      el.srcObject = null;
      setIsCameraActive(false);
    }
  }, [activeStream, videoRef]);

  useEffect(() => {
    const el = videoRef.current;
    return () => {
      if (el && el.srcObject) {
        try {
          el.srcObject = null;
        } catch {}
      }
    };
  }, [videoRef]);

  const startCamera = async () => {
    try {
      // Wider 16:9 framing so head, shoulders and upper body are visible.
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      setInternalStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Camera permission denied or unavailable:", err);
      setIsCameraActive(false);
    }
  };

  const hasMetrics = active && isCameraActive && metrics;

  return (
    <div className="candidate-preview relative w-full h-full bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl group">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />

      {/* Inactive Overlay */}
      {!isCameraActive && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-3 text-slate-500">
          <CameraOff size={26} className="mb-1 text-slate-600" />
          <span className="text-[10px] font-semibold">Camera Inactive</span>
          <button
            onClick={startCamera}
            className="mt-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
          >
            <Video size={10} /> Enable Feed
          </button>
        </div>
      )}

      {/* Floating Status Pills */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
        <span className="px-2 py-0.5 bg-slate-950/80 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold flex items-center gap-1 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> You
        </span>
        {isMicActive && isCameraActive && (
          <span className="px-2 py-0.5 bg-slate-950/80 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-bold flex items-center gap-1 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Mic On
          </span>
        )}
      </div>

      {/* Recording Badge */}
      {isRecording && (
        <div className="absolute top-2 right-2 z-10 bg-red-600/90 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1.5 shadow animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Recording
        </div>
      )}

      {/* Observable Body-Language Indicators (update live while the camera runs) */}
      {hasMetrics && (
        <div className="absolute bottom-2 left-2 right-2 z-10 rounded-xl bg-slate-950/60 backdrop-blur-md border border-slate-700/60 px-2 py-1.5 text-[9px] font-semibold text-slate-300">
          <div className="flex items-center justify-between gap-1">
            <span>
              Posture: <span className={`font-bold ${toneClass(metrics.posture.label)}`}>{metrics.posture.label}</span>
            </span>
            <span>
              Gaze: <span className={`font-bold ${toneClass(metrics.eyeGaze.label)}`}>{metrics.eyeGaze.label}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span>
              Head: <span className={`font-bold ${toneClass(metrics.headMovement.label)}`}>{metrics.headMovement.label}</span>
            </span>
            <span>
              Frame: <span className={`font-bold ${toneClass(metrics.frame.label)}`}>{metrics.frame.label}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPreview;
