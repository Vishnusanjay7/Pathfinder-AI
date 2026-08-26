// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  college: string | null;
  degree: string | null;
  branch: string | null;
  graduation_year: number | null;
  profile_image: string | null;
  is_verified: boolean;
}

export interface TokenResponse {
  success: boolean;
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  college?: string;
  degree?: string;
  branch?: string;
  graduation_year?: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyResetOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  success: boolean;
  reset_token: string;
}

export interface ResetPasswordRequest {
  reset_token: string;
  new_password: string;
  confirm_password?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ── Resume ────────────────────────────────────────────────────────────────────
export interface ATSSimulationItem {
  action: string;
  current_score: number;
  estimated_score: number;
  estimated_increase: string;
}

export interface ATSResult {
  ats_score: number;
  score_breakdown: Record<string, number>;
  weak_phrases_found?: string[];
  action_verb_suggestions?: string[];
  ats_simulator?: ATSSimulationItem[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study?: string;
  start_year?: number | null;
  end_year?: number | null;
  grade?: string;
}

export interface ExperienceItem {
  company: string;
  position: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

export interface ProjectItem {
  title: string;
  description?: string;
  technologies?: string;
  github_url?: string;
}

export interface CertificationItem {
  name: string;
  provider?: string;
  issue_date?: string;
  credential_url?: string;
}

export interface LanguageItem {
  language: string;
  proficiency?: string;
}

export interface ContactInfo {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
}

export interface ResumeAnalysis {
  professional_summary: string;
  technical_skills: string[];
  soft_skills: string[];
  categorized_skills?: Record<string, string[]>;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  achievements?: string[];
  languages: LanguageItem[];
  missing_skills: string[];
  strengths: string[];
  weaknesses: string[];
  suggested_improvements: string[];
  action_verb_suggestions?: string[];
  recommended_jobs: string[];
  interview_questions: string[];
}

export interface ResumeUploadResponse {
  success: boolean;
  message: string;
  extraction_method?: string;
  extraction_quality?: string;
  extraction_quality_detail?: string;
  contact_info?: ContactInfo;
  ats: ATSResult;
  analysis: ResumeAnalysis;
}

export interface ResumeHistoryItem {
  id: number;
  user_id: number;
  original_filename: string;
  stored_filename: string;
  ats_score: number;
  upload_date: string;
}

export interface ResumeHistoryResponse {
  success: boolean;
  count: number;
  resumes: ResumeHistoryItem[];
}

export interface ActiveResume {
  id: number;
  user_id: number;
  filename: string;
  stored_filename: string;
  uploaded_at: string | null;
  is_active: boolean;
  ats_score: number;
  ats_breakdown: Record<string, number>;
  ats_simulator?: ATSSimulationItem[];
  extraction_method?: string;
  extraction_quality?: string;
  extraction_quality_detail?: string;
  contact_info?: ContactInfo;
  analysis: ResumeAnalysis;
  skills: string[];
  categorized_skills?: Record<string, string[]>;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  achievements?: string[];
  raw_text: string;
}

export interface CurrentResumeResponse {
  success: boolean;
  has_resume: boolean;
  resume: ActiveResume | null;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export type ApplicationStatus = 'Recommended' | 'Saved' | 'Applied' | 'Interview' | 'Rejected' | 'Offer' | 'Closed';

export interface JobApplication {
  id: number;
  job_key: string;
  job_title: string;
  company: string;
  location: string | null;
  status: ApplicationStatus;
  application_date: string | null;
  deadline: string | null;
  apply_url: string | null;
  salary_range: string | null;
  created_at: string;
}

export interface JobMatchResult {
  ats_score: number;
  job_match: number;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  keyword_match_pct?: number;
  skill_match_pct?: number;
  experience_match_pct?: number;
  education_match_pct?: number;
  project_match_pct?: number;
  role_match_pct?: number;
  missing_keywords?: string[];
  recommended_keywords?: string[];
  weak_sections?: string[];
  formatting_problems?: string[];
  action_verb_suggestions?: string[];
  achievement_improvement_suggestions?: string[];
}

export interface JobMatchResponse {
  success: boolean;
  message: string;
  result: JobMatchResult;
}

export interface JobRecommendation {
  job_key?: string;
  job_title: string;
  company: string;
  salary_range: string;
  experience: string;
  companies: string[];
  location: string;
  employment_type: string;
  description?: string | null;
  skills: string[];
  apply_url: string | null;       // Direct employer application URL
  job_url?: string | null;        // Job listing / redirect URL (e.g. Adzuna redirect_url)
  company_logo: string | null;
  source: string;                 // 'adzuna' | 'jsearch' | 'local'
  provider_job_id?: string;
  posted_date?: string | null;
  category?: string;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  status?: ApplicationStatus;
  application_date?: string | null;
  deadline?: string | null;
}

export interface JobRecommendResponse {
  success: boolean;
  message: string;
  recommendations: JobRecommendation[];
}

// ── Assessment ────────────────────────────────────────────────────────────────
export interface MCQQuestion {
  question: string;
  options: string[];
  answer: string;
  difficulty: string;
}

export interface AssessmentCodingQuestion {
  title: string;
  description: string;
  difficulty: string;
  language: string;
  constraints: string[];
  sample_input: string;
  sample_output: string;
}

export interface AptitudeQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface HRQuestion {
  question: string;
}

export interface AssessmentData {
  technical_mcq: MCQQuestion[];
  coding_questions: AssessmentCodingQuestion[];
  aptitude_questions: AptitudeQuestion[];
  hr_questions: HRQuestion[];
}

export interface AssessmentResponse {
  success: boolean;
  message: string;
  data: AssessmentData;
}

// ── Coding ────────────────────────────────────────────────────────────────────
export interface CodeSubmissionPayload {
  assessment_id: number;
  question_id: number;
  language: string;
  source_code: string;
}

export interface AICodeReview {
  correctness: number;
  readability: number;
  best_practices: number;
  optimization: number;
  time_complexity: string;
  space_complexity: string;
  strengths: string[];
  weaknesses: string[];
  optimization_suggestions: string[];
  feedback: string[];
  overall_score: number;
}

export interface CodingSubmitResponse {
  score: number;
  passed: number;
  failed: number;
  total_test_cases: number;
  average_execution_time: number;
  maximum_memory: number;
  ai_review: AICodeReview;
  results: {
    is_public: boolean;
    passed: boolean;
    status: string;
    execution_time: number;
    memory: number;
    input?: string;
    expected_output?: string;
    actual_output?: string;
  }[];
}

export interface CodingHistoryItem {
  id: number;
  user_id: number;
  assessment_id: number;
  question_id: number;
  language: string;
  source_code: string;
  score: number;
  passed: number;
  failed: number;
  execution_time: number;
  memory: number;
  ai_review: AICodeReview | null;
  created_at: string;
}

// ── AI Skill Assessment ───────────────────────────────────────────────────
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface AdaptiveMCQQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  difficulty: string;
}

export interface AdaptiveCodingQuestion {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  language: string;
  topic: string;
  tags: string[];
  constraints: string[];
  input_format: string;
  output_format: string;
  sample_input: string;
  sample_output: string;
  explanation: string;
  expected_time_complexity: string;
  expected_space_complexity: string;
  time_limit: number;
  memory_limit: number;
  visible_test_cases: { input: string; output: string }[];
}

export interface MCQResult {
  correct_answers: number;
  wrong_answers: number;
  total_questions: number;
  percentage: number;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  strong_topics: string[];
  weak_topics: string[];
}

export interface AdaptiveAssessmentStartResponse {
  success: boolean;
  assessment_id: number;
  legacy_assessment_id: number;
  role: string;
  skills: string[];
  questions: AdaptiveMCQQuestion[];
}

export interface AdaptiveAssessmentEvaluateResponse {
  success: boolean;
  mcq_result: MCQResult;
  coding_question: AdaptiveCodingQuestion;
  coding_questions?: AdaptiveCodingQuestion[];
}

export interface SkillAssessmentReport {
  overall_career_score: number;
  interview_readiness: string;
  confidence_score: number;
  skill_analysis: { strong_areas: string[]; good_areas: string[]; weak_areas: string[]; critical_weak_areas: string[]; missing_skills: string[]; knowledge_gaps: string[]; ratings: Record<string, string> };
  feedback: string;
  learning_roadmap: { period: string; goal: string; tasks: string[] }[];
  courses: { title: string; provider: string; description: string; difficulty: string; duration: string; rating: string; pricing: string; url: string }[];
  certifications: { title: string; url: string; difficulty: string; benefit: string }[];
  projects: { title: string; difficulty: string; estimated_time: string; technologies: string[]; github_resource: string }[];
  practice_platforms: { name: string; url: string }[];
  interview_preparation: { technical_questions: string[]; coding_questions: string[]; behavioral_questions: string[]; mock_interview_plan: string };
}

// ── Skills ────────────────────────────────────────────────────────────────────
export interface Skill {
  id: number;
  user_id: number;
  name: string;
  category: string | null;
  proficiency: string;
  created_at: string;
}

export interface SkillsResponse {
  success: boolean;
  skills: Skill[];
}

export interface AppNotification {
  id: number;
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: AppNotification[];
  unread_count: number;
}

export interface LearningProgress { id: number; resource_type: string; resource_key: string; title: string; status: string; completed_at: string; }
export interface LearningOverview { success: boolean; report: SkillAssessmentReport | null; progress: LearningProgress[]; charts: { weekly: { label: string; completed: number }[]; monthly: { label: string; completed: number }[] }; }

// ── Mock Interview ────────────────────────────────────────────────────────────
export type InterviewType = 'HR' | 'Technical' | 'Behavioral' | 'Mixed';

export interface StartInterviewPayload {
  target_role: string;
  interview_type: InterviewType;
  difficulty: ExperienceLevel;
  question_count: number;
  avatar_id?: string;
  voice_id?: string;
  language?: string;
  company?: string;
  job_description?: string;
  required_skills?: string[];
}

export interface MockQuestion {
  id: number;
  question_number: number;
  question: string;
  question_type: string;
  difficulty: string;
  topic?: string;
}

export interface MockInterviewSessionResponse {
  success: boolean;
  interview_id: number;
  target_role: string;
  interview_type: string;
  difficulty: string;
  question_count: number;
  avatar_id?: string;
  voice_id?: string;
  language?: string;
  questions: MockQuestion[];
}

export interface MockAnswerSubmissionPayload {
  question_id: number;
  transcript: string;
  body_language_observations?: string[];
}

export interface MockAnswerEvaluationResponse {
  success: boolean;
  answer_id: number;
  answer_score: number;
  technical_score: number;
  communication_score: number;
  grammar_score: number;
  fluency_score: number;
  clarity_score: number;
  relevance_score: number;
  feedback: {
    strengths?: string[];
    weaknesses?: string[];
    missing_concepts?: string[];
    comment?: string;
    body_language?: string[];
  };
}

export interface ReadinessBreakdown {
  resume_ats_score: number;
  adaptive_assessment_score: number;
  coding_score: number;
  mock_interview_score: number;
  learning_progress_score: number;
  weights: Record<string, string>;
}

export interface MockInterviewReportData {
  interview_id: number;
  target_role: string;
  interview_type: string;
  difficulty: string;
  technical_score: number;
  communication_score: number;
  english_score: number;
  body_language_score: number;
  overall_score: number;
  readiness_score: number;
  readiness_breakdown: ReadinessBreakdown;
  strengths: string[];
  weaknesses: string[];
  body_language_observations: string[];
  recommendations: string[];
  created_at: string;
}

export interface MockInterviewReportResponse {
  success: boolean;
  report: MockInterviewReportData;
}

export interface LiveKitSessionResponse {
  success: boolean;
  server_url: string;
  token: string;
  room_name: string;
  participant_identity: string;
  provider: string;
  avatar_session?: {
    success: boolean;
    provider?: string;
    conversation_id?: string;
    room_name?: string;
    avatar_participant_identity?: string;
    avatar_participant_name?: string;
    persona?: any;
    status?: string;
    error?: string;
  };
}

export interface ConversationalTurnResponse {
  success: boolean;
  question_id: number;
  recorded_transcript: string;
  next_question_id: number | null;
  next_question_text: string | null;
  is_final_question: boolean;
  rag_context?: string | null;
  tts?: {
    audio_base64?: string;
    format?: string;
    sample_rate?: number;
    duration_estimate_sec?: number;
  };
}

export interface MockInterviewHistoryItem {
  id: number;
  target_role: string;
  interview_type: string;
  difficulty: string;
  question_count: number;
  status: string;
  overall_score: number | null;
  started_at: string;
  completed_at: string | null;
}


