import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Video,
  Check,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Briefcase,
  ShieldCheck,
  Wifi,
  Building2,
} from "lucide-react";
import { mockInterviewAPI, resumeAPI } from "../../api/endpoints";
import type { ActiveResume, InterviewType, ExperienceLevel } from "../../types";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import {
  INTERVIEW_AVATARS,
  type HumanInterviewer,
} from "../../data/interviewAvatars";

const ROLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Java Developer",
  "Python Developer",
  "AI/ML Engineer",
  "Data Scientist",
  "DevOps Engineer",
  "Cloud Engineer",
];

export default function MockInterviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Read preloaded job context
  const preloadedRole = searchParams.get("role") || location.state?.targetRole || "";
  const preloadedCompany = searchParams.get("company") || location.state?.company || "";
  const preloadedJobKey = searchParams.get("job_key") || location.state?.job_key || "";
  const preloadedJobDescription = location.state?.job_description || "";
  const preloadedSkills: string[] = location.state?.required_skills || [];

  // Wizard Stepper State: 1 = Interviewer Selection, 2 = Preferences
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Setup Options State
  const [activeResume, setActiveResume] = useState<ActiveResume | null>(null);
  const [targetRole, setTargetRole] = useState<string>(preloadedRole || ROLES[0]);
  const [interviewType, setInterviewType] = useState<InterviewType>("Technical");
  const [difficulty, setDifficulty] = useState<ExperienceLevel>("Intermediate");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [language, setLanguage] = useState<string>("en-US");

  // Avatar Selection & Engine Mode State
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male">("all");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("male_hr");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("aura-orion-en");
  const [avatarEngineMode, setAvatarEngineMode] = useState<"vrm" | "video">("vrm");

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (preloadedRole) {
      setTargetRole(preloadedRole);
    }
    resumeAPI
      .getCurrent()
      .then((res) => {
        if (res.data.has_resume && res.data.resume) {
          setActiveResume(res.data.resume);
        }
      })
      .catch(() => {});
  }, [preloadedRole]);

  const selectedAvatar =
    INTERVIEW_AVATARS.find((a) => a.id === selectedAvatarId) || INTERVIEW_AVATARS[0];

  const effectiveVoiceId = selectedAvatar.voices.some((v) => v.id === selectedVoiceId)
    ? selectedVoiceId
    : selectedAvatar.defaultVoiceId;

  const filteredAvatars = INTERVIEW_AVATARS.filter((avatar) => {
    if (genderFilter === "female") return avatar.gender === "female";
    if (genderFilter === "male") return avatar.gender === "male";
    return true;
  });

  const handleSelectAvatar = (avatar: HumanInterviewer) => {
    setSelectedAvatarId(avatar.id);
    setSelectedVoiceId(avatar.defaultVoiceId);
  };

  const handleStartInterview = async () => {
    setLoading(true);
    try {
      localStorage.setItem("preferred_avatar_engine", avatarEngineMode);
      const res = await mockInterviewAPI.start({
        target_role: targetRole,
        interview_type: interviewType,
        difficulty: difficulty,
        question_count: Number(questionCount),
        avatar_id: selectedAvatarId,
        voice_id: effectiveVoiceId,
        language: language,
        company: preloadedCompany || undefined,
        job_description: preloadedJobDescription || `${targetRole} position.`,
        required_skills: preloadedSkills.length > 0 ? preloadedSkills : undefined,
      } as any);

      if (res.data.success) {
        toast.success(`Mock interview session started with ${selectedAvatar.name}!`);
        navigate(`/mock-interview/room/${res.data.interview_id}`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to start mock interview.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="AI Mock Interview"
      subtitle="Select a realistic corporate HR or Technical interviewer, configure your session preferences, and practice in a live WebRTC room."
    >
      <div className="max-w-7xl mx-auto space-y-6 select-none font-sans text-[var(--text-primary)]">
        {/* ── Preloaded Job Context Banner ── */}
        {preloadedCompany && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-gradient-to-r from-blue-900/30 via-indigo-900/25 to-purple-900/30 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                  Target Job Context Loaded
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Preparing interview for: <span className="text-emerald-400">{targetRole}</span> at{" "}
                  <span className="text-indigo-300">{preloadedCompany}</span>
                </h3>
                {preloadedSkills.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluated Skills: <span className="text-amber-300">{preloadedSkills.join(", ")}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-black flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles size={13} /> Job-Specific AI Reasoning
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Top Header & Stepper ── */}
        <div className="glass-strong rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Video size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                  Photorealistic 3D Human AI Interview Studio
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                  <Wifi size={11} /> LiveKit & WebRTC Voice
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Photorealistic Human Avatars · Real-Time Deepgram STT & TTS · OpenRouter AI Orchestrator
              </p>
            </div>
          </div>

          {/* Stepper Wizard */}
          <div className="flex items-center gap-3">
            {(
              [
                { num: 1, label: "Select Interviewer" },
                { num: 2, label: "Session Preferences" },
              ] as const
            ).map((s, i) => (
              <div key={s.num} className="flex items-center gap-3">
                {i > 0 && (
                  <div
                    className={`w-8 h-px ${
                      currentStep >= s.num ? "bg-emerald-500/50" : "bg-white/10"
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(s.num);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] transition-all duration-300 ${
                      currentStep === s.num
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                        : currentStep > s.num
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-[var(--text-muted)] border border-white/10"
                    }`}
                  >
                    {currentStep > s.num ? <Check size={13} strokeWidth={3} /> : s.num}
                  </span>
                  <span
                    className={`text-xs font-bold hidden sm:inline ${
                      currentStep === s.num
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            STEP 1: INTERVIEWER SELECTION
            ═══════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: 4 Interviewer Cards */}
            <div className="lg:col-span-6 space-y-5 glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)]">
                    Choose Your Corporate Interviewer
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                    4 specialized corporate HR & Technical leaders in executive office suites
                  </p>
                </div>

                {/* Gender Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                  {(["all", "female", "male"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                        genderFilter === g
                          ? "bg-emerald-500 text-black shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-Column Grid of the 4 Interviewers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAvatars.map((avatar) => {
                  const isSelected = avatar.id === selectedAvatarId;
                  return (
                    <motion.div
                      key={avatar.id}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectAvatar(avatar)}
                      className={`relative cursor-pointer glass rounded-2xl overflow-hidden transition-all duration-300 group border ${
                        isSelected
                          ? "border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/20"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 bg-emerald-500 text-black rounded-lg flex items-center justify-center shadow-lg font-black">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      <div className="w-full h-44 relative overflow-hidden bg-slate-950">
                        <img
                          src={avatar.thumbnailUrl}
                          alt={avatar.name}
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 backdrop-blur-md rounded-md text-[10px] font-extrabold text-blue-300">
                            Corporate Suite
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            LiveKit Ready
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1 bg-[var(--bg-card)]">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                          {avatar.name}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] font-medium line-clamp-1">
                          {avatar.role}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-[var(--text-muted)] font-semibold">
                            {avatar.experience}
                          </span>
                          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                            {avatar.gender}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Detailed Profile & Capabilities */}
            <div className="lg:col-span-6 space-y-6">
              {/* Selected Profile Card */}
              <div className="glass rounded-2xl p-6 space-y-5 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedAvatar.thumbnailUrl}
                    alt={selectedAvatar.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-xl shadow-emerald-500/20"
                  />
                  <div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Selected HR Interviewer
                    </span>
                    <h2 className="text-xl font-black text-white mt-1">
                      {selectedAvatar.name}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      {selectedAvatar.role} · {selectedAvatar.experience}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-emerald-400" /> Evaluation Focus & Domain
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    {selectedAvatar.description}
                  </p>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    Environment: {selectedAvatar.officeSetting}
                  </p>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Volume2 size={14} className="text-blue-400" /> Deepgram Aura Voice
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {selectedAvatar.defaultAccent}
                    </span>
                  </div>
                  <select
                    value={effectiveVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {selectedAvatar.voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Capabilities Pill Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-slate-300">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>LiveKit Real-Time WebRTC</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-slate-300">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>Dynamic OpenRouter Brain</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-slate-300">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>Deepgram Real-Time STT & TTS</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-slate-300">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>Company RAG Knowledge Base</span>
                  </div>
                </div>

                <div className="pt-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    rightIcon={<ArrowRight size={16} />}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold border-none shadow-lg shadow-emerald-500/25"
                  >
                    Proceed with {selectedAvatar.name}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP 2: PREFERENCES CONFIGURATION
            ═══════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Card padding="lg" className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-4">
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
                    <Sliders size={20} className="text-emerald-400" /> Configure Interview Session
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                    Customize your target role, 9-phase flow, difficulty progression, and question count.
                  </p>
                </div>

                {activeResume && (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase">
                    Resume Integration Enabled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Target Job Role */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Target Job Role
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interview Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Interview Type & Multi-Round Flow
                  </label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as any)}
                    className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="Technical">
                      9-Phase Comprehensive Round (Intro → Background → Resume → Projects → Company → Behavioral → Technical → Q&A → Closing)
                    </option>
                    <option value="HR">HR & Self-Introduction Focus</option>
                    <option value="Behavioral">Behavioral & Situational Focus</option>
                    <option value="Mixed">Mixed Technical & Culture Fit</option>
                  </select>
                </div>

                {/* Difficulty Level */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Difficulty Progression
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="Beginner">Beginner (Fundamentals & Core Concepts)</option>
                    <option value="Intermediate">Intermediate (Real-world Architecture & APIs)</option>
                    <option value="Advanced">Advanced (System Design, Scalability & Trade-offs)</option>
                  </select>
                </div>

                {/* Question Count */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Interview Length (Questions)
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value={5}>Express Session (5 Questions)</option>
                    <option value={7}>Standard 7-Round Session (7 Questions)</option>
                    <option value={10}>Comprehensive Round (10 Questions)</option>
                    <option value={15}>In-depth Assessment (15 Questions)</option>
                  </select>
                </div>

                {/* Language Locale */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Speaking Language Locale
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="en-US">English (United States) en-US</option>
                    <option value="en-GB">English (Great Britain) en-GB</option>
                    <option value="en-IN">English (India) en-IN</option>
                  </select>
                </div>

                {/* Avatar Rendering Engine Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Avatar Rendering Engine
                  </label>
                  <select
                    value={avatarEngineMode}
                    onChange={(e) => setAvatarEngineMode(e.target.value as any)}
                    className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="vrm">
                      🤖 3D VRM Model Avatar (Interactive WebGL 3D Studio & Lip Sync)
                    </option>
                    <option value="video">
                      📹 Photorealistic HD Video Interviewer Mode
                    </option>
                  </select>
                </div>
              </div>

              {/* Selection Summary Bar */}
              <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedAvatar.thumbnailUrl}
                    alt={selectedAvatar.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {selectedAvatar.name} ({selectedAvatar.role})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Role: <strong className="text-emerald-400">{targetRole}</strong> · Engine:{" "}
                      <strong className="text-indigo-400">{avatarEngineMode === "vrm" ? "3D VRM Model" : "HD Video"}</strong> · Length:{" "}
                      <strong>{questionCount} Questions</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 glass rounded-xl text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5"
                  >
                    <ArrowLeft size={14} /> Change Interviewer
                  </button>

                  <Button
                    variant="primary"
                    size="md"
                    isLoading={loading}
                    onClick={handleStartInterview}
                    leftIcon={<Sparkles size={16} />}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold border-none shadow-lg shadow-emerald-500/25"
                  >
                    {avatarEngineMode === "vrm" ? "Start 3D Interview Studio" : "Start Real-Time Interview"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
