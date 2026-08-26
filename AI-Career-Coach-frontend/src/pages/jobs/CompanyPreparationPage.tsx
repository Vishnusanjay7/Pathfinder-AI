import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Building2, MapPin, ExternalLink, ArrowLeft, Sparkles, CheckCircle2,
  AlertCircle, Clock, Code, Video, BookOpen, Target, ChevronDown, ChevronUp,
  CheckSquare, Square, Award
} from "lucide-react";
import { companyPrepAPI, mockInterviewAPI } from "../../api/endpoints";
import { IMAGES } from "../../config/images";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ScoreRing from "../../components/common/ScoreRing";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import EmptyState from "../../components/common/EmptyState";

type TabType = "overview" | "gaps" | "technical" | "coding" | "hr" | "roadmap" | "interview";

export default function CompanyPreparationPage() {
  const { prepId } = useParams<{ prepId: string }>();
  const navigate = useNavigate();
  const [prep, setPrep] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [updatingProgress, setUpdatingProgress] = useState<boolean>(false);
  const [expandedTech, setExpandedTech] = useState<Record<number, boolean>>({});
  const [recalculatingDuration, setRecalculatingDuration] = useState<boolean>(false);

  const handleRegenerateDuration = async (days: number) => {
    if (!prep) return;
    setRecalculatingDuration(true);
    try {
      const res = await companyPrepAPI.analyze({
        job_key: prep.job_key, company: prep.company, job_title: prep.job_title,
        job_description: prep.job_description, location: prep.location,
        salary_range: prep.salary_range, apply_url: prep.apply_url, duration_days: days
      });
      setPrep(res.data.preparation);
      setCompletedTasks(res.data.preparation.completed_tasks || []);
      toast.success(`Preparation roadmap recalculated for ${days} days!`);
    } catch { toast.error("Failed to update roadmap duration."); } finally { setRecalculatingDuration(false); }
  };

  const fetchPrep = useCallback(async () => {
    if (!prepId) return;
    setLoading(true);
    try {
      const res = await companyPrepAPI.get(parseInt(prepId));
      setPrep(res.data.preparation);
      setCompletedTasks(res.data.preparation.completed_tasks || []);
    } catch { toast.error("Failed to load company preparation plan."); } finally { setLoading(false); }
  }, [prepId]);

  useEffect(() => { fetchPrep(); }, [fetchPrep]);

  const handleToggleTask = async (taskTitle: string) => {
    if (!prep) return;
    const nextCompleted = completedTasks.includes(taskTitle) ? completedTasks.filter((t) => t !== taskTitle) : [...completedTasks, taskTitle];
    setCompletedTasks(nextCompleted);
    setUpdatingProgress(true);
    try {
      const res = await companyPrepAPI.updateProgress(prep.id, nextCompleted);
      setPrep((prev: any) => ({ ...prev, progress_percentage: res.data.progress_percentage, completed_tasks: res.data.completed_tasks }));
    } catch { toast.error("Failed to update progress."); } finally { setUpdatingProgress(false); }
  };

  const handleStartMockInterview = () => {
    if (!prep) return;
    toast.success(`Loading Mock Interview for ${prep.job_title} at ${prep.company}...`);
    navigate(
      `/mock-interview?role=${encodeURIComponent(prep.job_title)}&company=${encodeURIComponent(prep.company)}&job_key=${encodeURIComponent(prep.job_key || "")}`,
      {
        state: {
          targetRole: prep.job_title,
          company: prep.company,
          job_description: prep.job_description,
          required_skills: prep.missing_skills || [],
          prep_id: prep.id,
        },
      }
    );
  };

  if (loading) {
    return (
      <PageWrapper title="Company-Specific Job Preparation" subtitle="Personalized career roadmap & skill gap analysis">
        <div className="space-y-4">
          <div className="shimmer rounded-2xl h-48" />
          <div className="shimmer rounded-2xl h-12" />
          <div className="grid grid-cols-2 gap-4"><div className="shimmer rounded-2xl h-64" /><div className="shimmer rounded-2xl h-64" /></div>
        </div>
      </PageWrapper>
    );
  }

  if (!prep) {
    return (
      <PageWrapper title="Company-Specific Job Preparation" subtitle="Personalized career roadmap & skill gap analysis">
        <EmptyState
          icon={<AlertCircle size={40} className="text-amber-400" />}
          title="Preparation Session Not Found"
          description="This preparation plan could not be loaded. Please try again."
          action={<Link to="/jobs" className="text-xs text-blue-400 hover:underline font-bold">Back to Job Recommendations</Link>}
        />
      </PageWrapper>
    );
  }

  const breakdown = prep.score_breakdown || {};
  const totalRoadmapTasks = (prep.roadmap || []).reduce((acc: number, day: any) => acc + (day.tasks?.length || 0), 0);

  return (
    <PageWrapper title={`Company Preparation: ${prep.company}`} subtitle={`Target Role: ${prep.job_title} \u00B7 Readiness Score: ${prep.readiness_score}%`}>
      <div className="space-y-6 max-w-6xl mx-auto">
        <button onClick={() => navigate("/jobs")} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 font-semibold transition-colors">
          <ArrowLeft size={14} /> Back to Job Recommendations
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0">
              <img src={IMAGES.company.tech} alt="" className="w-full h-full object-cover opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-card)] via-[var(--bg-card)]/95 to-[var(--bg-card)]/80" />
            </div>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="info" size="sm">Target Company Preparation</Badge>
                  <Badge variant="success" size="sm">{prep.readiness_level} Candidate</Badge>
                </div>
                <h1 className="text-2xl font-black text-[var(--text-primary)]">{prep.job_title}</h1>
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                  <Building2 size={14} className="text-blue-400" /> <span className="font-bold text-[var(--text-primary)]">{prep.company}</span>
                  {prep.location && <span className="text-[var(--text-muted)] flex items-center gap-1"><MapPin size={12} /> {prep.location}</span>}
                </p>
                {prep.apply_url && (
                  <a href={prep.apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline font-bold pt-1">
                    View Official Application Link <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-6 bg-[var(--bg-elevated)]/80 p-5 rounded-2xl border border-[var(--border-subtle)] shrink-0 glass">
                <ScoreRing score={prep.readiness_score} size={85} label="Job Readiness" />
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-semibold">Prep Plan Progress:</span>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5"><AnimatedCounter value={prep.progress_percentage} suffix="%" /></p>
                    <p className="text-[11px] text-[var(--text-muted)]">{completedTasks.length} of {totalRoadmapTasks} tasks completed</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="flex gap-2 p-1 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-x-auto scrollbar-hide">
          {([
            { id: "overview", label: "Overview", icon: Target },
            { id: "gaps", label: "Skill Gaps", icon: AlertCircle },
            { id: "technical", label: "Technical Questions", icon: Sparkles },
            { id: "coding", label: "Coding Practice", icon: Code },
            { id: "hr", label: "Behavioral Questions", icon: Award },
            { id: "roadmap", label: "Learning Roadmap", icon: BookOpen },
            { id: "interview", label: "Mock Interview", icon: Video }
          ] as const).map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"}`}>
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <Card className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-3 flex items-center gap-2">
                  <Target size={16} className="text-blue-400" /> Transparent Readiness Component Weights
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: "Resume Skill Match (40%)", value: breakdown.resume_match || 80, color: "text-blue-400" },
                    { label: "Assessment Score (20%)", value: breakdown.assessment_score || 75, color: "text-emerald-400" },
                    { label: "Coding Score (20%)", value: breakdown.coding_score || 75, color: "text-cyan-400" },
                    { label: "Mock Interview (20%)", value: breakdown.interview_score || 75, color: "text-purple-400" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
                      <span className="text-[var(--text-muted)] font-semibold">{item.label}</span>
                      <p className={`text-lg font-bold mt-1 ${item.color}`}>{item.value}%</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-3">Matched Skills vs Gaps</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><CheckCircle2 size={14} /> Strong Matched Skills ({prep.matched_skills?.length || 0}):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(prep.matched_skills || []).map((s: string) => (
                        <span key={s} className="px-2.5 py-1 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400 border border-emerald-500/15 rounded-lg font-semibold">&#10003; {s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-amber-400 mb-1.5 flex items-center gap-1"><AlertCircle size={14} /> Critical Skill Gaps to Improve ({prep.missing_skills?.length || 0}):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(prep.missing_skills || []).map((s: string) => (
                        <span key={s} className="px-2.5 py-1 bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-400 border border-amber-500/15 rounded-lg font-medium">&#9888; {s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <Card className="space-y-4 border-blue-500/20">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> Start Preparation Actions</h3>
                <div className="space-y-2 text-xs">
                  <button onClick={() => setActiveTab("roadmap")} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/25">
                    View Day-by-Day Roadmap <BookOpen size={14} />
                  </button>
                  <button onClick={handleStartMockInterview} className="w-full py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-purple-400 border border-purple-500/20 font-bold rounded-xl flex items-center justify-center gap-2 transition">
                    Start Job-Specific Mock Interview <Video size={14} />
                  </button>
                  <Link to="/assessment" className="w-full py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-cyan-400 border border-cyan-500/20 font-bold rounded-xl flex items-center justify-center gap-2 transition">
                    Practice Coding Problems <Code size={14} />
                  </Link>
                </div>
              </Card>

              <Card className="space-y-2">
                <h3 className="text-xs font-bold text-[var(--text-secondary)]">Job Description Summary</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-mono bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] max-h-48 overflow-y-auto">
                  {prep.job_description || "No full job description provided."}
                </p>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "gaps" && (
          <div className="space-y-4">
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><AlertCircle size={16} className="text-amber-400" /> In-Depth Skill Gap & Recommended Resources</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {(prep.missing_skills || []).map((skill: string) => (
                  <motion.div key={skill} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] space-y-2 text-xs hover:border-amber-500/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 uppercase tracking-wider">{skill}</span>
                      <Badge variant="warning" size="sm">Missing Skill</Badge>
                    </div>
                    <p className="text-[var(--text-muted)]">Required for {prep.job_title} at {prep.company}. Study fundamentals before applying.</p>
                    <a href={`https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(skill)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:underline font-semibold text-[11px] pt-1">
                      Official Docs & Learning Resource <ExternalLink size={11} />
                    </a>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "technical" && (
          <div className="space-y-4">
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> AI-Generated Technical Questions for {prep.job_title}</h3>
              <div className="space-y-3">
                {(prep.technical_questions || []).map((tq: any, idx: number) => (
                  <div key={idx} className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] space-y-2 text-xs">
                    <div onClick={() => setExpandedTech((prev) => ({ ...prev, [idx]: !prev[idx] }))} className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-[var(--text-primary)]">Q{idx + 1}. {tq.question}</span>
                      {expandedTech[idx] ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                    </div>
                    {expandedTech[idx] && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2 text-[var(--text-secondary)] border-t border-[var(--border-primary)] space-y-1">
                        <p className="font-semibold text-emerald-400">Suggested Answer Framework:</p>
                        <p className="text-[var(--text-muted)] leading-relaxed font-mono bg-[var(--bg-surface)] p-3 rounded-xl">{tq.suggested_answer}</p>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "coding" && (
          <div className="space-y-4">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Code size={16} className="text-cyan-400" /> Recommended Algorithmic Problems</h3>
                <Link to="/assessment" className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/25">Open Coding IDE <ArrowLeft size={12} className="rotate-180 inline" /></Link>
              </div>
              <div className="space-y-3">
                {(prep.coding_recommendations || []).map((cq: any, idx: number) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between gap-4 text-xs hover:border-cyan-500/20 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">{cq.title}</span>
                        <Badge variant={cq.difficulty === "Hard" ? "danger" : cq.difficulty === "Medium" ? "warning" : "success"} size="sm">{cq.difficulty}</Badge>
                      </div>
                      <p className="text-[var(--text-muted)] mt-1">Topic: {cq.topic} &#183; {cq.reason}</p>
                    </div>
                    <Link to="/assessment" className="px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-cyan-400 border border-cyan-500/20 rounded-xl font-bold transition">Practice</Link>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "hr" && (
          <div className="space-y-4">
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Award size={16} className="text-purple-400" /> Behavioral & Resume-Project Questions</h3>
              <div className="space-y-3">
                {(prep.behavioral_questions || []).map((bq: any, idx: number) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] space-y-1.5 text-xs">
                    <p className="font-bold text-[var(--text-primary)]">Q{idx + 1}. {bq.question}</p>
                    <p className="text-[var(--text-muted)]">Context: {bq.context}</p>
                    <p className="text-purple-400 font-semibold">Tip: {bq.tip}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "roadmap" && (
          <div className="space-y-4">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><BookOpen size={16} className="text-blue-400" /> Day-by-Day Preparation Plan</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)] font-semibold">Plan Duration:</span>
                  {[7, 14, 30].map((days) => (
                    <button key={days} disabled={recalculatingDuration} onClick={() => handleRegenerateDuration(days)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${(prep.roadmap?.length || 7) === days ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500 text-white shadow-sm" : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                      {days} Days
                    </button>
                  ))}
                  <span className="text-xs font-bold text-emerald-400 ml-2">Progress: {prep.progress_percentage}% Completed</span>
                </div>
              </div>

              <div className="space-y-4">
                {(prep.roadmap || []).map((day: any) => (
                  <motion.div key={day.day} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="relative p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] space-y-2 text-xs">
                    <span className="font-black text-blue-400 uppercase tracking-wider">Day {day.day}: {day.topic}</span>
                    <div className="space-y-1.5 pt-1">
                      {(day.tasks || []).map((task: string, tIdx: number) => {
                        const isDone = completedTasks.includes(task);
                        return (
                          <div key={tIdx} onClick={() => handleToggleTask(task)} className="flex items-center gap-2.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            {isDone ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} className="text-[var(--text-muted)]" />}
                            <span className={isDone ? "line-through text-[var(--text-muted)] font-medium" : "font-medium"}>{task}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "interview" && (
          <div className="space-y-4">
            <Card className="p-8 text-center space-y-4 max-w-xl mx-auto border-purple-500/20">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/15 to-indigo-500/10 rounded-2xl flex items-center justify-center border border-purple-500/15 glow-sm">
                <Video size={32} className="text-purple-400 animate-pulse" />
              </div>
              <h2 className="text-xl font-black text-[var(--text-primary)]">Job-Specific AI Mock Interview</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Launch a 100vw/100vh full-screen video interview session preloaded with <strong className="text-[var(--text-secondary)]">{prep.job_title} at {prep.company}</strong> requirements, skills, and resume context.
              </p>
              <Button onClick={handleStartMockInterview} variant="gradient" className="px-6 py-3 font-bold text-xs">
                Start Job-Specific Mock Interview <Video size={16} />
              </Button>
            </Card>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}