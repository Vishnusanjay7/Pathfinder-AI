import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  BriefcaseBusiness, Building2, MapPin, ExternalLink, Sparkles,
  Search, Clock, BookOpen, ArrowRight, RefreshCw
} from "lucide-react";
import { jobsAPI, companyPrepAPI } from "../../api/endpoints";
import { IMAGES } from "../../config/images";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ScoreRing from "../../components/common/ScoreRing";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import EmptyState from "../../components/common/EmptyState";

export interface ApplicationItem {
  id: number;
  job_key: string;
  job_title: string;
  company: string;
  location: string;
  status: "Saved" | "Applied" | "Interview" | "Offer" | "Rejected" | "Closed" | string;
  application_date: string | null;
  saved_date_formatted: string;
  applied_date_formatted: string | null;
  deadline: string | null;
  apply_url: string | null;
  salary_range: string;
  job_match_score: number;
  readiness_score: number;
  preparation_id: number | null;
  preparation_progress: number;
  missing_skills: string[];
  created_at: string;
}

type TabType = "All" | "Saved" | "Applied" | "Interview" | "Offer" | "Rejected" | "Closed";

const STATUS_OPTIONS: { label: string; value: string; variant: "info" | "purple" | "warning" | "success" | "danger" | "default" }[] = [
  { label: "Saved", value: "Saved", variant: "info" },
  { label: "Applied", value: "Applied", variant: "purple" },
  { label: "Interview", value: "Interview", variant: "warning" },
  { label: "Offer Received", value: "Offer", variant: "success" },
  { label: "Rejected", value: "Rejected", variant: "danger" },
  { label: "Closed", value: "Closed", variant: "default" },
];

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "match" | "readiness">("newest");
  const [preparingJobKey, setPreparingJobKey] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsAPI.getApplications();
      if (res.data.success) setApplications(res.data.applications as ApplicationItem[]);
    } catch { toast.error("Failed to load your applications."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleUpdateStatus = async (jobKey: string, newStatus: string) => {
    try {
      await jobsAPI.updateStatus(jobKey, newStatus as any);
      toast.success(`Application status updated to '${newStatus}'!`);
      setApplications((prev) => prev.map((app) => {
        if (app.job_key === jobKey) {
          return { ...app, status: newStatus, applied_date_formatted: newStatus === "Applied" && !app.applied_date_formatted ? new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : app.applied_date_formatted };
        }
        return app;
      }));
    } catch { toast.error("Failed to update application status."); }
  };

  const handleStartPrep = (app: ApplicationItem) => {
    toast.success(`Loading Mock Interview for ${app.job_title} at ${app.company}...`);
    navigate(
      `/mock-interview?role=${encodeURIComponent(app.job_title)}&company=${encodeURIComponent(app.company)}&job_key=${encodeURIComponent(app.job_key)}`,
      {
        state: {
          targetRole: app.job_title,
          company: app.company,
          job_description: `${app.job_title} position at ${app.company}. Key skills: ${app.missing_skills.join(", ") || "General Engineering"}.`,
          required_skills: app.missing_skills,
          application_id: app.id,
        },
      }
    );
  };

  const stats = useMemo(() => {
    const total = applications.length;
    const saved = applications.filter((a) => a.status === "Saved").length;
    const applied = applications.filter((a) => a.status === "Applied").length;
    const interview = applications.filter((a) => a.status === "Interview").length;
    const offer = applications.filter((a) => a.status === "Offer").length;
    const avgMatch = total > 0 ? Math.round(applications.reduce((acc, a) => acc + (a.job_match_score || 0), 0) / total) : 0;
    const avgReadiness = total > 0 ? Math.round(applications.reduce((acc, a) => acc + (a.readiness_score || 0), 0) / total) : 0;
    return { total, saved, applied, interview, offer, avgMatch, avgReadiness };
  }, [applications]);

  const counts = useMemo(() => ({
    All: applications.length, Saved: applications.filter((a) => a.status === "Saved").length,
    Applied: applications.filter((a) => a.status === "Applied").length, Interview: applications.filter((a) => a.status === "Interview").length,
    Offer: applications.filter((a) => a.status === "Offer").length, Rejected: applications.filter((a) => a.status === "Rejected").length,
    Closed: applications.filter((a) => a.status === "Closed").length
  }), [applications]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (activeTab !== "All" && app.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!app.company.toLowerCase().includes(q) && !app.job_title.toLowerCase().includes(q) && !app.location.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "match") return b.job_match_score - a.job_match_score;
      if (sortBy === "readiness") return b.readiness_score - a.readiness_score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [applications, activeTab, searchQuery, sortBy]);

  const statCards = [
    { label: "Total Tracked", value: stats.total, variant: "text-blue-400" as const, border: "border-blue-500/15", desc: "Applications Hub" },
    { label: "Saved Jobs", value: stats.saved, variant: "text-blue-400" as const, border: "border-blue-500/15", desc: "Ready to apply" },
    { label: "Applied", value: stats.applied, variant: "text-purple-400" as const, border: "border-purple-500/15", desc: "Submitted" },
    { label: "Interviews", value: stats.interview, variant: "text-amber-400" as const, border: "border-amber-500/15", desc: "Active rounds" },
    { label: "Avg Match", value: stats.avgMatch, variant: "text-emerald-400" as const, border: "border-emerald-500/15", desc: "Skill overlap", suffix: "%" },
    { label: "Avg Readiness", value: stats.avgReadiness, variant: "text-cyan-400" as const, border: "border-cyan-500/15", desc: "Preparation index", suffix: "%" },
  ];

  return (
    <PageWrapper title="My Applications" subtitle="Career Command Center \u2014 Track, Manage, and Prepare for Saved & Applied Opportunities">
      <div className="space-y-8 select-none">

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`p-5 ${s.border} hover:border-opacity-50 transition-colors`}>
                <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">{s.label}</p>
                <h3 className={`text-2xl font-black mt-1 ${s.variant}`}><AnimatedCounter value={s.value} suffix={s.suffix || ""} /></h3>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 inline-block">{s.desc}</span>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 glass-strong rounded-3xl border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
            {(["All", "Saved", "Applied", "Interview", "Offer", "Rejected", "Closed"] as TabType[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"}`}>
                <span>{tab}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === tab ? "bg-white/20 text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>{counts[tab]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" placeholder="Search company or title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-secondary)] font-semibold focus:outline-none focus:border-indigo-500">
              <option value="newest">Sort by: Newest</option>
              <option value="match">Sort by: Job Match %</option>
              <option value="readiness">Sort by: Readiness Score</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="animate-spin text-indigo-400 mx-auto" size={36} />
            <p className="text-xs text-[var(--text-muted)] mt-3 font-bold">Loading your application hub...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <EmptyState
            image={IMAGES.empty.noJobs}
            title="No Applications Found"
            description={searchQuery || activeTab !== "All" ? "No job applications match your active filters or search terms." : "You haven't saved or applied for any jobs yet. Browse recommended opportunities in the Jobs section!"}
            action={<Button variant="gradient" onClick={() => navigate("/jobs")}>Browse Recommended Jobs <ArrowRight size={15} /></Button>}
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredApps.map((app) => {
                const isPreparingThis = preparingJobKey === app.job_key;
                const statusMeta = STATUS_OPTIONS.find((s) => s.value === app.status) || STATUS_OPTIONS[0];

                return (
                  <motion.div key={app.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="glass rounded-2xl p-6 shadow-xl hover:border-[rgba(99,102,241,0.2)] transition-all duration-300">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-lg">
                          <Building2 size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">{app.job_title}</h3>
                            <Badge variant={statusMeta.variant} size="sm">{statusMeta.label}</Badge>
                          </div>
                          <p className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                            <span>{app.company}</span>
                            <span className="text-[var(--text-muted)]">&#183;</span>
                            <span className="text-[var(--text-muted)] font-normal flex items-center gap-1"><MapPin size={12} /> {app.location}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)] pt-1">
                            <span>Salary: <strong className="text-[var(--text-secondary)]">{app.salary_range}</strong></span>
                            <span>Saved: <strong className="text-[var(--text-secondary)]">{app.saved_date_formatted}</strong></span>
                            {app.applied_date_formatted && <span>Applied: <strong className="text-emerald-400">{app.applied_date_formatted}</strong></span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 border-y lg:border-y-0 lg:border-x border-[var(--border-primary)] py-3 lg:py-0 lg:px-6 w-full lg:w-auto justify-between lg:justify-start">
                        <div className="text-center">
                          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Job Match</span>
                          <div className="mt-1 inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-black text-sm">
                            <Sparkles size={14} /> {app.job_match_score}%
                          </div>
                        </div>
                        <div className="text-center flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Readiness</span>
                          <div className="mt-1"><ScoreRing score={app.readiness_score} size={42} strokeWidth={4} /></div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2">
                          <select value={app.status} onChange={(e) => handleUpdateStatus(app.job_key, e.target.value)} className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl text-xs font-bold text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500">
                            <option value="Saved">Status: Saved</option><option value="Applied">Status: Applied</option><option value="Interview">Status: Interview</option><option value="Offer">Status: Offer Received</option><option value="Rejected">Status: Rejected</option><option value="Closed">Status: Closed</option>
                          </select>
                          {app.apply_url && <a href={app.apply_url} target="_blank" rel="noreferrer" className="p-2 bg-[var(--bg-surface)] border border-[var(--border-primary)] hover:border-[var(--text-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition flex items-center justify-center" title="Open External Job Posting"><ExternalLink size={15} /></a>}
                        </div>
                        <Button variant="primary" size="sm" isLoading={isPreparingThis} onClick={() => handleStartPrep(app)} leftIcon={<BookOpen size={14} />}>
                          {app.preparation_id ? "Continue Company Prep" : "Prepare for This Job"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--border-primary)]">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] mb-3">
                        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Clock size={13} className="text-blue-400" /> Application Journey Timeline:
                        </span>
                        {app.missing_skills.length > 0 && (
                          <span className="text-[var(--text-muted)]">Key Missing Skills: <span className="text-amber-400">{app.missing_skills.join(", ")}</span></span>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex flex-col items-center">
                          <span className="flex items-center gap-1">&#10003; Job Saved</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-normal">{app.saved_date_formatted}</span>
                        </div>
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex flex-col items-center">
                          <span className="flex items-center gap-1">&#10003; Link Opened</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-normal">Active</span>
                        </div>
                        <div className={`p-2 rounded-xl border flex flex-col items-center ${["Applied", "Interview", "Offer", "Rejected", "Closed"].includes(app.status) ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"}`}>
                          <span>{["Applied", "Interview", "Offer", "Rejected", "Closed"].includes(app.status) ? "\u2713 Applied" : "\u25CB Applied"}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-normal">{app.applied_date_formatted || "Pending"}</span>
                        </div>
                        <div className={`p-2 rounded-xl border flex flex-col items-center ${["Interview", "Offer"].includes(app.status) ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"}`}>
                          <span>{["Interview", "Offer"].includes(app.status) ? "\u2713 Interview" : "\u25CB Interview"}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-normal">{app.status === "Interview" ? "In Progress" : "Pending"}</span>
                        </div>
                        <div className={`p-2 rounded-xl border flex flex-col items-center ${app.status === "Offer" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : app.status === "Rejected" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"}`}>
                          <span>{app.status === "Offer" ? "Offer" : app.status === "Rejected" ? "Rejected" : "\u25CB Outcome"}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-normal">{app.status === "Offer" ? "Accepted/Received" : "Final Stage"}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}