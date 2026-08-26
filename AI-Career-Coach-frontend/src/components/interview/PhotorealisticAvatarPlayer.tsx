import React from "react";
import {
  LiveKitVideoInterviewer,
  type InterviewerState,
} from "./LiveKitVideoInterviewer";
import { getAvatarById } from "../../data/interviewAvatars";

export type PhotorealisticAvatarState =
  | "loading"
  | "ready"
  | "idle"
  | "speaking"
  | "listening"
  | "thinking"
  | "error"
  | "stopped";

export type VRMAvatarState = PhotorealisticAvatarState;

export interface PhotorealisticAvatarPlayerProps {
  vrmUrl?: string;
  avatarId?: string;
  interviewerName?: string;
  interviewerRole?: string;
  state?: PhotorealisticAvatarState;
  isSpeaking?: boolean;
  speechVolume?: number;
  active?: boolean;
  onLoaded?: () => void;
  onError?: (err: string) => void;
  onRetry?: () => void;
  onChooseAnother?: () => void;
  className?: string;
  remoteVideoTrack?: any;
}

export const PhotorealisticAvatarPlayer: React.FC<PhotorealisticAvatarPlayerProps> = ({
  avatarId = "ai_hr_interviewer_professional",
  state = "idle",
  speechVolume = 0,
  className,
  remoteVideoTrack,
}) => {
  const interviewer = getAvatarById(avatarId);
  const mappedState: InterviewerState =
    state === "loading"
      ? "CONNECTING"
      : state === "speaking"
      ? "SPEAKING"
      : state === "listening"
      ? "LISTENING"
      : state === "thinking"
      ? "THINKING"
      : state === "error"
      ? "ERROR"
      : "CONNECTED";

  return (
    <LiveKitVideoInterviewer
      avatarId={avatarId}
      interviewer={interviewer}
      state={mappedState}
      speechVolume={speechVolume}
      className={className}
      remoteVideoTrack={remoteVideoTrack}
    />
  );
};

export default PhotorealisticAvatarPlayer;
