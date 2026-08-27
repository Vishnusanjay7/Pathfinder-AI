import React from "react";
import { ThreeVRMAvatarCanvas } from "./ThreeVRMAvatarCanvas";
import { getAvatarById } from "../../data/interviewAvatars";

export type VRMAvatarState =
  | "loading"
  | "ready"
  | "idle"
  | "speaking"
  | "listening"
  | "thinking"
  | "error"
  | "stopped"
  | "CONNECTING"
  | "CONNECTED"
  | "SPEAKING"
  | "LISTENING"
  | "THINKING"
  | "PROCESSING"
  | "COMPLETED";

export interface VRMAvatarPlayerProps {
  vrmUrl?: string;
  avatarId?: string;
  interviewerName?: string;
  interviewerRole?: string;
  state?: VRMAvatarState;
  isSpeaking?: boolean;
  speechVolume?: number;
  active?: boolean;
  onLoaded?: () => void;
  onError?: (err: string) => void;
  onRetry?: () => void;
  onChooseAnother?: () => void;
  onSwitchMode?: () => void;
  className?: string;
  remoteVideoTrack?: any;
}

export const VRMAvatarPlayer: React.FC<VRMAvatarPlayerProps> = ({
  avatarId = "male_hr",
  vrmUrl,
  interviewerName,
  interviewerRole,
  state = "idle",
  isSpeaking = false,
  speechVolume = 0,
  className = "",
  onLoaded,
  onError,
  onSwitchMode,
}) => {
  const interviewer = getAvatarById(avatarId);
  let resolvedVrmUrl = vrmUrl || interviewer.vrmUrl || "/avatars/mpfb.glb";
  if (resolvedVrmUrl.includes("female-1.vrm")) resolvedVrmUrl = "/avatars/mpfb.glb";
  else if (resolvedVrmUrl.includes("female-2.vrm")) resolvedVrmUrl = "/avatars/brunette.glb";
  else if (resolvedVrmUrl.includes("male-1.vrm")) resolvedVrmUrl = "/avatars/avaturn.glb";
  else if (resolvedVrmUrl.includes("male-2.vrm")) resolvedVrmUrl = "/avatars/avatarsdk.glb";

  const name = interviewerName || interviewer.name;
  const role = interviewerRole || interviewer.role;
  const bgUrl = interviewer.backgroundUrl || "/avatars/office_backdrop_1.jpg";

  return (
    <ThreeVRMAvatarCanvas
      vrmUrl={resolvedVrmUrl}
      interviewerName={name}
      interviewerRole={role}
      backgroundUrl={bgUrl}
      state={state}
      isSpeaking={isSpeaking}
      speechVolume={speechVolume}
      className={className}
      onLoaded={onLoaded}
      onError={onError}
      onSwitchMode={onSwitchMode}
    />
  );
};

export default VRMAvatarPlayer;
