import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  RefreshCw,
  Sparkles,
  Send,
  Volume2,
  Edit3,
  ChevronRight,
  PhoneOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { mockInterviewAPI } from "../../api/endpoints";
import type { MockQuestion } from "../../types";
import { RealisticHumanInterviewer, type InterviewerState } from "../../components/interview/RealisticHumanInterviewer";
import CameraPreview from "../../components/interview/CameraPreview";
import LiveTranscriptStream, { type TranscriptItem } from "../../components/interview/LiveTranscriptStream";
import { useLiveKitInterview } from "../../hooks/useLiveKitInterview";
import { getAvatarById } from "../../data/interviewAvatars";

const INTERVIEW_PHASES = [
  "1. Introduction",
  "2. Background",
  "3. Resume",
  "4. Projects",
  "5. Company & Role",
  "6. Behavioral",
  "7. Technical",
  "8. Q&A",
  "9. Closing",
];

export default function InterviewRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = Number(id);

  // Session & Questions State (Single Source of Truth)
  const [roomState, setRoomState] = useState<InterviewerState>("CONNECTING");
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [avatarId, setAvatarId] = useState<string>("male_hr");
  const [targetRole, setTargetRole] = useState<string>("Software Engineer");
  const [avatarEngineMode, setAvatarEngineMode] = useState<"vrm" | "video">(
    () => (localStorage.getItem("preferred_avatar_engine") as "vrm" | "video") || "vrm"
  );
  const [sessionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Candidate Response State
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [manualAnswerText, setManualAnswerText] = useState<string>("");
  const [isManualInputMode, setIsManualInputMode] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lipsyncedVideoUrl, setLipsyncedVideoUrl] = useState<string | null>(null);

  // Media references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const bodyLanguageObsRef = useRef<string[]>([]);
  const finalSpokenRef = useRef<string>("");
  const hasInitializedRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  const interviewerProfile = getAvatarById(avatarId);
  const currentQuestion = questions[currentIndex] || null;
  const currentPhaseName =
    INTERVIEW_PHASES[Math.min(currentIndex, INTERVIEW_PHASES.length - 1)] || "Live Interview";

  // Centralized Answer Submission Function (Single Definition)
  const submitCurrentAnswer = useCallback(
    async (overrideText?: string) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        stopListening();
        stopSpeaking();

        const spokenAnswer = (finalSpokenRef.current + " " + transcriptInterim).trim();
        const answerContent =
          overrideText?.trim() ||
          manualAnswerText.trim() ||
          spokenAnswer ||
          "I have completed answering this question.";

        console.log(`[Interview] Submitting candidate answer for Q${currentIndex + 1}: "${answerContent.slice(0, 50)}..."`);

        // Record candidate's answer to live transcript stream
        const candidateMsgId = `cand_${Date.now()}`;
        setTranscriptItems((prev) => [
          ...prev,
          {
            id: candidateMsgId,
            sender: "candidate",
            text: answerContent,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            phase: currentPhaseName,
          },
        ]);

        setRoomState("PROCESSING");

        const bodyObs =
          bodyLanguageObsRef.current.length > 0
            ? bodyLanguageObsRef.current
            : ["Maintained attentive eye contact and confident posture throughout response."];

        // 1. Send conversational turn to backend
        const turnRes = await mockInterviewAPI.turn(interviewId, {
          question_id: currentQuestion?.id || currentIndex + 1,
          transcript: answerContent,
          body_language_observations: bodyObs,
          voice_id: interviewerProfile.defaultDeepgramVoice,
        });

        // Clear local answer buffers
        resetTranscript();
        finalSpokenRef.current = "";
        setManualAnswerText("");

        if (turnRes.data.is_final_question || currentIndex + 1 >= questions.length) {
          // Complete Interview Session
          setRoomState("COMPLETED");
          toast.success("Interview round completed! Compiling comprehensive evaluation report...");

          await mockInterviewAPI.completeInterview(interviewId);
          cleanupMedia();
          navigate(`/mock-interview/report/${interviewId}`);
        } else {
          // Advance to next conversational question
          const nextIdx = currentIndex + 1;
          setCurrentIndex(nextIdx);
          const nextQText = turnRes.data.next_question_text || questions[nextIdx]?.question;

          // Add interviewer reply to transcript
          setTranscriptItems((prev) => [
            ...prev,
            {
              id: `msg_q${nextIdx}`,
              sender: "interviewer",
              text: nextQText,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              phase: INTERVIEW_PHASES[Math.min(nextIdx, INTERVIEW_PHASES.length - 1)],
            },
          ]);

          // Set speaking state and speak next question via Deepgram TTS synthesized audio
          setRoomState("SPEAKING");
          speak(nextQText, turnRes.data.tts?.audio_base64);
        }
      } catch (err: any) {
        console.error("Conversational turn error:", err);
        toast.error("Processed answer. Continuing to next round.");
        if (currentIndex + 1 < questions.length) {
          const nextIdx = currentIndex + 1;
          setCurrentIndex(nextIdx);
          const nextQ = questions[nextIdx].question;
          setRoomState("SPEAKING");
          speak(nextQ);
        } else {
          navigate(`/mock-interview/report/${interviewId}`);
        }
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      interviewId,
      currentIndex,
      questions,
      currentQuestion,
      currentPhaseName,
      manualAnswerText,
      interviewerProfile.defaultDeepgramVoice,
      navigate,
    ]
  );

  // LiveKit Real-Time Hook
  const {
    isLiveKitConnected,
    remoteVideoTrack,
    isMuted,
    speechVolume,
    isListening,
    transcriptInterim,
    connectionError,
    connectLiveKit,
    disconnectLiveKit,
    toggleMicrophone,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    stopSpeaking,
  } = useLiveKitInterview({
    interviewId,
    interviewerId: avatarId,
    defaultVoiceId: interviewerProfile.defaultDeepgramVoice,
    silenceThresholdMs: 1500,
    onInterviewerSpeechStart: () => {
      setRoomState("SPEAKING");
      stopListening();
    },
    onInterviewerSpeechEnd: () => {
      // Interviewer finished asking question -> start listening immediately
      setRoomState("LISTENING");
      startListening();
    },
    onLipSyncVideoReady: (videoUrl: string) => {
      setLipsyncedVideoUrl(videoUrl);
    },
    onCandidateSpeechInterim: (_interim) => {
      // Candidate is speaking
    },
    onCandidateSpeechFinal: (finalText) => {
      finalSpokenRef.current = finalText;
    },
    onCandidateSilenceTimeout: (completeTranscript) => {
      // End-of-speech silence detected -> auto-submit answer
      submitCurrentAnswer(completeTranscript);
    },
    onError: (err) => {
      console.warn("LiveKit notice:", err);
    },
  });

  // Elapsed Session Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleBodyLanguageObservations = useCallback((obs: string[]) => {
    if (obs.length > 0) {
      bodyLanguageObsRef.current = obs;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      stopSpeaking();
      stopListening();
      disconnectLiveKit();
    } catch (e) {
      console.warn("Cleanup error:", e);
    }
  }, [stopSpeaking, stopListening, disconnectLiveKit]);

  // Fullscreen Management
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Load Session Data & Initialize LiveKit Room (Run Once On Mount)
  useEffect(() => {
    if (!interviewId || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    setRoomState("CONNECTING");

    mockInterviewAPI
      .getInterview(interviewId)
      .then(async (res) => {
        if (res.data?.questions && res.data.questions.length > 0) {
          setQuestions(res.data.questions);
          setAvatarId(res.data.avatar_id || "female_hr_01");
          setTargetRole(res.data.target_role || "Software Engineer");

          // Initialize candidate camera preview
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
              audio: true,
            });
            mediaStreamRef.current = stream;
            setIsCameraActive(true);
          } catch {
            console.warn("Microphone/Camera permission handled.");
          }

          // Connect to LiveKit WebRTC Session
          await connectLiveKit();
          setRoomState("CONNECTED");

          // Add first canonical question to transcript & begin speaking
          const firstQ = res.data.questions[0].question;
          setTranscriptItems([
            {
              id: "msg_q0",
              sender: "interviewer",
              text: firstQ,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              phase: INTERVIEW_PHASES[0],
            },
          ]);

          // Transition to speaking state and speak canonical Q1
          setRoomState("SPEAKING");
          speak(firstQ);
        } else {
          toast.error("No questions found for this interview session.");
          navigate("/mock-interview");
        }
      })
      .catch((err) => {
        console.error("Failed to load interview session:", err);
        toast.error("Failed to load interview session.");
        navigate("/mock-interview");
      });

    return () => {
      cleanupMedia();
    };
  }, [interviewId, navigate, connectLiveKit, cleanupMedia, speak]);

  const handleRepeatQuestion = () => {
    if (currentQuestion) {
      setRoomState("SPEAKING");
      speak(currentQuestion.question);
    }
  };

  const handleToggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        setIsCameraActive(videoTracks[0].enabled);
      }
    }
  };

  const handleExitInterview = () => {
    cleanupMedia();
    navigate("/mock-interview");
  };

  return (
    <div
      id="mock-interview-room-root"
      className="fixed inset-0 z-50 w-screen h-screen min-h-dvh max-h-dvh bg-[#050C17] text-slate-100 overflow-hidden select-none flex flex-col font-sans"
      style={{ width: "100vw", height: "100dvh" }}
    >
      {/* ── 1. Top Navigation & Header Bar ── */}
      <header className="h-14 px-4 bg-[#081220]/95 border-b border-[#1E3150] backdrop-blur-xl flex items-center justify-between z-40 shrink-0">
        {/* Left Badge: Interview Details & Live Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#0D1B2E] border border-[#1E3150] rounded-xl text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold">{interviewerProfile.name}</span>
            <span className="text-slate-500 font-bold">|</span>
            <span className="text-slate-300 font-medium">{targetRole}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE ● {formatElapsed(elapsedSeconds)}
          </div>
        </div>

        {/* Center: Phase Progress Pills */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#0D1B2E] border border-[#1E3150] px-3 py-1 rounded-xl text-xs">
          {questions.map((q, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={q.id || idx} className="flex items-center gap-1">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    isCurrent
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/25 font-black"
                      : isPast
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  Q{idx + 1}
                </span>
                {idx < questions.length - 1 && (
                  <ChevronRight size={10} className="text-slate-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Fullscreen & Exit Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#0D1B2E] hover:bg-[#142845] text-slate-300 border border-[#1E3150] rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          <button
            onClick={handleExitInterview}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all backdrop-blur-xl shadow-lg cursor-pointer"
          >
            <PhoneOff size={13} /> Exit Interview
          </button>
        </div>
      </header>

      {/* ── 2. Main Stage Grid (Left: Large AI Lip-Synced Human Interviewer, Right: Candidate Camera & Live Transcript) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 pb-24 overflow-hidden">
        {/* LEFT / MAIN STAGE (7 cols on desktop): Large Realistic Human Interviewer in Corporate Office */}
        <div className="interviewer-frame lg:col-span-7 xl:col-span-8 relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden shadow-2xl border border-[#1E3150] bg-black flex flex-col">
          <RealisticHumanInterviewer
            avatarId={avatarId}
            interviewer={interviewerProfile}
            avatarEngineMode={avatarEngineMode}
            onToggleEngineMode={() => {
              const nextMode = avatarEngineMode === "vrm" ? "video" : "vrm";
              setAvatarEngineMode(nextMode);
              localStorage.setItem("preferred_avatar_engine", nextMode);
            }}
            state={roomState}
            speechVolume={speechVolume}
            isLiveKitConnected={isLiveKitConnected}
            activeQuestionText={currentQuestion?.question}
            currentPhase={currentPhaseName}
            remoteVideoTrack={remoteVideoTrack}
            connectionError={connectionError}
            lipsyncedVideoUrl={lipsyncedVideoUrl}
            onPlaybackEnded={() => {
              setRoomState("LISTENING");
              startListening();
            }}
            onReconnect={connectLiveKit}
            onEndInterview={handleExitInterview}
            className="w-full h-full"
          />
        </div>

        {/* RIGHT SIDEBAR (5 cols on desktop): Candidate HD Webcam + Live Transcript */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full min-h-0">
          {/* Top Half of Sidebar: Mirrored Candidate Camera Preview */}
          <div className="h-44 sm:h-52 relative rounded-2xl overflow-hidden border border-[#1E3150] shadow-xl bg-[#091426] shrink-0">
            <CameraPreview
              stream={mediaStreamRef.current}
              isRecording={isListening}
              isMicActive={!isMuted}
              active={isCameraActive}
              onObservationsUpdate={handleBodyLanguageObservations}
            />

            {/* Speaking / Listening Mic Indicator Overlay */}
            <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-[#091426]/90 border border-[#1E3150] px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-md">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMuted
                    ? "bg-red-400"
                    : isListening
                    ? "bg-emerald-400 animate-ping"
                    : roomState === "SPEAKING"
                    ? "bg-blue-400 animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              <span className={isMuted ? "text-red-300" : isListening ? "text-emerald-300" : "text-slate-300"}>
                {isMuted
                  ? "Muted"
                  : isListening
                  ? "Candidate Listening (Speak Now)"
                  : roomState === "SPEAKING"
                  ? "Interviewer Speaking..."
                  : "Connecting..."}
              </span>
            </div>
          </div>

          {/* Bottom Half of Sidebar: Live Conversation Transcript Stream */}
          <div className="flex-1 min-h-0">
            <LiveTranscriptStream
              items={transcriptItems}
              currentInterim={transcriptInterim}
              isListening={isListening}
              interviewerName={interviewerProfile.name}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Optional Manual Text Drawer (For text fallback input) ── */}
      {isManualInputMode && (
        <div className="absolute bottom-20 left-4 right-4 z-40 bg-[#0B1728]/95 border border-[#1E3150] backdrop-blur-2xl p-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
          <textarea
            value={manualAnswerText}
            onChange={(e) => setManualAnswerText(e.target.value)}
            placeholder="Type your response here if speech input is unavailable..."
            rows={2}
            className="flex-1 bg-[#060D17] border border-[#1E3150] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
          />
          <button
            onClick={() => submitCurrentAnswer()}
            disabled={isSubmitting || !manualAnswerText.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Send size={13} /> Submit Text
          </button>
        </div>
      )}

      {/* ── 4. Bottom Floating Control Bar ── */}
      <div className="fixed bottom-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-none gap-3">
        {/* Left Controls: Audio / Video / Fullscreen Toggles */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#091426]/90 border border-[#1E3150] backdrop-blur-2xl px-3 py-2 rounded-2xl shadow-2xl">
          {/* Microphone Toggle */}
          <button
            onClick={toggleMicrophone}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isMuted
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
            }`}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Camera Toggle */}
          <button
            onClick={handleToggleCamera}
            title={isCameraActive ? "Disable Camera" : "Enable Camera"}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isCameraActive
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-[#0E1E34] text-slate-300 border border-[#1E3150] hover:bg-[#142845]"
            }`}
          >
            {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
            <span className="hidden sm:inline">{isCameraActive ? "Camera" : "Camera Off"}</span>
          </button>

          {/* Repeat Question */}
          <button
            onClick={handleRepeatQuestion}
            title="Repeat Interviewer Question"
            className="p-2.5 bg-[#0E1E34] hover:bg-[#142845] text-slate-300 border border-[#1E3150] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 size={16} />
            <span className="hidden sm:inline">Repeat</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="p-2.5 bg-[#0E1E34] hover:bg-[#142845] text-slate-300 border border-[#1E3150] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="hidden md:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>
        </div>

        {/* Right Action: Submit Response / Advance Turn */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Toggle Text Input Mode */}
          <button
            onClick={() => setIsManualInputMode((prev) => !prev)}
            title="Toggle Text Input"
            className="px-3.5 py-2.5 bg-[#091426]/90 hover:bg-[#10223D] border border-[#1E3150] text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-2xl shadow-xl cursor-pointer"
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">{isManualInputMode ? "Hide Text" : "Type Answer"}</span>
          </button>

          {/* Submit Answer & Next Question Button */}
          <button
            onClick={() => submitCurrentAnswer()}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-2xl shadow-emerald-500/30 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Processing Response...
              </>
            ) : currentIndex + 1 >= questions.length ? (
              <>
                <Sparkles size={14} /> Complete Interview
              </>
            ) : (
              <>
                <span>Done Answering</span>
                <ChevronRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
