import { useState, useEffect, useRef, useCallback } from "react";
import type { InterviewerStateV2 } from "../types/state";

export interface UseAvatarEngineOptionsV2 {
  interviewerId: string;
  defaultVideoSrc: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

export function useAvatarEngineV2({
  interviewerId,
  defaultVideoSrc,
  onPlaybackStart,
  onPlaybackEnd,
}: UseAvatarEngineOptionsV2) {
  const [avatarState, setAvatarState] = useState<InterviewerStateV2>("IDLE");
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>(defaultVideoSrc);
  const [isLipSyncActive, setIsLipSyncActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const onStartRef = useRef(onPlaybackStart);
  const onEndRef = useRef(onPlaybackEnd);

  useEffect(() => {
    onStartRef.current = onPlaybackStart;
    onEndRef.current = onPlaybackEnd;
  }, [onPlaybackStart, onPlaybackEnd]);

  // Set active lip-sync video stream when available
  const playLipSyncVideo = useCallback((videoUrl: string) => {
    setActiveVideoSrc(videoUrl);
    setIsLipSyncActive(true);
    setIsMuted(false);
    setAvatarState("SPEAKING");

    if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
      videoElementRef.current.muted = false;
      videoElementRef.current.play().catch((e) => {
        console.warn("[Avatar-v2] Autoplay was prevented:", e);
      });
    }
  }, []);

  const playAmbientState = useCallback((state: InterviewerStateV2) => {
    setAvatarState(state);
    setIsLipSyncActive(false);
    setIsMuted(true);
    setActiveVideoSrc(defaultVideoSrc);

    if (videoElementRef.current) {
      videoElementRef.current.muted = true;
      videoElementRef.current.play().catch(() => {});
    }
  }, [defaultVideoSrc]);

  const handleVideoEnded = useCallback(() => {
    if (isLipSyncActive) {
      setIsLipSyncActive(false);
      setIsMuted(true);
      setActiveVideoSrc(defaultVideoSrc);
      setAvatarState("LISTENING");
      onEndRef.current?.();
    }
  }, [defaultVideoSrc, isLipSyncActive]);

  const handleVideoPlaying = useCallback(() => {
    if (isLipSyncActive) {
      onStartRef.current?.();
    }
  }, [isLipSyncActive]);

  return {
    avatarState,
    activeVideoSrc,
    isLipSyncActive,
    isMuted,
    videoElementRef,
    setAvatarState,
    playLipSyncVideo,
    playAmbientState,
    handleVideoEnded,
    handleVideoPlaying,
  };
}
