import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Building2, MapPin, ExternalLink, FileText, CheckCircle2,
  Bookmark, ArrowRight, Sparkles, Filter, DollarSign, Search, RotateCcw,
  AlertCircle, TrendingUp, SlidersHorizontal, Check, X, AlertTriangle,
  Award, Clock, Compass, ShieldCheck, ChevronRight, XCircle, ArrowLeft
} from "lucide-react";
import { jobsAPI, resumeAPI } from "../../api/endpoints";
import type {
  ActiveResume, JobApplication, JobMatchResponse, JobRecommendation,
  ApplicationStatus, SkillEvidenceItem, AssessmentValidationItem
} from "../../types";
import { IMAGES } from "../../config/images";
import PageWrapper from "../../components/layout/PageWrapper";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import EmptyState from "../../components/common/EmptyState";
import { SkeletonCard } from "../../components/common/Skeleton";

const isValidApplyUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (!parsed.hostname || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return false;
    const lower = trimmed.toLowerCase();
    if (["javascript:", "data:", "file:", "vbscript:"].some((u) => lower.includes(u))) return false;
    return true;
  } catch { return false; }
};

const SAMPLE_JD = `Role: Senior Full Stack Developer (React & Python/FastAPI)
Company: TechCorp Innovations
Location: Bengaluru, India / Remote
Salary: ₹18,00,000 - ₹28,00,000 P.A.

Requirements:
- 3+ years of experience building modern web applications.
- Strong proficiency in React, TypeScript, Tailwind CSS, and state management.
- Solid backend expertise in Python, FastAPI, PostgreSQL, and RESTful APIs.
- Experience with Docker, CI/CD pipelines, Git, and AWS cloud deployment.
- Passion for clean code, automated testing, and scalable architecture.`;

export default function JobsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Resume State
  const [activeResume, setActiveResume] = useState<ActiveResume | null>(null);
  const [hasResume, setHasResume] = useState<boolean>(true);
  const [loadingResume, setLoadingResume] = useState<boolean>(true);

  // Tab & Flow Modes
  // 'gateway' = 2-Option Entry Gateway
  // 'recommendations' = Shared Recommended Jobs list (>= 60% match)
  // 'matcher' = Job Description Matcher tool
  // 'tracker' = Applications Tracker
  const [activeTab, setActiveTab] = useState<"gateway" | "recommendations" | "matcher" | "tracker">("gateway");
  const [recommendationMode, setRecommendationMode] = useState<"resume" | "assessment">("resume");
  const [assessmentIdParam, setAssessmentIdParam] = useState<number | undefined>(undefined);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<JobRecommendation | null>(null);

  // Applications Tracker State
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState<boolean>(false);
  const [appFilter, setAppFilter] = useState<ApplicationStatus | "All">("All");

  // JD Matcher State
  const [jdText, setJdText] = useState<string>("");
  const [analyzingJd, setAnalyzingJd] = useState<boolean>(false);
  const [jdMatchResult, setJdMatchResult] = useState<JobMatchResponse | null>(null);
  const [jdError, setJdError] = useState<string>("");

  // Filters & Sorting (Location is optional display filter only, never affects score)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"match" | "newest" | "title">("match");

  // Load Active Resume
  const loadCurrentResume = useCallback(async () => {
    setLoadingResume(true);
    try {
      const res = await resumeAPI.getCurrent();
      setHasResume(res.data.has_resume);
      if (res.data.has_resume && res.data.resume) {
        setActiveResume(res.data.resume);
      }
    } catch (e) {
      console.error(e);
      setHasResume(false);
    } finally {
      setLoadingResume(false);
    }
  }, []);

  // Fetch Recommendations from Backend (strictly enforcing >= 60%)
  const fetchRecommendations = useCallback(async (mode: "resume" | "assessment" = "resume", aId?: number) => {
    setLoadingRecs(true);
    try {
      const res = await jobsAPI.recommend(null, mode, aId);
      // Extra safety check on client side: only keep jobs with match >= 60%
      const validJobs = (res.data.recommendations || []).filter(
        (j) => (j.match_percentage || j.match_score || 0) >= 60
      );
      setRecommendations(validJobs);
      setRecommendationMode(mode);
      setActiveTab("recommendations");
    } catch (e) {
      console.error("Failed to load recommendations", e);
      toast.error("Failed to load job recommendations. Please try again.");
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  // Fetch Applications Tracker
  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const res = await jobsAPI.getApplications();
      setApplications(res.data.applications || []);
    } catch (e) {
      console.error("Failed to load applications", e);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentResume();
    fetchApplications();
  }, [loadCurrentResume, fetchApplications]);

  // Handle URL Query Params (e.g. /jobs?mode=assessment&id=123 or /jobs?mode=resume)
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    const idParam = searchParams.get("id");
    if (modeParam === "assessment") {
      const aId = idParam ? parseInt(idParam) : undefined;
      setAssessmentIdParam(aId);
      fetchRecommendations("assessment", aId);
    } else if (modeParam === "resume") {
      fetchRecommendations("resume");
    }
  }, [searchParams, fetchRecommendations]);

  // Option 1 Handler: Self-Assessment
  const handleStartSelfAssessment = () => {
    navigate("/assessment");
  };

  // Option 2 Handler: Find Jobs from Resume
  const handleFindJobsFromResume = () => {
    if (!hasResume || !activeResume) {
      toast.error("Please upload an active resume first to generate resume recommendations.");
      navigate("/resume");
      return;
    }
    toast.success("Analyzing resume against complete job requirements...");
    fetchRecommendations("resume");
  };

  // Prepare for Job
  const handlePrepareForJob = (job: JobRecommendation) => {
    const key = job.job_key || `${job.company || "Company"}_${job.job_title}`.replace(/ /g, "_").toLowerCase();
    const companyName = job.company || job.companies?.[0] || "Target Company";
    toast.success(`Loading preparation workflow for ${job.job_title} at ${companyName}...`);
    navigate(
      `/mock-interview?role=${encodeURIComponent(job.job_title)}&company=${encodeURIComponent(companyName)}&job_key=${encodeURIComponent(key)}`,
      {
        state: {
          targetRole: job.job_title,
          company: companyName,
          job_description: job.description || `${job.job_title} position at ${companyName}.`,
          required_skills: job.matched_skills || [],
          location: job.location,
        },
      }
    );
  };

  // Apply or Save Handler
  const handleApplyOrSave = async (job: JobRecommendation, status: ApplicationStatus) => {
    try {
      const key = job.job_key || `${job.company}_${job.job_title}`.replace(/ /g, "_").toLowerCase();
      await jobsAPI.apply({
        job_key: key,
        job_title: job.job_title,
        company: job.company || job.companies?.[0] || "Company",
        location: job.location,
        status,
        apply_url: job.apply_url || undefined,
        salary_range: job.salary_range,
        deadline: job.deadline || undefined
      });
      toast.success(`Job marked as '${status}'.`);
      await fetchApplications();
      // Update in local state
      setRecommendations((prev) =>
        prev.map((j) => (j.job_key === key ? { ...j, status } : j))
      );
    } catch {
      toast.error("Failed to update job status.");
    }
  };

  // Update Tracker Status
  const handleUpdateStatus = async (job_key: string, status: ApplicationStatus) => {
    try {
      await jobsAPI.updateStatus(job_key, status);
      toast.success(`Status updated to ${status}.`);
      await fetchApplications();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // JD Analyzer Submit
  const handleAnalyzeJobDescription = async () => {
    if (!jdText.trim()) {
      setJdError("Please enter or paste a complete job description text.");
      return;
    }
    setAnalyzingJd(true);
    setJdError("");
    setJdMatchResult(null);
    try {
      const res = await jobsAPI.match(null, jdText);
      setJdMatchResult(res.data);
      toast.success("Job description analyzed successfully!");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to analyze job description.";
      setJdError(msg);
      toast.error(msg);
    } finally {
      setAnalyzingJd(false);
    }
  };

  // Filtered & Sorted Recommendations (>= 60% strictly enforced)
  const filteredRecommendations = useMemo(() => {
    return recommendations
      .filter((j) => {
        const score = j.match_score || j.match_percentage || 0;
        if (score < 60) return false;

        const matchesSearch =
          !searchQuery ||
          j.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (j.company && j.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (j.matched_skills && j.matched_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));

        const matchesLoc =
          locationFilter === "All" ||
          (j.location && j.location.toLowerCase().includes(locationFilter.toLowerCase()));

        return matchesSearch && matchesLoc;
      })
      .sort((a, b) => {
        const scoreA = a.match_score || a.match_percentage || 0;
        const scoreB = b.match_score || b.match_percentage || 0;
        if (sortBy === "match") return scoreB - scoreA;
        if (sortBy === "title") return a.job_title.localeCompare(b.job_title);
        return 0;
      });
  }, [recommendations, searchQuery, locationFilter, sortBy]);

  const filteredApps = applications.filter(
    (app) => appFilter === "All" || app.status === appFilter
  );

  // Available locations for optional display filter
  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    recommendations.forEach((r) => {
      if (r.location) {
        if (r.location.toLowerCase().includes("remote")) locs.add("Remote");
        if (r.location.toLowerCase().includes("bangalore") || r.location.toLowerCase().includes("bengaluru")) locs.add("Bengaluru");
        if (r.location.toLowerCase().includes("hyderabad")) locs.add("Hyderabad");
        if (r.location.toLowerCase().includes("chennai")) locs.add("Chennai");
        if (r.location.toLowerCase().includes("gurgaon") || r.location.toLowerCase().includes("ncr")) locs.add("Gurgaon / NCR");
      }
    });
    return Array.from(locs);
  }, [recommendations]);

  if (loadingResume) {
    return (
      <PageWrapper
        title="Job Recommendation Portal"
        subtitle="Intelligent candidate-to-job matching based on proven skills and resume evidence."
      >
        <div className="space-y-4 max-w-6xl mx-auto">
          <SkeletonCard />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Job Recommendation Portal"
      subtitle="Intelligent candidate-to-job matching based on proven skills and resume evidence."
    >
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Navigation Tabs Header */}
        <div className="flex gap-2 p-1 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-x-auto scrollbar-hide">
          {[
            { id: "gateway" as const, label: "Recommendation Gateway", icon: Compass },
            {
              id: "recommendations" as const,
              label: `Recommended Jobs (${filteredRecommendations.length})`,
              icon: Briefcase,
              disabled: recommendations.length === 0 && !loadingRecs
            },
            { id: "matcher" as const, label: "Job Description Matcher", icon: Sparkles },
            { id: "tracker" as const, label: `Application Tracker (${applications.length})`, icon: CheckCircle2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (!tab.disabled) setActiveTab(tab.id);
              }}
              disabled={tab.disabled}
              className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25"
                  : tab.disabled
                  ? "opacity-40 cursor-not-allowed text-[var(--text-muted)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
              }`}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            1. ENTRY SCREEN: JOB RECOMMENDATION GATEWAY
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "gateway" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Hero Header */}
            <div className="text-center max-w-2xl mx-auto space-y-2 py-4">
              <span className="px-3 py-1 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <Sparkles size={13} /> Intelligent Matching Engine
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                How would you like to find your next job?
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Choose an intelligent matching method based on your verified skills or your resume credentials.
              </p>
            </div>

            {/* Two Side-by-Side Large Option Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Take Self-Assessment */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <div className="h-full rounded-3xl p-8 glass-strong border border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col justify-between relative overflow-hidden group shadow-xl shadow-purple-950/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform" />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
                        <Award size={28} />
                      </div>
                      <span className="px-3 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-full text-[11px] font-bold">
                        Best for accurate skill-based recommendations
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-[var(--text-primary)] group-hover:text-purple-300 transition-colors">
                        Take Self-Assessment
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2.5">
                        Evaluate your technical knowledge and skills first. We'll use your assessment performance to recommend jobs that match your actual capabilities.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                        <span>Adaptive MCQs & LeetCode-style coding challenges</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                        <span>Tests actual competence against claimed resume skills</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                        <span>Full-screen distraction-free assessment environment</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[var(--border-subtle)] relative z-10">
                    <Button
                      onClick={handleStartSelfAssessment}
                      className="w-full py-4 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl border-none shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
                    >
                      Start Self-Assessment <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Option 2: Find Jobs Using My Resume */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <div className="h-full rounded-3xl p-8 glass-strong border border-blue-500/30 hover:border-blue-500/60 transition-all flex flex-col justify-between relative overflow-hidden group shadow-xl shadow-blue-950/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform" />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="p-3.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-300 rounded-2xl border border-blue-500/30">
                        <FileText size={28} />
                      </div>
                      <span className="px-3 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-full text-[11px] font-bold">
                        Fast recommendations based on your existing resume
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-[var(--text-primary)] group-hover:text-blue-300 transition-colors">
                        Find Jobs Using My Resume
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2.5">
                        Skip the assessment and find jobs based directly on the skills, experience, education, projects, and technologies detected in your resume.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                        <span>Instant extraction of 500+ technical taxonomy skills</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                        <span>Real resume evidence mapped to every matched requirement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                        <span>Enforces strict ≥ 60% match threshold (no poor matches)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[var(--border-subtle)] relative z-10">
                    {hasResume && activeResume ? (
                      <Button
                        onClick={handleFindJobsFromResume}
                        isLoading={loadingRecs}
                        className="w-full py-4 text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl border-none shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
                      >
                        Find Jobs From My Resume <ArrowRight size={16} />
                      </Button>
                    ) : (
                      <Link
                        to="/resume"
                        className="w-full py-4 text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
                      >
                        Upload Resume First <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Active Resume Status Card */}
            {activeResume ? (
              <Card className="glass border-[var(--border-subtle)] p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        Current Active Resume: {activeResume.filename}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        ATS Score: <strong className="text-blue-400">{activeResume.ats_score}%</strong> · {activeResume.skills?.length || 0} Extracted Skills
                      </p>
                    </div>
                  </div>
                  <Link to="/resume" className="text-xs text-blue-400 hover:underline font-bold flex items-center gap-1">
                    Manage / Change Resume <ChevronRight size={14} />
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="p-5 border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3 text-amber-400">
                    <AlertCircle size={20} />
                    <div>
                      <p className="text-xs font-bold">No Active Resume Detected</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Upload your resume in My Resume to enable resume-based job recommendations.</p>
                    </div>
                  </div>
                  <Link to="/resume" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition">
                    Upload Resume
                  </Link>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            2. SHARED RECOMMENDED JOBS SCREEN (>= 60% Filtered)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            {/* Header Banner with Back to Gateway button */}
            <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl glass-strong border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("gateway")}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center gap-1.5 transition"
                >
                  <ArrowLeft size={14} /> Change Search Method
                </button>
                <div className="border-l border-[var(--border-subtle)] pl-3">
                  <span className="text-xs text-[var(--text-muted)]">Recommendation Mode:</span>
                  <p className="text-xs font-bold text-indigo-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={13} />
                    {recommendationMode === "assessment"
                      ? "Self-Assessment Verified Capabilities (Combined with Resume)"
                      : `Active Resume (${activeResume?.filename || "Central Resume"})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
                  Showing Jobs ≥ 60% Match Only
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <Card padding="sm" className="glass-strong">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <Search size={16} className="text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by job title, company, or skill..."
                    className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 flex-wrap text-xs">
                  {/* Optional Location Filter */}
                  {availableLocations.length > 0 && (
                    <div className="flex items-center gap-1">
                      <MapPin size={13} className="text-[var(--text-muted)]" />
                      <span className="text-[var(--text-muted)]">Location:</span>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-primary)] rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="All">All Locations</option>
                        {availableLocations.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sort Order */}
                  <div className="flex items-center gap-1">
                    <SlidersHorizontal size={14} className="text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)]">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-[var(--bg-surface)] text-xs font-bold text-blue-400 border border-[var(--border-primary)] rounded-lg px-2.5 py-1 focus:outline-none"
                    >
                      <option value="match">Best Match %</option>
                      <option value="title">Job Title (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Jobs Grid */}
            {loadingRecs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : filteredRecommendations.length === 0 ? (
              <EmptyState
                image={IMAGES.empty.noJobs}
                title="No Qualifying Jobs Found"
                description="Only jobs matching at least 60% of requirements are displayed. Try adjusting your search query or upload an updated resume."
                action={
                  <Button onClick={() => setActiveTab("gateway")} variant="outline" size="sm">
                    Return to Gateway
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredRecommendations.map((job, idx) => {
                  const matchScore = job.match_score || Math.round(job.match_percentage || 0);
                  const isAppOpen = (job.application_status || "").toUpperCase() !== "APPLICATION CLOSED";
                  const hasValidUrl = isValidApplyUrl(job.apply_url);

                  return (
                    <motion.div
                      key={job.job_key || idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Card hoverEffect className="flex flex-col justify-between h-full group p-5">
                        <div className="space-y-3">
                          {/* Top Row: Title, Company, Match Score Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg shrink-0">
                                {job.company?.charAt(0) || <Building2 size={22} />}
                              </div>
                              <div>
                                <h3 className="font-bold text-[var(--text-primary)] text-base leading-snug group-hover:text-indigo-400 transition-colors">
                                  {job.job_title}
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5 font-medium">
                                  <Building2 size={13} /> {job.company || job.companies?.[0] || "Employer"}
                                </p>
                              </div>
                            </div>

                            {/* Match Score Badge */}
                            <div className="text-right shrink-0">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-black border ${
                                  matchScore >= 90
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : matchScore >= 80
                                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                    : matchScore >= 70
                                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                                    : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                }`}
                              >
                                <AnimatedCounter value={matchScore} suffix="%" /> Match
                              </span>
                              {job.match_category && (
                                <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-1">
                                  {job.match_category}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Metadata Tags: Location, Work Mode, Experience, Salary */}
                          <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--text-muted)]">
                            {job.location && (
                              <span className="flex items-center gap-1 bg-[var(--bg-elevated)] px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)]">
                                <MapPin size={11} /> {job.location}
                              </span>
                            )}
                            {job.work_mode && (
                              <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-500/20 font-medium">
                                {job.work_mode}
                              </span>
                            )}
                            {job.experience && (
                              <span className="bg-[var(--bg-elevated)] px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)]">
                                Exp: {job.experience}
                              </span>
                            )}
                            {job.salary_range && (
                              <span className="flex items-center gap-1 bg-[var(--bg-elevated)] px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold">
                                <DollarSign size={11} /> {job.salary_range}
                              </span>
                            )}
                          </div>

                          {/* Key Matched Skills */}
                          {job.matched_skills && job.matched_skills.length > 0 && (
                            <div className="space-y-1 text-xs">
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <Check size={12} /> Key Matched Skills:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {job.matched_skills.slice(0, 5).map((s) => (
                                  <span
                                    key={s}
                                    className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[11px] font-medium"
                                  >
                                    ✓ {s}
                                  </span>
                                ))}
                                {job.matched_skills.length > 5 && (
                                  <span className="text-[10px] text-[var(--text-muted)] self-center">
                                    +{job.matched_skills.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Important Missing Skills / Gaps */}
                          {job.missing_skills && job.missing_skills.length > 0 && (
                            <div className="space-y-1 text-xs">
                              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                <AlertTriangle size={12} /> Missing / Growth Areas:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {job.missing_skills.slice(0, 4).map((s) => (
                                  <span
                                    key={s}
                                    className="bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20 text-[11px]"
                                  >
                                    ✕ {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Experience Match & Application Status Row */}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-subtle)] text-[var(--text-muted)]">
                            <div>
                              <span>Experience Match: </span>
                              <strong className="text-[var(--text-primary)]">
                                {job.experience_match || 85}%
                              </strong>
                            </div>

                            <div className="flex items-center gap-2">
                              {isAppOpen ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  Application Open
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  Application Closed
                                </span>
                              )}

                              {job.closing_date && (
                                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                  <Clock size={11} /> Closes: {job.closing_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Footer */}
                        <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between gap-2 mt-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            {/* View Job Details Modal Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedJobDetails(job)}
                              className="text-xs font-bold"
                            >
                              View Job
                            </Button>

                            {/* Prepare for This Job */}
                            <button
                              onClick={() => handlePrepareForJob(job)}
                              className="px-3 py-1.5 bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm"
                            >
                              <Sparkles size={13} /> Prepare for This Job
                            </button>

                            {/* Save to Tracker */}
                            <button
                              onClick={() => handleApplyOrSave(job, "Saved")}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs transition"
                              title="Save to Application Tracker"
                            >
                              <Bookmark size={14} />
                            </button>
                          </div>

                          {/* Apply Now Button with Validation */}
                          {isAppOpen && hasValidUrl ? (
                            <a
                              href={job.apply_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleApplyOrSave(job, "Applied")}
                              className="px-4 py-2 brand-gradient text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 hover:opacity-95 transition cursor-pointer"
                            >
                              Apply Now <ExternalLink size={13} />
                            </a>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold cursor-not-allowed select-none opacity-60"
                            >
                              Applications Closed
                            </button>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            3. JOB DESCRIPTION MATCHER TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "matcher" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-400" /> Compare Resume to Job Description
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Paste any job description to evaluate keyword and skill overlap.
                    </p>
                  </div>
                  <button
                    onClick={() => setJdText(SAMPLE_JD)}
                    className="px-2.5 py-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-blue-400 border border-[var(--border-subtle)] rounded-xl text-[11px] font-bold transition"
                  >
                    Insert Sample JD
                  </button>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="w-full h-56 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-2xl p-4 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 resize-none font-mono"
                    placeholder="Paste job description requirements here..."
                  />
                </div>
                {jdError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                    <AlertCircle size={14} /> {jdError}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => { setJdText(""); setJdMatchResult(null); setJdError(""); }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw size={12} /> Clear Form
                  </button>
                  <Button
                    isLoading={analyzingJd}
                    onClick={handleAnalyzeJobDescription}
                    variant="gradient"
                    className="px-6 py-3 font-bold text-xs"
                  >
                    Analyze Job Description
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5">
              <Card className="space-y-4 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" /> Match Compatibility Report
                  </h3>
                  {analyzingJd && (
                    <div className="p-8 text-center text-[var(--text-muted)] space-y-2">
                      <Sparkles size={28} className="mx-auto text-blue-400 animate-spin" />
                      <p className="text-xs font-semibold">Comparing active resume with Job Description keywords...</p>
                    </div>
                  )}
                  {!analyzingJd && jdMatchResult && (
                    <div className="space-y-4 text-xs pt-2">
                      <div className="flex items-center gap-6 p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ATS Match Score</p>
                          <p className="text-3xl font-black text-blue-400 mt-0.5">
                            <AnimatedCounter value={jdMatchResult.result.ats_score} suffix="%" />
                          </p>
                        </div>
                        <div className="border-l border-[var(--border-primary)] pl-6">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Skill Compatibility</p>
                          <p className="text-2xl font-bold text-emerald-400 mt-0.5">
                            <AnimatedCounter value={jdMatchResult.result.job_match} suffix="%" />
                          </p>
                        </div>
                      </div>
                      {jdMatchResult.result.matched_skills.length > 0 && (
                        <div>
                          <p className="font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                            <CheckCircle2 size={13} /> Your Matching Skills:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {jdMatchResult.result.matched_skills.map((s) => (
                              <span key={s} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 text-[11px] font-semibold">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {jdMatchResult.result.missing_skills.length > 0 && (
                        <div>
                          <p className="font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> Missing / Gap Skills:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {jdMatchResult.result.missing_skills.map((s) => (
                              <span key={s} className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 text-[11px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!analyzingJd && !jdMatchResult && (
                    <div className="p-8 text-center text-[var(--text-muted)] space-y-2">
                      <Briefcase size={36} className="mx-auto opacity-30" />
                      <p className="text-xs">Paste a job description on the left and click Analyze to view match scores.</p>
                    </div>
                  )}
                </div>
                {jdMatchResult && (
                  <Button onClick={() => setActiveTab("recommendations")} variant="gradient" className="w-full py-3 text-xs font-bold mt-4">
                    View Recommended Jobs Matching This Profile <ArrowRight size={14} />
                  </Button>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            4. APPLICATION TRACKER TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "tracker" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 mr-2">
                <Filter size={14} /> Filter:
              </span>
              {(["All", "Saved", "Applied", "Interview", "Offer", "Rejected", "Closed"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setAppFilter(status)}
                  className={`px-3 py-1 text-xs rounded-xl font-semibold transition ${
                    appFilter === status
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {loadingApps ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="shimmer rounded-2xl h-20" />)}
              </div>
            ) : filteredApps.length === 0 ? (
              <EmptyState
                image={IMAGES.empty.noResults}
                title="No Tracked Applications"
                description="You have not saved or applied to any jobs with this status yet."
              />
            ) : (
              <div className="space-y-3">
                {filteredApps.map((app) => (
                  <Card key={app.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-[var(--text-primary)] text-sm">{app.job_title}</h4>
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateStatus(app.job_key, e.target.value as ApplicationStatus)}
                          className="bg-[var(--bg-surface)] text-xs text-blue-400 border border-[var(--border-primary)] rounded-lg px-2.5 py-1 font-bold focus:outline-none"
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applied">Applied</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {app.company} {app.location ? `· ${app.location}` : ""}
                      </p>
                    </div>

                    {app.apply_url && (
                      <a
                        href={app.apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs rounded-xl font-bold border border-[var(--border-subtle)] flex items-center gap-1 transition-colors"
                      >
                        Visit Application <ExternalLink size={12} />
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            5. COMPLETE JOB DETAILS MODAL
            ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {selectedJobDetails && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-primary)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold">
                        {selectedJobDetails.match_category || "Recommended Job"}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {selectedJobDetails.match_score || Math.round(selectedJobDetails.match_percentage)}% Overall Match
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] mt-1.5">
                      {selectedJobDetails.job_title}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] font-semibold mt-0.5">
                      {selectedJobDetails.company} · {selectedJobDetails.location} ({selectedJobDetails.work_mode || "Hybrid"})
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedJobDetails(null)}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Match Breakdown & Explainability Card */}
                <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Score Breakdown & Fit Analysis
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                    <div className="glass p-2.5 rounded-xl">
                      <span className="text-[var(--text-muted)] text-[10px]">Technical Skills</span>
                      <p className="font-bold text-indigo-400 text-base mt-0.5">{selectedJobDetails.technical_match || 88}%</p>
                    </div>
                    <div className="glass p-2.5 rounded-xl">
                      <span className="text-[var(--text-muted)] text-[10px]">Experience Alignment</span>
                      <p className="font-bold text-emerald-400 text-base mt-0.5">{selectedJobDetails.experience_match || 85}%</p>
                    </div>
                    <div className="glass p-2.5 rounded-xl">
                      <span className="text-[var(--text-muted)] text-[10px]">Responsibilities</span>
                      <p className="font-bold text-blue-400 text-base mt-0.5">{selectedJobDetails.responsibility_match || 80}%</p>
                    </div>
                    <div className="glass p-2.5 rounded-xl">
                      <span className="text-[var(--text-muted)] text-[10px]">Seniority & Domain</span>
                      <p className="font-bold text-purple-400 text-base mt-0.5">{selectedJobDetails.seniority_match || 85}%</p>
                    </div>
                  </div>
                  {selectedJobDetails.explanation && (
                    <p className="text-xs text-[var(--text-secondary)] italic pt-1">
                      "{selectedJobDetails.explanation}"
                    </p>
                  )}
                </div>

                {/* Assessment Discrepancy / Validation (if assessment path) */}
                {selectedJobDetails.assessment_validation && selectedJobDetails.assessment_validation.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Self-Assessment Validation & Capability Audit
                    </h4>
                    <div className="space-y-2">
                      {selectedJobDetails.assessment_validation.map((v, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl glass border border-[var(--border-subtle)] text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--text-primary)]">{v.skill}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                v.final_confidence === "VERIFIED"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : v.final_confidence.includes("GAP")
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {v.final_confidence}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)]">{v.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Skills With Real Resume Evidence */}
                {selectedJobDetails.matched_skills_with_evidence && selectedJobDetails.matched_skills_with_evidence.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Verified Matched Skills & Resume Evidence
                    </h4>
                    <div className="space-y-2">
                      {selectedJobDetails.matched_skills_with_evidence.map((m, i) => (
                        <div key={i} className="p-3 rounded-xl glass border border-emerald-500/20 text-xs">
                          <div className="flex items-center justify-between">
                            <strong className="text-emerald-400">{m.skill}</strong>
                            <span className="text-[10px] text-emerald-400/80 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded">
                              MATCHED
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-mono">
                            {m.evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Job Description & Responsibilities */}
                {selectedJobDetails.description && (
                  <div className="space-y-2 text-xs">
                    <h4 className="font-bold text-[var(--text-primary)]">About the Role</h4>
                    <p className="text-[var(--text-secondary)] leading-relaxed">{selectedJobDetails.description}</p>
                  </div>
                )}

                {selectedJobDetails.full_responsibilities && selectedJobDetails.full_responsibilities.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <h4 className="font-bold text-[var(--text-primary)]">Core Responsibilities</h4>
                    <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
                      {selectedJobDetails.full_responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical Stack Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="glass p-3.5 rounded-2xl border border-[var(--border-subtle)] space-y-2">
                    <h5 className="font-bold text-[var(--text-primary)]">Required Technical Stack</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedJobDetails.required_tech_stack || selectedJobDetails.skills || []).map((s) => (
                        <span key={s} className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="glass p-3.5 rounded-2xl border border-[var(--border-subtle)] space-y-2">
                    <h5 className="font-bold text-[var(--text-primary)]">Preferred / Bonus Technologies</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedJobDetails.preferred_tech_stack || []).length > 0 ? (
                        selectedJobDetails.preferred_tech_stack!.map((s) => (
                          <span key={s} className="bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] px-2 py-0.5 rounded text-[11px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--text-muted)] text-[11px]">None specified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Qualifications & Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 glass rounded-xl">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Experience</span>
                    <p className="font-semibold text-[var(--text-primary)] mt-0.5">{selectedJobDetails.experience || "Not specified"}</p>
                  </div>
                  <div className="p-3 glass rounded-xl">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Salary Package</span>
                    <p className="font-semibold text-[var(--text-primary)] mt-0.5">{selectedJobDetails.salary_range || "Competitive"}</p>
                  </div>
                  <div className="p-3 glass rounded-xl">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Education</span>
                    <p className="font-semibold text-[var(--text-primary)] mt-0.5">{selectedJobDetails.education_required || "Degree in CS / Related"}</p>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrepareForJob(selectedJobDetails)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <Sparkles size={14} /> Prepare for This Job
                    </button>
                    <button
                      onClick={() => handleApplyOrSave(selectedJobDetails, "Saved")}
                      className="px-3.5 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold flex items-center gap-1"
                    >
                      <Bookmark size={14} /> Save Job
                    </button>
                  </div>

                  {isValidApplyUrl(selectedJobDetails.apply_url) ? (
                    <a
                      href={selectedJobDetails.apply_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleApplyOrSave(selectedJobDetails, "Applied")}
                      className="px-5 py-2.5 brand-gradient text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                    >
                      Apply Now <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-xl text-xs font-medium cursor-not-allowed">
                      Application Link Unavailable
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}