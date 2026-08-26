export interface MetricScoreV2 {
  name: string;
  score: number;
  description: string;
  benchmark: string;
}

export interface TurnEvaluationV2 {
  question_number: number;
  phase: string;
  question_text: string;
  candidate_answer: string;
  technical_accuracy: number;
  communication_clarity: number;
  completeness: number;
  strengths: string[];
  weaknesses: string[];
  suggested_improvement: string;
  overall_turn_score: number;
}

export interface FinalEvaluationReportV2 {
  session_id: string;
  candidate_name: string;
  target_role: string;
  interviewer_name: string;
  interview_type: string;
  difficulty: string;
  total_duration_seconds: number;
  completed_at: string;
  
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  confidence_score: number;
  professionalism_score: number;
  relevance_score: number;
  clarity_score: number;
  
  metrics_breakdown: MetricScoreV2[];
  hiring_recommendation: "Strong Hire" | "Hire" | "Leaning Hire" | "Do Not Hire" | string;
  recommendation_summary: string;
  
  top_strengths: string[];
  areas_for_improvement: string[];
  technical_gaps: string[];
  turn_evaluations: TurnEvaluationV2[];
}
