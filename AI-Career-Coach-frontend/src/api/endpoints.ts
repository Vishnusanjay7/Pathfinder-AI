import apiClient from './axios';
import type {
  RegisterPayload,
  TokenResponse,
  User,
  ResumeUploadResponse,
  ResumeHistoryResponse,
  JobMatchResponse,
  JobRecommendResponse,
  AssessmentResponse,
  CodeSubmissionPayload,
  CodingSubmitResponse,
  CodingHistoryItem,
  SkillsResponse,
  NotificationsResponse,
  LearningOverview,
  AdaptiveAssessmentStartResponse,
  AdaptiveAssessmentEvaluateResponse,
  SkillAssessmentReport,
  ExperienceLevel,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (payload: RegisterPayload) =>
    apiClient.post<{ success: boolean; message: string; channel: 'email' | 'sms' }>(
      '/api/auth/register',
      payload
    ),
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return apiClient.post<TokenResponse>('/api/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  resendRegistrationOTP: (email: string) =>
    apiClient.post<{ success: boolean; message: string; channel: 'email' | 'sms' }>('/api/auth/register/resend', { identifier: email, channel: 'email' }),
  verifyRegistrationOTP: (email: string, code: string) =>
    apiClient.post<TokenResponse>('/api/auth/otp/verify', { identifier: email, channel: 'email', code }),
  requestLoginOTP: (email: string) =>
    apiClient.post<{ success: boolean; message: string; channel: 'email' | 'sms' }>(
      '/api/auth/otp/login/request',
      { email }
    ),
  verifyLoginOTP: (email: string, otp: string) =>
    apiClient.post<TokenResponse>(
      '/api/auth/otp/login/verify',
      { email, otp }
    ),
  // Two-Step Authentication (Password -> OTP -> JWT)
  loginStep1: (username: string, password: string) =>
    apiClient.post<{ success: boolean; message: string; challenge_id: string; masked_identifier: string; channel: string }>(
      '/api/auth/login/step1',
      { username, password }
    ),
  loginStep2: (challenge_id: string, otp: string) =>
    apiClient.post<TokenResponse>(
      '/api/auth/login/step2',
      { challenge_id, otp }
    ),
  loginResend: (challenge_id: string) =>
    apiClient.post<{ success: boolean; message: string; challenge_id: string; masked_identifier: string; channel: string }>(
      '/api/auth/login/resend',
      { challenge_id }
    ),
  // Password Reset Flow
  forgotPassword: (email: string) =>
    apiClient.post<import('../types').ForgotPasswordResponse>('/api/auth/forgot-password', { email }),
  verifyPasswordResetOTP: (email: string, otp: string) =>
    apiClient.post<import('../types').VerifyResetOtpResponse>('/api/auth/forgot-password/verify-otp', { email, otp }),
  resetPassword: (payload: import('../types').ResetPasswordRequest) =>
    apiClient.post<import('../types').ResetPasswordResponse>('/api/auth/reset-password', payload),
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileAPI = {
  getMe: () => apiClient.get<{ success: boolean; user: User }>('/api/profile/me'),
  update: (payload: Partial<Omit<User, 'id' | 'is_verified' | 'profile_image'>>) =>
    apiClient.put<{ success: boolean; message: string; user: User }>(
      '/api/profile/update',
      payload
    ),
};

// ── Resume ────────────────────────────────────────────────────────────────────
export const resumeAPI = {
  getCurrent: () => apiClient.get<import('../types').CurrentResumeResponse>('/api/resume/current'),
  setActive: (resumeId: number) => apiClient.post<{ success: boolean; message: string }>(`/api/resume/select-active/${resumeId}`),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ResumeUploadResponse>('/api/resume/upload', fd);
  },
  getHistory: () => apiClient.get<ResumeHistoryResponse>('/api/resumes/'),
  delete: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/resumes/${id}`),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  match: (file: File | null, jobDescription: string) => {
    const fd = new FormData();
    if (file) fd.append('file', file);
    fd.append('job_description', jobDescription);
    return apiClient.post<JobMatchResponse>('/api/jobs/match', fd);
  },
  recommend: (file?: File | null, mode: 'resume' | 'assessment' = 'resume', assessmentId?: number) => {
    const params = new URLSearchParams();
    if (mode) params.append('mode', mode);
    if (assessmentId) params.append('assessment_id', String(assessmentId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const fd = new FormData();
    if (file) fd.append('file', file);
    return apiClient.post<JobRecommendResponse>(`/api/jobs/recommend${qs}`, fd);
  },
  getApplications: () => apiClient.get<{ success: boolean; applications: import('../types').JobApplication[] }>('/api/jobs/applications'),
  apply: (payload: { job_key: string; job_title: string; company: string; location?: string; status?: import('../types').ApplicationStatus; apply_url?: string; salary_range?: string; deadline?: string }) =>
    apiClient.post<{ success: boolean; message: string; application: import('../types').JobApplication }>('/api/jobs/apply', payload),
  updateStatus: (job_key: string, status: import('../types').ApplicationStatus) =>
    apiClient.post<{ success: boolean; message: string }>('/api/jobs/status', { job_key, status }),
};

// ── Assessment ────────────────────────────────────────────────────────────────
export const assessmentAPI = {
  generate: (resumeText: string, jobDescription: string, difficulty = 'Medium') =>
    apiClient.post<AssessmentResponse>('/api/assessment/generate', {
      resume_text: resumeText,
      job_description: jobDescription,
      difficulty,
    }),
};

// ── Coding ────────────────────────────────────────────────────────────────────
export const codingAPI = {
  run: (payload: CodeSubmissionPayload) =>
    apiClient.post<CodingSubmitResponse>('/api/coding/run', payload),
  submit: (payload: CodeSubmissionPayload) =>
    apiClient.post<CodingSubmitResponse>('/api/coding/submit', payload),
  getHistory: () => apiClient.get<CodingHistoryItem[]>('/api/coding/history'),
  getById: (id: number) => apiClient.get<CodingHistoryItem>(`/api/coding/history/${id}`),
  delete: (id: number) => apiClient.delete<{ success: boolean }>(`/api/coding/history/${id}`),
};

export const skillAssessmentAPI = {
  generate: (payload: { role: string; experience_level: ExperienceLevel; resume_text?: string; ats_score?: number }) =>
    apiClient.post<AdaptiveAssessmentStartResponse>('/api/skill-assessment/generate', payload),
  evaluateMcq: (assessmentId: number, answers: Record<string, string>, timeTakenSeconds: number) =>
    apiClient.post<AdaptiveAssessmentEvaluateResponse>(`/api/skill-assessment/${assessmentId}/evaluate-mcq`, { answers, time_taken_seconds: timeTakenSeconds }),
  report: (assessmentId: number, codingScore: number, codingFeedback: string[]) =>
    apiClient.post<{ success: boolean; report: SkillAssessmentReport }>(`/api/skill-assessment/${assessmentId}/report`, { coding_score: codingScore, coding_feedback: codingFeedback }),
  history: () => apiClient.get<{ success: boolean; assessments: { id: number; role: string; experience_level: string; status: string; score: number | null; created_at: string }[] }>('/api/skill-assessment/history'),
};

// ── Skills ────────────────────────────────────────────────────────────────────
export const skillsAPI = {
  getByUser: (userId: number) => apiClient.get<SkillsResponse>(`/skills/${userId}`),
};

export const notificationsAPI = {
  list: () => apiClient.get<NotificationsResponse>('/api/notifications/'),
  markRead: (id: number) => apiClient.post<{ success: boolean }>(`/api/notifications/${id}/read`),
};

export const learningCenterAPI = {
  overview: () => apiClient.get<LearningOverview>('/api/learning-center/overview'),
  complete: (resource_type: 'course' | 'certification' | 'project' | 'practice' | 'interview', resource_key: string, title: string) => apiClient.post('/api/learning-center/progress', { resource_type, resource_key, title }),
};

// ── Mock Interview ────────────────────────────────────────────────────────────
export const mockInterviewAPI = {
  start: (payload: import('../types').StartInterviewPayload) =>
    apiClient.post<import('../types').MockInterviewSessionResponse>('/api/mock-interview/start', payload),
  get: (interviewId: number) =>
    apiClient.get<import('../types').MockInterviewSessionResponse>(`/api/mock-interview/${interviewId}`),
  getInterview: (interviewId: number) =>
    apiClient.get<import('../types').MockInterviewSessionResponse>(`/api/mock-interview/${interviewId}`),
  answer: (interviewId: number, payload: import('../types').MockAnswerSubmissionPayload) =>
    apiClient.post<import('../types').MockAnswerEvaluationResponse>(`/api/mock-interview/${interviewId}/answer`, payload),
  submitAnswer: (interviewId: number, payload: import('../types').MockAnswerSubmissionPayload) =>
    apiClient.post<import('../types').MockAnswerEvaluationResponse>(`/api/mock-interview/${interviewId}/answer`, payload),
  complete: (interviewId: number) =>
    apiClient.post<import('../types').MockInterviewReportResponse>(`/api/mock-interview/${interviewId}/complete`),
  completeInterview: (interviewId: number) =>
    apiClient.post<import('../types').MockInterviewReportResponse>(`/api/mock-interview/${interviewId}/complete`),
  getReport: (interviewId: number) =>
    apiClient.get<import('../types').MockInterviewReportResponse>(`/api/mock-interview/${interviewId}/report`),
  getHistory: () =>
    apiClient.get<{ success: boolean; history: import('../types').MockInterviewHistoryItem[] }>('/api/mock-interview/history'),
  getRecent: () =>
    apiClient.get<{ success: boolean; history: import('../types').MockInterviewHistoryItem[] }>('/api/mock-interview/history'),
  createVoiceSession: (payload: { room_name?: string; participant_identity?: string; avatar_id?: string }) =>
    apiClient.post<import('../types').LiveKitSessionResponse>('/api/mock-interview/voice/session', payload),
  startAvatar: (interviewId: number, payload?: { avatar_id?: string; custom_greeting?: string }) =>
    apiClient.post<{ success: boolean; conversation_id?: string; status?: string }>(`/api/mock-interview/${interviewId}/avatar/start`, payload),
  stopAvatar: (interviewId: number) =>
    apiClient.post<{ success: boolean; stopped: boolean }>(`/api/mock-interview/${interviewId}/avatar/stop`),
  turn: (interviewId: number, payload: { question_id: number; transcript: string; body_language_observations?: string[]; voice_id?: string }) =>
    apiClient.post<import('../types').ConversationalTurnResponse>(`/api/mock-interview/${interviewId}/turn`, payload),
  synthesizeTTS: (payload: { text: string; voice_id?: string; language?: string; interviewer_id?: string; generate_video?: boolean }) =>
    apiClient.post<{ success: boolean; audio_base64?: string; video_url?: string; video_duration?: number; lip_sync_engine?: string; format?: string; sample_rate?: number }>('/api/mock-interview/tts', payload),
  generateLipsync: (payload: { text?: string; voice_id?: string; interviewer_id?: string; audio_base64?: string }) =>
    apiClient.post<{ success: boolean; videoUrl?: string; duration?: number; processingTimeMs?: number; lipSyncEngine?: string; cached?: boolean; error?: string }>('/api/mock-interview/lipsync', payload),
  queryRAG: (payload: { company_name: string; query: string }) =>
    apiClient.post<{ success: boolean; context: string }>('/api/mock-interview/rag/query', payload),
  delete: (interviewId: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/mock-interview/${interviewId}`),
};

export const interviewAPI = {
  ...mockInterviewAPI,
  generateQuestions: (payload: any) =>
    apiClient.post<{ success: boolean; questions: import('../types').MockQuestion[] }>('/api/interview/questions', payload),
  getQuestions: (payload: any) =>
    apiClient.post<{ success: boolean; questions: import('../types').MockQuestion[] }>('/api/interview/questions', payload),
};

// ── Company Preparation ───────────────────────────────────────────────────────
export const companyPrepAPI = {
  analyze: (payload: {
    job_key: string;
    company: string;
    job_title: string;
    job_description?: string;
    location?: string;
    salary_range?: string;
    apply_url?: string;
    duration_days?: number;
  }) => apiClient.post<{ success: boolean; preparation: any }>('/api/company-preparation/analyze', payload),
  get: (prepId: number) => apiClient.get<{ success: boolean; preparation: any }>(`/api/company-preparation/${prepId}`),
  updateProgress: (prepId: number, completed_tasks: string[]) =>
    apiClient.post<{ success: boolean; progress_percentage: number; completed_tasks: string[] }>(`/api/company-preparation/${prepId}/progress`, { completed_tasks }),
  getHistory: () => apiClient.get<{ success: boolean; preparations: any[] }>('/api/company-preparation/history'),
};

