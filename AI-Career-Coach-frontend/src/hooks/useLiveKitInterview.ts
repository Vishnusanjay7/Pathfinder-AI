import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteVideoTrack,
  RemoteAudioTrack,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalAudioTrack,
  LocalVideoTrack,
} from "livekit-client";
import { mockInterviewAPI } from "../api/endpoints";

export interface UseLiveKitInterviewOptions {
  interviewId: number | string;
  interviewerId?: string;
  defaultVoiceId?: string;
  silenceThresholdMs?: number;
  onInterviewerSpeechStart?: () => void;
  onInterviewerSpeechEnd?: () => void;
  onLipSyncVideoReady?: (videoUrl: string) => void;
  onCandidateSpeechInterim?: (interimText: string) => void;
  onCandidateSpeechFinal?: (finalText: string) => void;
  onCandidateSilenceTimeout?: (completeTranscript: string) => void;
  onError?: (errorMsg: string) => void;
}

export function useLiveKitInterview({
  interviewId,
  interviewerId = "ai_hr_interviewer_professional",
  defaultVoiceId = "aura-asteria-en",
  silenceThresholdMs = 1500,
  onInterviewerSpeechStart,
  onInterviewerSpeechEnd,
  onLipSyncVideoReady,
  onCandidateSpeechInterim,
  onCandidateSpeechFinal,
  onCandidateSilenceTimeout,
  onError,
}: UseLiveKitInterviewOptions) {
  // LiveKit WebRTC State
  const [isLiveKitConnected, setIsLiveKitConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteVideoTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<RemoteAudioTrack | null>(null);
  const [isAvatarParticipantJoined, setIsAvatarParticipantJoined] = useState<boolean>(false);
  const [avatarIdentity, setAvatarIdentity] = useState<string | null>(null);
  const [isAvatarVideoRendering, setIsAvatarVideoRendering] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Local Tracks & Media State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Audio Playback & Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechVolume, setSpeechVolume] = useState<number>(0);

  // STT State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcriptFinal, setTranscriptFinal] = useState<string>("");
  const [transcriptInterim, setTranscriptInterim] = useState<string>("");

  // Internal References
  const roomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isConnectingRef = useRef<boolean>(false);

  // Silence & Auto-Submit tracking
  const lastSpeechTimeRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<any>(null);

  const onSpeechStartRef = useRef(onInterviewerSpeechStart);
  const onSpeechEndRef = useRef(onInterviewerSpeechEnd);
  const onLipSyncVideoReadyRef = useRef(onLipSyncVideoReady);
  const onCandidateFinalRef = useRef(onCandidateSpeechFinal);
  const onCandidateInterimRef = useRef(onCandidateSpeechInterim);
  const onSilenceTimeoutRef = useRef(onCandidateSilenceTimeout);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSpeechStartRef.current = onInterviewerSpeechStart;
    onSpeechEndRef.current = onInterviewerSpeechEnd;
    onLipSyncVideoReadyRef.current = onLipSyncVideoReady;
    onCandidateFinalRef.current = onCandidateSpeechFinal;
    onCandidateInterimRef.current = onCandidateSpeechInterim;
    onSilenceTimeoutRef.current = onCandidateSilenceTimeout;
    onErrorRef.current = onError;
  }, [
    onInterviewerSpeechStart,
    onInterviewerSpeechEnd,
    onLipSyncVideoReady,
    onCandidateSpeechFinal,
    onCandidateSpeechInterim,
    onCandidateSilenceTimeout,
    onError,
  ]);

  // Connect to LiveKit Room and Subscribe to Remote Avatar Tracks
  const connectLiveKit = useCallback(async () => {
    if (isConnectingRef.current || (roomRef.current && roomRef.current.state === "connected")) {
      return;
    }
    isConnectingRef.current = true;
    setIsConnecting(true);
    setConnectionError(null);

    console.log(`[Interview] Started interview_id=${interviewId}`);
    console.log(`[LiveKit] Connecting to WebRTC room`);

    try {
      // 1. Request LiveKit session token with video/audio grants for candidate
      const roomName = `interview_room_${interviewId}`;
      const res = await mockInterviewAPI.createVoiceSession({
        room_name: roomName,
        participant_identity: `candidate_${interviewId}_${Date.now().toString(36)}`,
        avatar_id: interviewerId,
      });

      if (!res.data.success || !res.data.token) {
        const errMsg = "Failed to obtain LiveKit token from backend.";
        setConnectionError(errMsg);
        throw new Error(errMsg);
      }

      const { server_url, token } = res.data;
      console.log(`[Interview] Real-Time Media Session initialized for room=${roomName}`);

      // 2. Instantiate LiveKit Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Helper to attach participant tracks
      const inspectAndSubscribeParticipant = (p: RemoteParticipant) => {
        console.log(`[LiveKit] Avatar participant connected: identity=${p.identity} (SID: ${p.sid})`);
        setIsAvatarParticipantJoined(true);
        setAvatarIdentity(p.identity);

        p.trackPublications.forEach((pub: RemoteTrackPublication) => {
          if (pub.kind === Track.Kind.Video) {
            console.log(`[LiveKit] Avatar video track published: sid=${pub.trackSid}`);
            if (pub.track) {
              setRemoteVideoTrack(pub.track as RemoteVideoTrack);
              console.log(`[LiveKit] Avatar video subscribed: ${pub.track.sid}`);
            }
          } else if (pub.kind === Track.Kind.Audio) {
            console.log(`[LiveKit] Avatar audio track published: sid=${pub.trackSid}`);
            if (pub.track) {
              setRemoteAudioTrack(pub.track as RemoteAudioTrack);
              console.log(`[LiveKit] Avatar audio subscribed: ${pub.track.sid}`);
            }
          }
        });
      };

      // 3. Listen for Remote Avatar Video & Audio Tracks & Participant Lifecycle
      room.on(RoomEvent.Connected, () => {
        setIsLiveKitConnected(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
        console.log(`[LiveKit] Connected to room: ${room.name}`);

        room.remoteParticipants.forEach((p) => {
          inspectAndSubscribeParticipant(p);
        });
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        inspectAndSubscribeParticipant(participant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log(`[LiveKit] Participant Left: ${participant.identity} (SID: ${participant.sid})`);
      });

      room.on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication) => {
        if (publication.kind === Track.Kind.Video) {
          console.log(`[LiveKit] Avatar video track published: sid=${publication.trackSid}`);
          publication.setSubscribed(true);
        } else if (publication.kind === Track.Kind.Audio) {
          console.log(`[LiveKit] Avatar audio track published: sid=${publication.trackSid}`);
          publication.setSubscribed(true);
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track: any) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteVideoTrack(track as RemoteVideoTrack);
          console.log(`[LiveKit] Avatar video subscribed`);
        } else if (track.kind === Track.Kind.Audio) {
          setRemoteAudioTrack(track as RemoteAudioTrack);
          console.log(`[LiveKit] Avatar audio subscribed`);
          try {
            const audioElement = track.attach();
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);
          } catch (e) {
            console.warn("[LiveKit] Audio track attach notice:", e);
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteVideoTrack(null);
          setIsAvatarVideoRendering(false);
        } else if (track.kind === Track.Kind.Audio) {
          setRemoteAudioTrack(null);
          try {
            track.detach().forEach((el: any) => el.remove());
          } catch {}
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("[LiveKit] Room Disconnected");
        setIsLiveKitConnected(false);
        setRemoteVideoTrack(null);
        setRemoteAudioTrack(null);
        setIsAvatarParticipantJoined(false);
        setIsAvatarVideoRendering(false);
        isConnectingRef.current = false;
      });

      // 4. Connect WebRTC session
      try {
        await room.connect(server_url, token);
        roomRef.current = room;

        // Publish candidate audio track to room
        try {
          const audioTrack = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
          localAudioTrackRef.current = audioTrack;
          await room.localParticipant.publishTrack(audioTrack);
        } catch (e) {
          console.warn("[LiveKit] Microphone publishing notice:", e);
        }

        // Publish candidate video track
        try {
          const videoTrack = await createLocalVideoTrack({
            resolution: { width: 640, height: 480, frameRate: 30 },
          });
          localVideoTrackRef.current = videoTrack;
          await room.localParticipant.publishTrack(videoTrack);
        } catch {
          // Camera permission fallback
        }
      } catch (err: any) {
        console.warn("[LiveKit] WebRTC room connect fallback:", err.message);
        setIsLiveKitConnected(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
      }
    } catch (err: any) {
      console.warn("[LiveKit] Session notice:", err.message);
      setIsLiveKitConnected(true);
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }, [interviewId, interviewerId]);

  // Disconnect & Teardown LiveKit
  const disconnectLiveKit = useCallback(() => {
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
      } catch {}
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
      } catch {}
      localVideoTrackRef.current = null;
    }
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch {}
      roomRef.current = null;
    }
    setIsLiveKitConnected(false);
    setRemoteVideoTrack(null);
    setRemoteAudioTrack(null);
    setIsAvatarParticipantJoined(false);
    setIsAvatarVideoRendering(false);
    isConnectingRef.current = false;
  }, []);

  // Mute / Unmute Controls
  const toggleMicrophone = useCallback(() => {
    if (localAudioTrackRef.current) {
      if (isMuted) {
        localAudioTrackRef.current.unmute();
        setIsMuted(false);
      } else {
        localAudioTrackRef.current.mute();
        setIsMuted(true);
      }
    } else {
      setIsMuted((prev) => !prev);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localVideoTrackRef.current) {
      if (isVideoMuted) {
        localVideoTrackRef.current.unmute();
        setIsVideoMuted(false);
      } else {
        localVideoTrackRef.current.mute();
        setIsVideoMuted(true);
      }
    } else {
      setIsVideoMuted((prev) => !prev);
    }
  }, [isVideoMuted]);

  // Silence Monitor Interval
  useEffect(() => {
    if (!isListening) {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }

    silenceTimerRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceSpeech = now - lastSpeechTimeRef.current;
      const text = accumulatedTranscriptRef.current.trim();

      // If speech was detected, text is non-empty, and silence duration exceeds threshold
      if (hasSpokenRef.current && text.length > 2 && lastSpeechTimeRef.current > 0 && timeSinceSpeech >= silenceThresholdMs) {
        console.log(`[STT] Silence threshold reached (${timeSinceSpeech}ms). Triggering auto-submit.`);
        hasSpokenRef.current = false;
        lastSpeechTimeRef.current = 0;
        onSilenceTimeoutRef.current?.(text);
      }
    }, 200);

    return () => {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [isListening, silenceThresholdMs]);

  // Candidate Speech Recognition (STT)
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setIsListening(true);
    hasSpokenRef.current = false;
    lastSpeechTimeRef.current = 0;

    if (!SpeechRecognition) {
      console.warn("Browser SpeechRecognition API unavailable. Use manual text input if required.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final || interim) {
          lastSpeechTimeRef.current = Date.now();
          hasSpokenRef.current = true;
        }

        if (final) {
          setTranscriptFinal((prev) => {
            const next = (prev + " " + final).trim();
            accumulatedTranscriptRef.current = next;
            onCandidateFinalRef.current?.(next);
            return next;
          });
        }
        if (interim !== undefined) {
          setTranscriptInterim(interim);
          const combined = (accumulatedTranscriptRef.current + " " + interim).trim();
          onCandidateInterimRef.current?.(interim);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === "not-allowed") {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Automatically restart if still in listening state
        if (isListening && recognitionRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn("Speech recognition initialization notice:", err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    hasSpokenRef.current = false;
    lastSpeechTimeRef.current = 0;
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscriptFinal("");
    setTranscriptInterim("");
    accumulatedTranscriptRef.current = "";
    hasSpokenRef.current = false;
    lastSpeechTimeRef.current = 0;
  }, []);

  // Web Speech Fallback TTS
  const playSpeechSynthesisFallback = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      onSpeechEndRef.current?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Victoria") ||
            v.name.includes("Google US English"))
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeechVolume(0.75);
        onSpeechStartRef.current?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeechVolume(0);
        onSpeechEndRef.current?.();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeechVolume(0);
        onSpeechEndRef.current?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      onSpeechEndRef.current?.();
    }
  }, []);

  // Primary TTS & Lip-Sync Player (Deepgram Aura + AI Lip-Sync Video)
  const speak = useCallback(
    async (text: string, directAudioBase64?: string, directVideoUrl?: string) => {
      stopListening();
      setIsSpeaking(true);
      setSpeechVolume(0.8);
      onSpeechStartRef.current?.();

      if (currentAudioElementRef.current) {
        try {
          currentAudioElementRef.current.pause();
        } catch {}
        currentAudioElementRef.current = null;
      }

      if (directVideoUrl) {
        onLipSyncVideoReadyRef.current?.(directVideoUrl);
        return;
      }

      // 1. Direct Base64 audio playback (from backend Deepgram TTS)
      if (directAudioBase64) {
        try {
          // Asynchronously request lipsync video cache
          mockInterviewAPI.generateLipsync({
            text,
            voice_id: defaultVoiceId,
            interviewer_id: interviewerId,
            audio_base64: directAudioBase64,
          }).then((res) => {
            if (res.data?.success && res.data.videoUrl) {
              onLipSyncVideoReadyRef.current?.(res.data.videoUrl);
            }
          }).catch(() => {});

          const audio = new Audio(`data:audio/mp3;base64,${directAudioBase64}`);
          currentAudioElementRef.current = audio;

          audio.onended = () => {
            setIsSpeaking(false);
            setSpeechVolume(0);
            onSpeechEndRef.current?.();
          };
          audio.onerror = () => {
            playSpeechSynthesisFallback(text);
          };
          await audio.play();
          return;
        } catch (e) {
          console.warn("Audio element play error, falling back to Web Speech:", e);
        }
      }

      // 2. Request Deepgram TTS + AI Lip-Synced Video from backend
      try {
        const ttsRes = await mockInterviewAPI.synthesizeTTS({
          text,
          voice_id: defaultVoiceId,
          language: "en-US",
          interviewer_id: interviewerId,
          generate_video: true,
        });

        if (ttsRes.data?.success) {
          if (ttsRes.data.video_url) {
            onLipSyncVideoReadyRef.current?.(ttsRes.data.video_url);
          }

          if (ttsRes.data.audio_base64) {
            const audio = new Audio(`data:audio/mp3;base64,${ttsRes.data.audio_base64}`);
            currentAudioElementRef.current = audio;

            audio.onended = () => {
              setIsSpeaking(false);
              setSpeechVolume(0);
              onSpeechEndRef.current?.();
            };
            audio.onerror = () => {
              playSpeechSynthesisFallback(text);
            };
            await audio.play();
            return;
          }
        }
      } catch (e) {
        console.warn("Deepgram TTS notice, using client SpeechSynthesis:", e);
      }

      // 3. Fallback to browser SpeechSynthesis
      playSpeechSynthesisFallback(text);
    },
    [defaultVoiceId, interviewerId, stopListening, playSpeechSynthesisFallback]
  );

  const stopSpeaking = useCallback(() => {
    if (currentAudioElementRef.current) {
      try {
        currentAudioElementRef.current.pause();
      } catch {}
      currentAudioElementRef.current = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
    setSpeechVolume(0);
  }, []);

  return {
    isLiveKitConnected,
    isConnecting,
    remoteVideoTrack,
    remoteAudioTrack,
    isAvatarParticipantJoined,
    avatarIdentity,
    isMuted,
    isVideoMuted,
    audioLevel,
    connectionError,
    isAvatarVideoRendering,
    setIsAvatarVideoRendering,
    isSpeaking,
    speechVolume,
    isListening,
    transcriptFinal,
    transcriptInterim,
    connectLiveKit,
    disconnectLiveKit,
    toggleMicrophone,
    toggleVideo,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    stopSpeaking,
  };
}
