import { v2ApiClient } from "./client";
import type { InterviewerProfileV2 } from "../types/interviewer";
import type { InterviewSessionV2, InterviewQuestionV2 } from "../types/interview";
import type { FinalEvaluationReportV2 } from "../types/evaluation";

export const mockInterviewV2API = {
  getInterviewers: () =>
    v2ApiClient.get<{ success: boolean; interviewers: InterviewerProfileV2[]; total: number }>(
      "/interviewers"
    ),

  getInterviewerById: (id: string) =>
    v2ApiClient.get<{ success: boolean; interviewer: InterviewerProfileV2 }>(
      `/interviewers/${id}`
    ),

  startSession: (payload: {
    interviewer_id: string;
    target_role: string;
    difficulty: string;
    candidate_name?: string;
    job_description?: string;
    resume_context?: string;
  }) =>
    v2ApiClient.post<{
      success: boolean;
      session: InterviewSessionV2;
      first_question: InterviewQuestionV2;
    }>("/start", payload),

  getSessionDetails: (sessionId: string) =>
    v2ApiClient.get<{ success: boolean; session: InterviewSessionV2 }>(
      `/interview/${sessionId}`
    ),

  submitTurn: (payload: {
    session_id: string;
    phase: string;
    question_number: number;
    question_text: string;
    candidate_answer: string;
    elapsed_seconds?: number;
  }) =>
    v2ApiClient.post<{
      success: boolean;
      interview_completed: boolean;
      evaluation: any;
      next_question?: InterviewQuestionV2;
      phase: string;
    }>("/turn", payload),

  completeSession: (sessionId: string) =>
    v2ApiClient.post<{ success: boolean; status: string; session_id: string }>(
      "/complete",
      null,
      { params: { session_id: sessionId } }
    ),

  getReport: (sessionId: string) =>
    v2ApiClient.get<{ success: boolean; report: FinalEvaluationReportV2 }>(
      `/interview/${sessionId}/report`
    ),

  synthesizeTTS: (payload: {
    text: string;
    voice_id: string;
    interviewer_id: string;
    generate_video?: boolean;
  }) =>
    v2ApiClient.post<{
      success: boolean;
      audio_base64?: string;
      video_url?: string;
      video_duration?: number;
      processing_time_ms?: number;
      voice_id: string;
      text: string;
    }>("/tts", payload),

  generateLipSync: (payload: {
    audio_base64: string;
    interviewer_id: string;
    question_text?: string;
  }) =>
    v2ApiClient.post<{
      success: boolean;
      video_url: string;
      duration: number;
      processing_time_ms: number;
      engine: string;
    }>("/lipsync", payload),
};
