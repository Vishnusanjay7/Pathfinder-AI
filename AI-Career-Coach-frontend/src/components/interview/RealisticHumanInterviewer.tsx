import React, { useState } from "react";
import { LiveKitVideoInterviewer, type LiveKitVideoInterviewerProps } from "./LiveKitVideoInterviewer";
import { PreRecordedHumanInterviewer } from "./PreRecordedHumanInterviewer";
import { VRMAvatarPlayer } from "./VRMAvatarPlayer";

export type InterviewerState = LiveKitVideoInterviewerProps["state"];

export interface RealisticHumanInterviewerProps extends LiveKitVideoInterviewerProps {
  avatarEngineMode?: "vrm" | "video";
  onToggleEngineMode?: () => void;
}

export const RealisticHumanInterviewer: React.FC<RealisticHumanInterviewerProps> = (props) => {
  const [internalEngineMode, setInternalEngineMode] = useState<"vrm" | "video">(
    props.avatarEngineMode || "vrm"
  );

  const activeMode = props.avatarEngineMode || internalEngineMode;

  const handleSwitchMode = () => {
    const nextMode = activeMode === "vrm" ? "video" : "vrm";
    setInternalEngineMode(nextMode);
    props.onToggleEngineMode?.();
  };

  // If remote WebRTC video track is actively subscribed, force live WebRTC video stream
  if (props.remoteVideoTrack) {
    return <LiveKitVideoInterviewer {...props} />;
  }

  // 1. Render 3D WebGL VRM Model Engine
  if (activeMode === "vrm") {
    return (
      <VRMAvatarPlayer
        avatarId={props.interviewer?.id || props.avatarId}
        vrmUrl={props.interviewer?.vrmUrl}
        interviewerName={props.interviewer?.name}
        interviewerRole={props.interviewer?.role}
        state={props.state as any}
        speechVolume={props.speechVolume}
        className={props.className}
        onSwitchMode={handleSwitchMode}
      />
    );
  }

  // 2. Render Photorealistic HD Video Engine
  return (
    <div className="relative w-full h-full">
      <PreRecordedHumanInterviewer
        state={props.state}
        interviewer={props.interviewer}
        activeQuestionText={props.activeQuestionText}
        currentPhase={props.currentPhase}
        lipsyncedVideoUrl={props.lipsyncedVideoUrl}
        onPlaybackEnded={props.onPlaybackEnded}
        className={props.className}
      />
      {/* Top right mode switch button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={handleSwitchMode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/85 hover:bg-slate-800/90 text-indigo-300 text-xs font-medium rounded-xl border border-slate-700/60 shadow-lg backdrop-blur-md transition-all"
          title="Switch to 3D VRM Model Avatar"
        >
          <span>Switch to 3D VRM</span>
        </button>
      </div>
    </div>
  );
};

export default RealisticHumanInterviewer;
