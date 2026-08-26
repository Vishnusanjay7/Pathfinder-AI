import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Download,
  RotateCcw,
  ArrowLeft,
  Briefcase,
  User,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { mockInterviewV2API } from "../api/endpoints";
import type { FinalEvaluationReportV2 } from "../types/evaluation";

export const InterviewReportPageV2: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<FinalEvaluationReportV2 | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!sessionId) return;
    mockInterviewV2API
      .getReport(sessionId)
      .then((res) => {
        if (res.data?.report) {
          setReport(res.data.report);
        }
      })
      .catch((err) => {
        console.warn("[Report-v2] Error fetching report:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [sessionId]);

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview_report_${report.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030814] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Generating Comprehensive Evaluation Report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#030814] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle size={40} className="text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Interview Report Not Found</h2>
          <p className="text-xs text-slate-400">The evaluation for this interview session is not available or has expired.</p>
          <button
            onClick={() => navigate("/mock-interview-v2")}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Back to Mock Interview
          </button>
        </div>
      </div>
    );
  }

  const getRecommendationBadge = (rec: string) => {
    if (rec.toLowerCase().includes("strong")) {
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
    if (rec.toLowerCase().includes("hire")) {
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    }
    return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  };

  return (
    <div className="min-h-screen bg-[#030814] text-white p-6 sm:p-10 text-left">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/mock-interview-v2")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Interview Hub
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Print / Save PDF
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download size={13} /> Export JSON
            </button>
          </div>
        </div>

        {/* Header Summary Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#071329] via-[#0A1E40] to-[#081226] border border-[#1A2E50] p-8 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles size={12} /> Candidate Performance Assessment
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {report.target_role} Interview Report
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-blue-400" /> Interviewer: {report.interviewer_name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase size={13} className="text-purple-400" /> Difficulty: {report.difficulty}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-400" /> Date: {new Date(report.completed_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Score Pill */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#060D1A]/80 border border-[#162742] text-center">
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                {report.overall_score}%
              </span>
              <span className="text-xs font-semibold text-slate-400 mt-1">Overall Assessment Score</span>
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRecommendationBadge(report.hiring_recommendation)}`}>
                  {report.hiring_recommendation}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Core Recruitment Metrics Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award size={18} className="text-blue-400" /> 8-Dimension Recruitment Competency Breakdown
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.metrics_breakdown.map((m) => (
              <div
                key={m.name}
                className="p-5 rounded-2xl bg-[#070F1E] border border-[#14233D] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200">{m.name}</span>
                    <span className="text-sm font-black text-blue-400">{m.score}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{m.description}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[10px] text-slate-500 font-medium">
                  Benchmark: {m.benchmark}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Improvement Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Strengths */}
          <div className="p-6 rounded-2xl bg-[#07131F] border border-emerald-900/30 space-y-4">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> Key Strengths Observed
            </h4>
            <ul className="space-y-2.5">
              {report.top_strengths.map((s, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Improvement */}
          <div className="p-6 rounded-2xl bg-[#140F1F] border border-purple-900/30 space-y-4">
            <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <TrendingUp size={16} /> Areas for Growth & Preparation
            </h4>
            <ul className="space-y-2.5">
              {report.areas_for_improvement.map((imp, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Question-by-Question Detailed Analysis */}
        {report.turn_evaluations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" /> Turn-by-Turn Response Analysis
            </h3>

            <div className="space-y-4">
              {report.turn_evaluations.map((turn) => (
                <div
                  key={turn.question_number}
                  className="p-5 rounded-2xl bg-[#070F1E] border border-[#162742] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Question {turn.question_number} &bull; Phase: {turn.phase}
                    </span>
                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Score: {turn.overall_turn_score}%
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white">Q: "{turn.question_text}"</p>
                  <div className="p-3 bg-[#050B14] rounded-xl border border-slate-800 text-xs text-slate-300 italic">
                    A: "{turn.candidate_answer}"
                  </div>

                  <div className="pt-2 text-xs text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-300">Feedback:</span> {turn.suggested_improvement}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="pt-4 flex justify-center">
          <button
            onClick={() => navigate("/mock-interview-v2")}
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-xl shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw size={14} /> Start Another Mock Interview
          </button>
        </div>
      </div>
    </div>
  );
};
