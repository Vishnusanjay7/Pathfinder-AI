import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileText, AlertCircle, X, History, RefreshCw, Sparkles,
  Briefcase, GraduationCap, Code, CheckCircle2, TrendingUp,
  ShieldCheck, AlertTriangle, User, Mail, Phone, Globe, Award
} from "lucide-react";
import { motion } from "framer-motion";
import { resumeAPI } from "../../api/endpoints";
import type { ActiveResume, ResumeHistoryItem } from "../../types";
import { IMAGES } from "../../config/images";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ScoreRing from "../../components/common/ScoreRing";
import EmptyState from "../../components/common/EmptyState";
import { SkeletonCard } from "../../components/common/Skeleton";

export default function ResumeUploadPage() {
  const [activeResume, setActiveResume] = useState<ActiveResume | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingActive, setIsFetchingActive] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [history, setHistory] = useState<ResumeHistoryItem[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchActiveResume = useCallback(async () => {
    setIsFetchingActive(true);
    try {
      const res = await resumeAPI.getCurrent();
      if (res.data.has_resume && res.data.resume) {
        setActiveResume(res.data.resume);
      } else {
        setActiveResume(null);
        setShowUploader(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingActive(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const historyResponse = await resumeAPI.getHistory();
      setHistory(historyResponse.data.resumes);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchActiveResume();
    fetchHistory();
  }, [fetchActiveResume, fetchHistory]);

  const selectFile = useCallback((selected: File | null) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setError("Only PDF files (.pdf) are allowed.");
      return;
    }
    setError("");
    setFile(selected);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer.files[0] ?? null);
  }, [selectFile]);

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setError("");
    try {
      await resumeAPI.upload(file);
      setShowUploader(false);
      await fetchActiveResume();
      await fetchHistory();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Upload failed. Please check your PDF file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectActiveFromHistory = async (id: number) => {
    try {
      await resumeAPI.setActive(id);
      await fetchActiveResume();
      await fetchHistory();
    } catch (err) {
      console.error("Failed to set active resume", err);
    }
  };

  if (isFetchingActive) {
    return (
      <PageWrapper title="AI Resume Intelligence & ATS Engine" subtitle="Loading active resume details...">
        <div className="p-12 text-center space-y-6">
          <div className="flex justify-center gap-4 flex-wrap">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="flex items-center justify-center gap-3 text-[var(--text-muted)]">
            <RefreshCw className="animate-spin text-indigo-400" size={22} />
            <span className="text-sm font-medium">Analyzing resume data and ATS scoring breakdown...</span>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const qualityVariant = activeResume?.extraction_quality === "high"
    ? "success" as const
    : activeResume?.extraction_quality === "medium"
    ? "warning" as const
    : "danger" as const;

  return (
    <PageWrapper
      title="AI Resume Intelligence & ATS Engine"
      subtitle="Hybrid PDF/OCR extraction, deterministic 8-dimension ATS scoring, skill taxonomy, and AI career guidance."
    >
      {activeResume && !showUploader && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="relative overflow-hidden border-indigo-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-2xl border border-indigo-500/20 shrink-0 glow-sm">
                  <FileText size={36} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="success" size="sm">Active Resume</Badge>
                    {activeResume.extraction_quality && (
                      <Badge variant={qualityVariant} size="sm">
                        <ShieldCheck size={11} className="mr-1" /> Extraction: {activeResume.extraction_quality}
                      </Badge>
                    )}
                    {activeResume.extraction_method && (
                      <span className="px-2.5 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-full text-[11px] font-mono">
                        Engine: {activeResume.extraction_method}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] mt-1.5">{activeResume.filename}</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
                    {activeResume.extraction_quality_detail || "Selectable text extracted and processed via rule-based ATS engine."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 border-t md:border-t-0 border-[var(--border-primary)] pt-4 md:pt-0">
                <ScoreRing score={activeResume.ats_score} size={76} label="ATS Score" />
                <Button variant="secondary" onClick={() => setShowUploader(true)} className="flex items-center gap-2">
                  <RefreshCw size={16} /> Replace Resume
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {(showUploader || !activeResume) && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="max-w-3xl mx-auto">
          <Card className="space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg">
                  <Upload size={18} className="text-indigo-400" />
                </div>
                {activeResume ? "Replace Active Resume" : "Upload Primary Resume"}
              </h2>
              {activeResume && (
                <button onClick={() => setShowUploader(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium transition-colors">
                  Cancel
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 overflow-hidden ${
                isDragging ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]" : "border-[var(--border-primary)] hover:border-[var(--text-muted)] bg-[var(--bg-surface)]"
              }`}
            >
              {isDragging && <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 animate-pulse pointer-events-none" />}
              <div className="relative w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-400 border border-indigo-500/15 rounded-2xl flex items-center justify-center glow-sm">
                <Upload size={28} className={isDragging ? "animate-bounce" : ""} />
              </div>
              <p className="relative text-base font-bold text-[var(--text-primary)] mb-1">Drop PDF resume here</p>
              <p className="relative text-xs text-[var(--text-muted)] mb-4">Selectable PDF or Scanned Document (Max 10MB)</p>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" id="resume-input" onChange={(e) => selectFile(e.target.files?.[0] || null)} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Browse Files</Button>
            </div>

            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{file.name}</span>
                </div>
                <button onClick={() => setFile(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <X size={16} />
                </button>
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/15 rounded-2xl px-4 py-3 text-xs">
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <Button onClick={handleUpload} disabled={!file} isLoading={isLoading} variant="gradient" className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2">
              {isLoading ? "Running Hybrid Extraction & ATS Engine..." : "Analyze & Activate Resume"}
            </Button>
          </Card>
        </motion.div>
      )}

      {activeResume && !showUploader && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeResume.contact_info && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <User size={16} className="text-indigo-400" /> Extracted Candidate Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {activeResume.contact_info.name && (
                      <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                        <User size={14} className="text-indigo-400 shrink-0" />
                        <span className="truncate font-semibold">{activeResume.contact_info.name}</span>
                      </div>
                    )}
                    {activeResume.contact_info.email && (
                      <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                        <Mail size={14} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{activeResume.contact_info.email}</span>
                      </div>
                    )}
                    {activeResume.contact_info.phone && (
                      <div className="flex items-center gap-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                        <Phone size={14} className="text-amber-400 shrink-0" />
                        <span>{activeResume.contact_info.phone}</span>
                      </div>
                    )}
                    {activeResume.contact_info.linkedin && (
                      <a href={activeResume.contact_info.linkedin.startsWith("http") ? activeResume.contact_info.linkedin : `https://${activeResume.contact_info.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sky-400 bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-subtle)] hover:border-sky-500/30 transition-colors">
                        <Globe size={14} className="shrink-0" />
                        <span className="truncate">LinkedIn Profile</span>
                      </a>
                    )}
                    {activeResume.contact_info.github && (
                      <a href={activeResume.contact_info.github.startsWith("http") ? activeResume.contact_info.github : `https://${activeResume.contact_info.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-400 bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-subtle)] hover:border-purple-500/30 transition-colors">
                        <Code size={14} className="shrink-0" />
                        <span className="truncate">GitHub Profile</span>
                      </a>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeResume.analysis?.professional_summary && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-400" /> Executive Professional Summary
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{activeResume.analysis.professional_summary}</p>
                </Card>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Code size={16} className="text-indigo-400" /> Extracted Skills Taxonomy ({activeResume.skills?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(activeResume.skills || []).map((s) => (
                    <span key={s} className="px-3 py-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-300 border border-indigo-500/15 rounded-xl text-xs font-semibold hover:border-indigo-500/30 transition-colors">
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                <Card className="border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-bold text-emerald-400">Resume Strengths</h3>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                    {(activeResume.analysis?.strengths || ["Well-structured sections and clear contact data."]).map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">&#8226;</span><span>{str}</span></li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                <Card className="border-rose-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-rose-500/10 rounded-lg">
                      <AlertTriangle size={16} className="text-rose-400" />
                    </div>
                    <h3 className="text-sm font-bold text-rose-400">Areas for Improvement</h3>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                    {(activeResume.analysis?.weaknesses || ["Include more quantifiable metrics."]).map((weak, idx) => (
                      <li key={idx} className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">&#8226;</span><span>{weak}</span></li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            </div>

            {activeResume.analysis?.action_verb_suggestions && activeResume.analysis.action_verb_suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-amber-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg">
                      <TrendingUp size={16} className="text-amber-400" />
                    </div>
                    <h3 className="text-sm font-bold text-amber-400">Impact & Action Verb Suggestions</h3>
                  </div>
                  <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                    {activeResume.analysis.action_verb_suggestions.map((sug, idx) => (
                      <p key={idx} className="bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-amber-500/15">{sug}</p>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Briefcase size={16} className="text-purple-400" /> Professional Experience Timeline
                </h3>
                {activeResume.experience && activeResume.experience.length > 0 ? (
                  <div className="relative ml-3">
                    <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-purple-500/50 via-indigo-500/30 to-transparent" />
                    <div className="space-y-5">
                      {activeResume.experience.map((exp: any, idx: number) => (
                        <div key={idx} className="relative pl-6">
                          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-[var(--bg-primary)] glow-sm" />
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-[var(--text-primary)]">{exp.position || exp.role || "Position"}</p>
                            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 font-mono">
                              {exp.start_date || ""} {exp.end_date ? `– ${exp.end_date}` : ""}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-purple-300 mt-0.5">{exp.company}</p>
                          {exp.description && <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">No structured experience parsed.</p>
                )}
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <GraduationCap size={16} className="text-emerald-400" /> Academic Credentials
                  </h3>
                  {activeResume.education && activeResume.education.length > 0 ? (
                    <div className="space-y-3">
                      {activeResume.education.map((edu: any, idx: number) => (
                        <div key={idx} className="border-l-2 border-emerald-500/40 pl-3 py-1">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{edu.degree || "Degree"}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{edu.institution} {edu.end_year ? `\u00B7 Class of ${edu.end_year}` : ""}</p>
                          {edu.grade && <p className="text-[10px] text-emerald-400 mt-0.5">Grade/GPA: {edu.grade}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">No structured education parsed.</p>
                  )}
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Award size={16} className="text-amber-400" /> Quantifiable Achievements
                  </h3>
                  {activeResume.achievements && activeResume.achievements.length > 0 ? (
                    <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                      {activeResume.achievements.map((ach, idx) => (
                        <li key={idx} className="border-l-2 border-amber-500/40 pl-3 py-1 text-[11px]">{ach}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">Add metrics (%/numbers) to boost ATS score.</p>
                  )}
                </Card>
              </motion.div>
            </div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-indigo-500/15">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg">
                    <TrendingUp size={14} className="text-indigo-400" />
                  </div>
                  8-Dimension ATS Breakdown
                </h3>
                <div className="space-y-3 text-xs">
                  {Object.entries(activeResume.ats_breakdown || {}).map(([key, val]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[var(--text-muted)] capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="font-bold text-indigo-400">{val}%</span>
                      </div>
                      <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2 overflow-hidden border border-[var(--border-subtle)]">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(val, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {activeResume.ats_simulator && activeResume.ats_simulator.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-indigo-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                      <TrendingUp size={14} className="text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">ATS Improvement Simulator</h3>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mb-3">Estimated score increases based on targeted enhancements:</p>
                  <div className="space-y-2.5">
                    {activeResume.ats_simulator.map((sim, idx) => (
                      <div key={idx} className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-emerald-400">{sim.estimated_increase} Estimated Boost</span>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">{sim.current_score}% &rarr; {sim.estimated_score}%</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">{sim.action}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                    <History size={14} className="text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Resume Version History</h3>
                </div>
                <div className="space-y-2.5">
                  {history.length === 0 ? (
                    <EmptyState
                      image={IMAGES.empty.noData}
                      title="No Resume History"
                      description="Upload your first resume to begin tracking versions and ATS scores."
                    />
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition ${
                          item.id === activeResume.id
                            ? "bg-indigo-500/10 border-indigo-500/30 text-[var(--text-primary)] font-semibold"
                            : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                        }`}
                      >
                        <div className="truncate max-w-[160px]">
                          <p className="truncate font-medium">{item.original_filename}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">ATS: {item.ats_score}%</p>
                        </div>
                        {item.id === activeResume.id ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <button onClick={() => handleSelectActiveFromHistory(item.id)} className="text-xs text-indigo-400 hover:underline font-semibold">
                            Make Active
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
