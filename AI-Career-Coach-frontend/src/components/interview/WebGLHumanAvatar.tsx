import React from "react";
import { LiveKitVideoInterviewer, type InterviewerState } from "./LiveKitVideoInterviewer";
import { getAvatarById } from "../../data/interviewAvatars";

export interface WebGLHumanAvatarProps {
  avatarId?: string;
  state?: InterviewerState;
  className?: string;
  remoteVideoTrack?: any;
}

export const WebGLHumanAvatar: React.FC<WebGLHumanAvatarProps> = ({
  avatarId = "ai_hr_interviewer_professional",
  state = "CONNECTED",
  className = "",
  remoteVideoTrack = null,
}) => {
  const interviewer = getAvatarById(avatarId);
  return (
    <LiveKitVideoInterviewer
      interviewer={interviewer}
      state={state}
      className={className}
      remoteVideoTrack={remoteVideoTrack}
    />
  );
};

export default WebGLHumanAvatar;
