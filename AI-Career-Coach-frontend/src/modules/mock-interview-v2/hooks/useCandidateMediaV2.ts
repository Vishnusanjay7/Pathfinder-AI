import { useState, useEffect, useRef, useCallback } from "react";

export function useCandidateMediaV2() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isMicActive, setIsMicActive] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const startMedia = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);
      setError(null);
    } catch (err: any) {
      console.warn("[Media-v2] Media access error:", err);
      setError("Camera or Microphone permission was denied or unavailable.");
      setHasPermission(false);
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setStream(null);
    setHasPermission(false);
  }, []);

  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraActive(videoTrack.enabled);
      }
    }
  }, []);

  const toggleMicrophone = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicActive(audioTrack.enabled);
      }
    }
  }, []);

  useEffect(() => {
    startMedia();
    return () => {
      stopMedia();
    };
  }, [startMedia, stopMedia]);

  return {
    stream,
    isCameraActive,
    isMicActive,
    hasPermission,
    error,
    startMedia,
    stopMedia,
    toggleCamera,
    toggleMicrophone,
  };
}
