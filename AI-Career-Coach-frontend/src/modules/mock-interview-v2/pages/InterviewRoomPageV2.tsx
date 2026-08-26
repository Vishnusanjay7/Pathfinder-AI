import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HumanAvatarPresenter } from "../components/HumanAvatarPresenter";
import { CandidateCameraPreview } from "../components/CandidateCameraPreview";
import { LiveTranscriptStream } from "../components/LiveTranscriptStream";
import { InterviewControlBar } from "../components/InterviewControlBar";
import { useCandidateMediaV2 } from "../hooks/useCandidateMediaV2";
import { useAudioRecorderV2 } from "../hooks/useAudioRecorderV2";
import { useAvatarEngineV2 } from "../hooks/useAvatarEngineV2";
import { useWebSocketV2 } from "../hooks/useWebSocketV2";
import { mockInterviewV2API } from "../api/endpoints";
import { getInterviewerProfileByIdV2 } from "../config/interviewers";
import type { InterviewSessionV2, InterviewQuestionV2, TranscriptItemV2 } from "../types/interview";
import type { InterviewerProfileV2 } from "../types/interviewer";

export const InterviewRoomPageV2: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<InterviewSessionV2 | null>(null);
  const [interviewer, setInterviewer] = useState<InterviewerProfileV2>(
    getInterviewerProfileByIdV2("female_hr")
  );
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestionV2 | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItemV2[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isSubmittingRef = useRef<boolean>(false);
  const activeQuestionRef = useRef<InterviewQuestionV2 | null>(null);
  const processedQuestionIdsRef = useRef<Set<string>>(new Set());

  // 1. Candidate Camera & Mic
  const {
    stream,
    isCameraActive,
    isMicActive,
    toggleCamera,
    toggleMicrophone,
    stopMedia,
  } = useCandidateMediaV2();

  // 2. Avatar Presenter Hook
  const {
    avatarState,
    activeVideoSrc,
    isLipSyncActive,
    playLipSyncVideo,
    playAmbientState,
    handleVideoEnded,
    handleVideoPlaying,
  } = useAvatarEngineV2({
    interviewerId: interviewer.id,
    defaultVideoSrc: interviewer.avatar_video_src,
    onPlaybackEnd: () => {
      audioRecorder.startListening();
    },
  });

  // 3. Audio STT & Silence Auto-Submit Hook
  const audioRecorder = useAudioRecorderV2({
    silenceThresholdMs: 1500,
    onSpeechEnd: (finalAnswer) => {
      handleAnswerSubmit(finalAnswer);
    },
  });

  const handleIncomingQuestion = useCallback(
    (question: InterviewQuestionV2) => {
      if (!question || !question.id) return;
      if (processedQuestionIdsRef.current.has(question.id)) return;
      processedQuestionIdsRef.current.add(question.id);

      setActiveQuestion(question);
      activeQuestionRef.current = question;

      // Add to transcript
      setTranscripts((prev) => [
        ...prev,
        {
          id: `q_${question.number}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sender: "interviewer",
          senderName: interviewer.name,
          text: question.question,
          timestamp: new Date().toISOString(),
          phase: question.phase,
        },
      ]);

      // If lip-synced video URL is available, play it
      if (question.video_url) {
        playLipSyncVideo(question.video_url);
      } else if (question.audio_base64) {
        const audio = new Audio(`data:audio/mp3;base64,${question.audio_base64}`);
        playAmbientState("SPEAKING");
        audio.onended = () => {
          playAmbientState("LISTENING");
          audioRecorder.startListening();
        };
        audio.play().catch(() => {});
      } else {
        playAmbientState("LISTENING");
        audioRecorder.startListening();
      }
    },
    [interviewer.name, playLipSyncVideo, playAmbientState]
  );

  // 4. WebSocket Real-time Event Stream
  useWebSocketV2({
    sessionId,
    onEvent: (event) => {
      if (event.event === "next_question_ready" && event.payload?.question) {
        handleIncomingQuestion(event.payload.question);
      } else if (event.event === "interview_completed") {
        navigate(`/mock-interview-v2/report/${sessionId}`);
      }
    },
  });

  // Load Session Details & First Question Once
  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;

    mockInterviewV2API
      .getSessionDetails(sessionId)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.session) {
          const sess = res.data.session;
          setSession(sess);
          const prof = getInterviewerProfileByIdV2(sess.interviewer_id);
          setInterviewer(prof);

          if (sess.current_question && !processedQuestionIdsRef.current.has(sess.current_question.id)) {
            handleIncomingQuestion(sess.current_question);
          }
        }
      })
      .catch((err) => {
        console.warn("[Room-v2] Could not load session:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleAnswerSubmit = useCallback(
    async (answerText: string) => {
      const trimmed = answerText.trim();
      if (!trimmed || isSubmittingRef.current || !sessionId || !activeQuestionRef.current) return;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      audioRecorder.stopListening();
      playAmbientState("PROCESSING_ANSWER");

      // Add candidate answer to transcript
      setTranscripts((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sender: "candidate",
          senderName: "You",
          text: trimmed,
          timestamp: new Date().toISOString(),
          phase: activeQuestionRef.current?.phase || "TECHNICAL",
        },
      ]);

      try {
        const resp = await mockInterviewV2API.submitTurn({
          session_id: sessionId,
          phase: activeQuestionRef.current.phase,
          question_number: activeQuestionRef.current.number,
          question_text: activeQuestionRef.current.question,
          candidate_answer: trimmed,
        });

        if (resp.data.interview_completed) {
          stopMedia();
          navigate(`/mock-interview-v2/report/${sessionId}`);
        } else if (resp.data.next_question) {
          handleIncomingQuestion(resp.data.next_question);
        }
      } catch (err) {
        console.error("[Room-v2] Failed to submit answer turn:", err);
        playAmbientState("LISTENING");
        audioRecorder.startListening();
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        audioRecorder.resetTranscript();
      }
    },
    [sessionId, playAmbientState, stopMedia, navigate, handleIncomingQuestion]
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    try {
      await mockInterviewV2API.completeSession(sessionId);
    } catch {}
    stopMedia();
    navigate(`/mock-interview-v2/report/${sessionId}`);
  };

  return (
    <div
      data-testid="interview-room-v2"
      className="fixed inset-0 z-50 w-screen h-[100dvh] bg-black text-white flex flex-col overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <div className="h-14 bg-[#050C17]/95 border-b border-[#14233D] px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-white">
            {interviewer.name} &bull; {session?.target_role || "Interview"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            {activeQuestion ? `Question ${activeQuestion.number}` : "Ready"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">
            Difficulty: <span className="text-white">{session?.difficulty || "Hard"}</span>
          </span>
        </div>
      </div>

      {/* Main Corporate Boardroom Stage */}
      <div className="relative flex-1 w-full grid grid-cols-1 lg:grid-cols-4 overflow-hidden p-4 gap-4 bg-[#030712]">
        {/* Left / Center 3 Columns: High-Definition Human Interviewer Presenter */}
        <div className="lg:col-span-3 h-full relative rounded-3xl overflow-hidden border border-[#14233D] shadow-2xl bg-black">
          <HumanAvatarPresenter
            interviewer={interviewer}
            state={avatarState}
            activeVideoSrc={activeVideoSrc}
            isLipSyncActive={isLipSyncActive}
            activeQuestionText={activeQuestion?.question}
            currentPhaseName={activeQuestion?.phase}
            onVideoEnded={handleVideoEnded}
            onVideoPlaying={handleVideoPlaying}
          />
        </div>

        {/* Right 1 Column: Candidate Camera (Top) + Real-time Conversation Stream (Bottom) */}
        <div className="lg:col-span-1 h-full flex flex-col gap-4 overflow-hidden">
          {/* Candidate Webcam Preview (Picture-in-Picture) */}
          <div className="h-44 sm:h-52 shrink-0">
            <CandidateCameraPreview
              stream={stream}
              isCameraActive={isCameraActive}
              isMicActive={isMicActive}
              isListening={audioRecorder.isListening}
              candidateName="You (Candidate)"
            />
          </div>

          {/* Live Transcript Stream */}
          <div className="flex-1 overflow-hidden">
            <LiveTranscriptStream
              transcripts={transcripts}
              interimTranscript={audioRecorder.interimText}
              interviewerName={interviewer.name}
            />
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <InterviewControlBar
        isMicActive={isMicActive}
        isCameraActive={isCameraActive}
        isListening={audioRecorder.isListening}
        canSubmitManually={!!audioRecorder.transcript || !!audioRecorder.interimText}
        isFullscreen={isFullscreen}
        onToggleMic={toggleMicrophone}
        onToggleCamera={toggleCamera}
        onManualSubmit={() =>
          handleAnswerSubmit(audioRecorder.transcript || audioRecorder.interimText)
        }
        onToggleFullscreen={toggleFullscreen}
        onEndInterview={handleEndInterview}
      />
    </div>
  );
};
