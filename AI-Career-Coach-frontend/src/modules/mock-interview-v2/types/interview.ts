export interface InterviewQuestionV2 {
  id: string;
  number: number;
  phase: string;
  question: string;
  category: string;
  expected_competency: string;
  audio_base64?: string;
  video_url?: string;
  created_at: string;
}

export interface InterviewSessionV2 {
  session_id: string;
  interviewer_id: string;
  interviewer_name?: string;
  target_role: string;
  difficulty: string;
  current_phase: string;
  question_number: number;
  status: "IN_PROGRESS" | "COMPLETED" | "ERROR";
  current_question?: InterviewQuestionV2 | null;
  created_at: string;
  completed_at?: string | null;
}

export interface TranscriptItemV2 {
  id: string;
  sender: "interviewer" | "candidate";
  senderName: string;
  text: string;
  timestamp: string;
  phase: string;
}
