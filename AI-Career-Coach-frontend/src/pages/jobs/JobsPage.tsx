import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Briefcase, Building2, MapPin, ExternalLink, FileText, CheckCircle2,
  Bookmark, ArrowRight, Sparkles, Filter, DollarSign, Search, RotateCcw,
  AlertCircle, TrendingUp, SlidersHorizontal
} from "lucide-react";
import { jobsAPI, resumeAPI, companyPrepAPI } from "../../api/endpoints";
import type { ActiveResume, JobApplication, JobMatchResponse, JobRecommendation, ApplicationStatus } from "../../types";
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
Salary: \u20B912,000,000 - \u20B918,000,000 P.A.

Requirements:
- 3+ years of experience building modern web applications.
- Strong proficiency in React, TypeScript, Tailwind CSS, and state management.
- Solid backend expertise in Python, FastAPI, PostgreSQL, and RESTful APIs.
- Experience with Docker, CI/CD pipelines, Git, and AWS cloud deployment.
- Passion for clean code, automated testing, and scalable architecture.`;

export default function JobsPage() {
  const navigate = useNavigate();
  const [activeResume, setActiveResume] = useState<ActiveResume | null>(null);
  const [hasResume, setHasResume] = useState<boolean>(true);
  const [loadingResume, setLoadingResume] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"matcher" | "recommendations" | "tracker">("matcher");
  const [appFilter, setAppFilter] = useState<ApplicationStatus | "All">("All");
  const [preparingJobKey, setPreparingJobKey] = useState<string | null>(null);

  const handlePrepareForJob = (job: JobRecommendation) => {
    const key = job.job_key || `${job.company || "Company"}_${job.job_title}`.replace(/ /g, "_").toLowerCase();
    const companyName = job.company || job.companies?.[0] || "Target Company";
    toast.success(`Loading Mock Interview for ${job.job_title} at ${companyName}...`);
    navigate(
      `/mock-interview?role=${encodeURIComponent(job.job_title)}&company=${encodeURIComponent(companyName)}&job_key=${encodeURIComponent(key)}`,
      {
        state: {
          targetRole: job.job_title,
          company: companyName,
          job_description: `${job.job_title} position at ${companyName}. Skills: ${job.matched_skills?.join(", ") || "General software development"}.`,
          required_skills: job.matched_skills || [],
          location: job.location,
        },
      }
    );
  };

  const [jdText, setJdText] = useState<string>("");
  const [jdRole, setJdRole] = useState<string>("");
  const [analyzingJd, setAnalyzingJd] = useState<boolean>(false);
  const [jdMatchResult, setJdMatchResult] = useState<JobMatchResponse | null>(null);
  const [jdError, setJdError] = useState<string>("");
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [loadingApps, setLoadingApps] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [minMatchFilter, setMinMatchFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"match" | "newest" | "title">("match");

  const loadCurrentResume = useCallback(async () => {
    setLoadingResume(true);
    try {
      const res = await resumeAPI.getCurrent();
      setHasResume(res.data.has_resume);
      if (res.data.has_resume && res.data.resume) setActiveResume(res.data.resume);
    } catch (e) { console.error(e); setHasResume(false); } finally { setLoadingResume(false); }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try { const res = await jobsAPI.recommend(); setRecommendations(res.data.recommendations); }
    catch (e) { console.error("Failed to load recommendations", e); } finally { setLoadingRecs(false); }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    try { const res = await jobsAPI.getApplications(); setApplications(res.data.applications); }
    catch (e) { console.error("Failed to load applications", e); } finally { setLoadingApps(false); }
  }, []);

  useEffect(() => { loadCurrentResume(); }, [loadCurrentResume]);
  useEffect(() => { if (hasResume) { fetchRecommendations(); fetchApplications(); } }, [hasResume, fetchRecommendations, fetchApplications]);

  const handleAnalyzeJobDescription = async () => {
    if (!jdText.trim()) { setJdError("Please enter or paste a complete job description text."); return; }
    setAnalyzingJd(true); setJdError(""); setJdMatchResult(null);
    try {
      const res = await jobsAPI.match(null, jdText);
      setJdMatchResult(res.data); toast.success("Job description analyzed successfully!");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to analyze job description.";
      setJdError(msg); toast.error(msg);
    } finally { setAnalyzingJd(false); }
  };

  const handleApplyOrSave = async (job: JobRecommendation, status: ApplicationStatus) => {
    try {
      const key = job.job_key || `${job.company}_${job.job_title}`.replace(/ /g, "_").toLowerCase();
      await jobsAPI.apply({ job_key: key, job_title: job.job_title, company: job.company || job.companies?.[0] || "Company", location: job.location, status, apply_url: job.apply_url || undefined, salary_range: job.salary_range, deadline: job.deadline || undefined });
      toast.success(`Job marked as '${status}'.`); await fetchRecommendations(); await fetchApplications();
    } catch { toast.error("Failed to update job status."); }
  };

  const handleUpdateStatus = async (job_key: string, status: ApplicationStatus) => {
    try { await jobsAPI.updateStatus(job_key, status); toast.success(`Status updated to ${status}.`); await fetchRecommendations(); await fetchApplications(); }
    catch { toast.error("Failed to update status."); }
  };

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((j) => {
      const matchesSearch = !searchQuery || j.job_title.toLowerCase().includes(searchQuery.toLowerCase()) || (j.company && j.company.toLowerCase().includes(searchQuery.toLowerCase())) || (j.matched_skills && j.matched_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesLoc = locationFilter === "All" || (j.location && j.location.toLowerCase().includes(locationFilter.toLowerCase()));
      const matchesPct = j.match_percentage >= minMatchFilter;
      return matchesSearch && matchesLoc && matchesPct;
    }).sort((a, b) => { if (sortBy === "match") return b.match_percentage - a.match_percentage; if (sortBy === "title") return a.job_title.localeCompare(b.job_title); return 0; });
  }, [recommendations, searchQuery, locationFilter, minMatchFilter, sortBy]);

  const filteredApps = applications.filter((app) => appFilter === "All" || app.status === appFilter);

  if (loadingResume) {
    return (
      <PageWrapper title="Find Your Next Opportunity" subtitle="Analyze job requirements against your central resume, calculate match compatibility, and launch company preparation.">
        <div className="space-y-4"><SkeletonCard /><div className="grid grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div></div>
      </PageWrapper>
    );
  }

  if (!hasResume) {
    return (
      <PageWrapper title="Find Your Next Opportunity" subtitle="Analyze job requirements against your central resume, calculate match compatibility, and launch company preparation.">
        <EmptyState image={IMAGES.empty.noData} title="No Active Resume Found"
          description="Upload your resume in My Resume to extract skills and enable AI job matching."
          action={<Link to="/resume" className="inline-flex items-center gap-2 px-6 py-3 brand-gradient text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30">Upload Central Resume <ArrowRight size={16} /></Link>} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Find Your Next Opportunity" subtitle="Analyze job requirements against your central resume, calculate match compatibility, and launch company preparation.">
      <div className="space-y-8 max-w-6xl mx-auto">
        {activeResume && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative overflow-hidden p-4 rounded-2xl glass-strong border border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-4">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500/15 to-cyan-500/10 text-blue-400 rounded-xl border border-blue-500/20"><FileText size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Active Resume: {activeResume.filename}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">ATS Score: <strong className="text-blue-400">{activeResume.ats_score}%</strong> &#183; {activeResume.skills?.length || 0} Matched Skills</p>
                </div>
              </div>
              <Link to="/resume" className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-bold">Manage Resume <ArrowRight size={12} /></Link>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2 p-1 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-x-auto scrollbar-hide">
          {([
            { id: "matcher" as const, label: "Job Description Matcher", icon: Sparkles },
            { id: "recommendations" as const, label: `Recommended (${recommendations.length})`, icon: Briefcase },
            { id: "tracker" as const, label: `Tracker (${applications.length})`, icon: CheckCircle2 },
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"}`}>
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "matcher" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> Find Jobs That Match You</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Paste a complete job description to compare your active resume skills.</p>
                  </div>
                  <button onClick={() => setJdText(SAMPLE_JD)} className="px-2.5 py-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-blue-400 border border-[var(--border-subtle)] rounded-xl text-[11px] font-bold transition">Insert Sample JD</button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-secondary)]">Job Description Text</span><span>{jdText.length} characters</span>
                  </div>
                  <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-56 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-2xl p-4 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 resize-none font-mono transition-colors" placeholder="Paste full job description requirements, responsibilities, and key technologies..." />
                </div>
                {jdError && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-xl text-xs text-rose-400 flex items-center gap-2"><AlertCircle size={14} /> {jdError}</motion.div>}
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => { setJdText(""); setJdMatchResult(null); setJdError(""); }} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 font-semibold transition-colors"><RotateCcw size={12} /> Clear Form</button>
                  <Button isLoading={analyzingJd} onClick={handleAnalyzeJobDescription} variant="gradient" className="px-6 py-3 font-bold text-xs">Analyze Job Description & Match Skills</Button>
                </div>
              </Card>
            </div>
            <div className="lg:col-span-5">
              <Card className="space-y-4 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-3 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400" /> Role Compatibility Report</h3>
                  {analyzingJd && <div className="p-8 text-center text-[var(--text-muted)] space-y-2"><Sparkles size={28} className="mx-auto text-blue-400 animate-spin" /><p className="text-xs font-semibold">Comparing active resume with Job Description keywords...</p></div>}
                  {!analyzingJd && jdMatchResult && (
                    <div className="space-y-4 text-xs pt-2">
                      <div className="flex items-center gap-6 p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                        <div><p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ATS Match Score</p><p className="text-3xl font-black text-blue-400 mt-0.5"><AnimatedCounter value={jdMatchResult.result.ats_score} suffix="%" /></p></div>
                        <div className="border-l border-[var(--border-primary)] pl-6"><p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Skill Compatibility</p><p className="text-2xl font-bold text-emerald-400 mt-0.5"><AnimatedCounter value={jdMatchResult.result.job_match} suffix="%" /></p></div>
                      </div>
                      {jdMatchResult.result.matched_skills.length > 0 && <div><p className="font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><CheckCircle2 size={13} /> Your Matching Skills:</p><div className="flex flex-wrap gap-1.5">{jdMatchResult.result.matched_skills.map((s) => <span key={s} className="px-2.5 py-1 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400 rounded-lg border border-emerald-500/15 text-[11px] font-semibold">{s}</span>)}</div></div>}
                      {jdMatchResult.result.missing_skills.length > 0 && <div><p className="font-bold text-amber-400 mb-1.5 flex items-center gap-1"><AlertCircle size={13} /> Missing / Gap Skills:</p><div className="flex flex-wrap gap-1.5">{jdMatchResult.result.missing_skills.map((s) => <span key={s} className="px-2.5 py-1 bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-400 rounded-lg border border-amber-500/15 text-[11px] font-medium">{s}</span>)}</div></div>}
                    </div>
                  )}
                  {!analyzingJd && !jdMatchResult && <div className="p-8 text-center text-[var(--text-muted)] space-y-2"><Briefcase size={36} className="mx-auto opacity-30" /><p className="text-xs">Paste a job description on the left and click Analyze to view match scores.</p></div>}
                </div>
                {jdMatchResult && <Button onClick={() => setActiveTab("recommendations")} variant="gradient" className="w-full py-3 text-xs font-bold mt-4">View Recommended Jobs For This Role <ArrowRight size={14} /></Button>}
              </Card>
            </div>
          </div>
        )}

        {activeTab === "recommendations" && (
          <div className="space-y-6">
            <Card padding="sm" className="glass-strong">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <Search size={16} className="text-[var(--text-muted)]" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search title, company, or skill..." className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none" />
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1">
                    <SlidersHorizontal size={14} className="text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Sort:</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-[var(--bg-surface)] text-xs font-bold text-blue-400 border border-[var(--border-primary)] rounded-lg px-2.5 py-1 focus:outline-none"><option value="match">Best Match %</option><option value="title">Job Title</option></select>
                  </div>
                </div>
              </div>
            </Card>
            {loadingRecs ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
              : filteredRecommendations.length === 0 ? <EmptyState image={IMAGES.empty.noJobs} title="No Recommendations Found" description="No recommended opportunities match your current filters. Try adjusting your search." />
              : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecommendations.map((job, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card hoverEffect className="flex flex-col justify-between group">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border border-blue-500/15 text-blue-400 flex items-center justify-center font-black text-base shrink-0">{job.company?.charAt(0) || <Building2 size={20} />}</div>
                            <div>
                              <h3 className="font-bold text-[var(--text-primary)] text-base leading-snug">{job.job_title}</h3>
                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><Building2 size={13} /> {job.company || job.companies?.[0] || "Employer"}</p>
                              <Badge variant={job.source === "adzuna" ? "warning" : job.source === "jsearch" ? "purple" : "default"} size="sm">{job.source === "adzuna" ? "Adzuna" : job.source === "jsearch" ? "JSearch" : "Local"}</Badge>
                            </div>
                          </div>
                          <div className="text-right shrink-0"><span className="px-3 py-1 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-black"><AnimatedCounter value={job.match_percentage} suffix="%" /> Match</span></div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)] my-3">
                          {job.location && <span className="flex items-center gap-1 bg-[var(--bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]"><MapPin size={12} /> {job.location}</span>}
                          {job.salary_range && <span className="flex items-center gap-1 bg-[var(--bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold"><DollarSign size={12} /> {job.salary_range}</span>}
                          {job.employment_type && <span className="bg-[var(--bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">{job.employment_type}</span>}
                        </div>
                        <div className="space-y-2 text-xs my-3">
                          {job.matched_skills.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="text-[var(--text-muted)] font-medium">Matched:</span>{job.matched_skills.map((s) => <span key={s} className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/15 font-medium">{s}</span>)}</div>}
                          {job.missing_skills.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="text-[var(--text-muted)] font-medium">Missing:</span>{job.missing_skills.map((s) => <span key={s} className="bg-[var(--bg-elevated)] text-[var(--text-muted)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">{s}</span>)}</div>}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-[var(--border-primary)] flex items-center justify-between gap-3 mt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handlePrepareForJob(job)} disabled={preparingJobKey === (job.job_key || `${job.company}_${job.job_title}`.replace(/ /g, "_").toLowerCase())} className="px-3.5 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm">
                            <Sparkles size={13} /> {preparingJobKey === (job.job_key || `${job.company}_${job.job_title}`.replace(/ /g, "_").toLowerCase()) ? "Preparing..." : "Prepare for This Job"}
                          </button>
                          <button onClick={() => handleApplyOrSave(job, "Saved")} className="px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold flex items-center gap-1 transition"><Bookmark size={13} /> Save</button>
                          <button onClick={() => handleApplyOrSave(job, "Applied")} className="px-3 py-1.5 bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 rounded-xl text-xs font-bold border border-blue-500/20 transition">Mark Applied</button>
                        </div>
                        {isValidApplyUrl(job.apply_url) ? <a href={job.apply_url!} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); window.open(job.apply_url!, "_blank", "noopener,noreferrer"); }} className="px-3.5 py-1.5 brand-gradient text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-md shadow-indigo-600/20 cursor-pointer">Apply Now <ExternalLink size={12} /></a>
                          : isValidApplyUrl(job.job_url) ? <a href={job.job_url!} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); window.open(job.job_url!, "_blank", "noopener,noreferrer"); }} className="px-3.5 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer">View Job <ExternalLink size={12} /></a>
                          : <span className="px-3 py-1.5 bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-xl text-xs font-medium flex items-center gap-1 cursor-not-allowed select-none">Application link unavailable</span>}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            }
          </div>
        )}

        {activeTab === "tracker" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 mr-2"><Filter size={14} /> Filter:</span>
              {(["All", "Saved", "Applied", "Interview", "Offer", "Rejected", "Closed"] as const).map((status) => (
                <button key={status} onClick={() => setAppFilter(status)} className={`px-3 py-1 text-xs rounded-xl font-semibold transition ${appFilter === status ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"}`}>{status}</button>
              ))}
            </div>
            {loadingApps ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="shimmer rounded-2xl h-20" />)}</div>
              : filteredApps.length === 0 ? <EmptyState image={IMAGES.empty.noResults} title="No Applications Match" description="No applications match your current filter. Try selecting a different status." />
              : <div className="space-y-3">
                {filteredApps.map((app) => (
                  <Card key={app.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-[var(--text-primary)] text-sm">{app.job_title}</h4>
                        <select value={app.status} onChange={(e) => handleUpdateStatus(app.job_key, e.target.value as ApplicationStatus)} className="bg-[var(--bg-surface)] text-xs text-blue-400 border border-[var(--border-primary)] rounded-lg px-2.5 py-1 font-bold focus:outline-none">
                          <option value="Saved">Saved</option><option value="Applied">Applied</option><option value="Interview">Interview</option><option value="Offer">Offer</option><option value="Rejected">Rejected</option><option value="Closed">Closed</option>
                        </select>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{app.company} {app.location ? `\u00B7 ${app.location}` : ""}</p>
                    </div>
                    {app.apply_url && <a href={app.apply_url} target="_blank" rel="noreferrer" className="px-3.5 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs rounded-xl font-bold border border-[var(--border-subtle)] flex items-center gap-1 self-start md:self-center transition-colors">Visit Listing <ExternalLink size={12} /></a>}
                  </Card>
                ))}
              </div>
            }
          </div>
        )}
      </div>
    </PageWrapper>
  );
}