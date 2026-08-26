import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, AlertCircle, ArrowRight, Eye, Sparkles, BookOpen, BarChart3, ChevronDown, ChevronUp, Target, MessageCircle } from "lucide-react";
import { mockInterviewAPI } from "../../api/endpoints";
import type { MockInterviewReportData } from "../../types";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import ScoreRing from "../../components/common/ScoreRing";
import Button from "../../components/common/Button";

interface QuestionFeedback {
  question_number: number;
  question: string;
  question_type: string;
  transcript: string;
  score: number;
  technical_score: number;
  communication_score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export default function InterviewReportPage() {
  const { id } = useParams<{ id: string }>();
  const interviewId = Number(id);

  const [report, setReport] = useState<MockInterviewReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    mockInterviewAPI.getReport(interviewId)
      .then((res) => {
        if (res.data.success) {
          setReport(res.data.report);
        }
      })
      .catch((err) => {
        console.error("Failed to load report", err);
      })
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) {
    return (
      <PageWrapper title="AI Mock Interview Report" subtitle="Generating candidate evaluation report...">
        <div className="p-12 text-center text-slate-400">Loading interview evaluation metrics...</div>
      </PageWrapper>
    );
  }

  if (!report) {
    return (
      <PageWrapper title="AI Mock Interview Report" subtitle="Report unavailable">
        <Card className="text-center p-8">
          <p className="text-slate-400">Unable to locate report for this interview session.</p>
          <Link to="/mock-interview" className="mt-4 inline-block text-blue-400">
            Return to Mock Interview Setup
          </Link>
        </Card>
      </PageWrapper>
    );
  }

  const breakdown = report.readiness_breakdown || {};
  const questionFeedback: QuestionFeedback[] = (breakdown as any).question_feedback || [];
  const skillGaps: string[] = (breakdown as any).skill_gaps || [];

  const getHiringRecommendation = (score: number) => {
    if (score >= 85) return { label: "Highly Recommended", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" };
    if (score >= 70) return { label: "Recommended with Development", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" };
    if (score >= 55) return { label: "Conditional — Needs Improvement", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" };
    return { label: "Not Ready — Focus on Fundamentals", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" };
  };

  const hiring = getHiringRecommendation(report.overall_score);

  return (
    <PageWrapper
      title="AI Mock Interview Evaluation Report"
      subtitle={`Session #${report.interview_id} · Target Role: ${report.target_role} (${report.interview_type})`}
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Placement Readiness Score Banner */}
        <Card className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-blue-500/30">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <ScoreRing score={report.readiness_score} size={100} label="Placement Readiness" />
              <div>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold uppercase">
                  Placement Readiness Indicator
                </span>
                <h2 className="text-2xl font-black text-white mt-1">Readiness Score: {report.readiness_score}%</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Calculated transparently using your weighted performance across Resume ATS (15%), Adaptive Assessment (20%), Coding (20%), Mock Interview (30%), and Learning Progress (15%).
                </p>
              </div>
            </div>

            <Link to="/learning">
              <Button className="flex items-center gap-2">
                <BookOpen size={16} /> Open Prioritized Learning Plan
              </Button>
            </Link>
          </div>
        </Card>

        {/* Hiring Readiness Indicator */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Target size={28} className={hiring.color} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Hiring Readiness</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${hiring.color} ${hiring.bg} border ${hiring.border}`}>
                {hiring.label}
              </span>
              <p className="text-xs text-slate-400 mt-1.5">
                Based on your overall interview score of {report.overall_score}% across {questionFeedback.length || "all"} questions evaluated.
              </p>
            </div>
          </div>
        </Card>

        {/* Component Scores Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Overall Interview Score</p>
            <p className="text-3xl font-black text-blue-400">{report.overall_score}%</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Technical Accuracy</p>
            <p className="text-3xl font-black text-emerald-400">{report.technical_score}%</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Communication & Fluency</p>
            <p className="text-3xl font-black text-purple-400">{report.communication_score}%</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Observable Framing Score</p>
            <p className="text-3xl font-black text-amber-400">{report.body_language_score}%</p>
          </Card>
        </div>

        {/* Transparent Weights Breakdown */}
        <Card>
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" /> Transparent Readiness Component Weights
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Resume / ATS (15%)</span>
              <b className="text-base text-white">{breakdown.resume_ats_score ?? 75}%</b>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Assessment (20%)</span>
              <b className="text-base text-white">{breakdown.adaptive_assessment_score ?? 70}%</b>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Coding (20%)</span>
              <b className="text-base text-white">{breakdown.coding_score ?? 80}%</b>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Mock Interview (30%)</span>
              <b className="text-base text-white">{breakdown.mock_interview_score ?? report.overall_score}%</b>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Learning Progress (15%)</span>
              <b className="text-base text-white">{breakdown.learning_progress_score ?? 65}%</b>
            </div>
          </div>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-400" /> Candidate Strengths
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {report.strengths.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400" /> Areas for Improvement
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {report.weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Observable Body Language Behavior */}
        <Card>
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Eye size={18} className="text-blue-400" /> Observable Physical Behavior Observations
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Objective physical observation metrics logged during your live camera feed.
          </p>
          <div className="space-y-2 text-sm text-slate-300">
            {report.body_language_observations.map((obs, idx) => (
              <div key={idx} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                {obs}
              </div>
            ))}
          </div>
        </Card>

        {/* Actionable Recommendations */}
        <Card>
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" /> Recommendations & Next Steps
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ArrowRight size={16} className="text-blue-400 mt-0.5 shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </Card>

        {/* Skill Gaps */}
        {skillGaps.length > 0 && (
          <Card>
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400" /> Identified Skill Gaps
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Areas where additional study or practice will have the highest impact on your readiness.
            </p>
            <div className="flex flex-wrap gap-2">
              {skillGaps.map((gap, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold">
                  {gap}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Question-by-Question Feedback */}
        {questionFeedback.length > 0 && (
          <Card>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <MessageCircle size={18} className="text-blue-400" /> Question-by-Question Feedback
            </h3>
            <div className="space-y-3">
              {questionFeedback.map((q, idx) => {
                const isExpanded = expandedQuestion === idx;
                const getScoreColor = (s: number) => s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-red-400";
                return (
                  <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-750 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                          Q{q.question_number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{q.question}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{q.question_type}</p>
                        </div>
                        <span className={`text-lg font-black ${getScoreColor(q.score)} shrink-0 ml-2`}>{q.score}%</span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0 ml-2" /> : <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />}
                    </button>
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-slate-700 space-y-3 mt-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Technical</span>
                            <span className={`text-sm font-bold ${getScoreColor(q.technical_score)}`}>{q.technical_score}%</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Communication</span>
                            <span className={`text-sm font-bold ${getScoreColor(q.communication_score)}`}>{q.communication_score}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Your Answer</p>
                          <p className="text-sm text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-700 italic">"{q.transcript}"</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Evaluator Feedback</p>
                          <p className="text-sm text-slate-300">{q.feedback}</p>
                        </div>
                        {q.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-emerald-400 mb-1">Strengths</p>
                            <ul className="space-y-1">
                              {q.strengths.map((s, si) => (
                                <li key={si} className="text-sm text-slate-300 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {q.weaknesses.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-amber-400 mb-1">Areas to Improve</p>
                            <ul className="space-y-1">
                              {q.weaknesses.map((w, wi) => (
                                <li key={wi} className="text-sm text-slate-300 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                                  {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
