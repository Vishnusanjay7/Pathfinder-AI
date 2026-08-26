import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Code2,
  ArrowRight,
  Upload,
  Briefcase,
  Target,
  Video,
  Sparkles,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Activity,
  Clock,
  Zap,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { resumeAPI, codingAPI, skillAssessmentAPI, mockInterviewAPI } from '../../api/endpoints';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ScoreRing from '../../components/common/ScoreRing';
import Badge from '../../components/common/Badge';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import { SkeletonDashboard } from '../../components/common/Skeleton';
import { IMAGES } from '../../config/images';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const CAREER_ROADMAP = [
  { label: 'RESUME', to: '/resume', icon: Upload },
  { label: 'SKILLS', to: '/assessment', icon: Target },
  { label: 'ASSESSMENT', to: '/assessment', icon: Target },
  { label: 'CODING', to: '/coding', icon: Code2 },
  { label: 'INTERVIEW', to: '/mock-interview', icon: Video },
  { label: 'LEARNING', to: '/learning', icon: BookOpen },
  { label: 'JOB', to: '/jobs', icon: Briefcase },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: resumeData, isLoading: loadingResume } = useQuery({
    queryKey: ['resume-history'],
    queryFn: () => resumeAPI.getHistory().then((r) => r.data),
  });

  const { data: codingData, isLoading: loadingCoding } = useQuery({
    queryKey: ['coding-history'],
    queryFn: () => codingAPI.getHistory().then((r) => r.data),
  });

  const { data: assessmentData, isLoading: loadingAssessment } = useQuery({
    queryKey: ['skill-assessment-history'],
    queryFn: () => skillAssessmentAPI.history().then((r) => r.data),
  });

  const { data: interviewData, isLoading: loadingInterview } = useQuery({
    queryKey: ['mock-interview-history'],
    queryFn: () => mockInterviewAPI.getHistory().then((r) => r.data),
  });

  const isLoading = loadingResume || loadingCoding || loadingAssessment || loadingInterview;

  const resumes = resumeData?.resumes ?? [];
  const latestResume = resumes[0];
  const atsScore = latestResume ? latestResume.ats_score : 0;

  const codingHistory = Array.isArray(codingData) ? codingData : [];
  const avgCodingScore =
    codingHistory.length > 0
      ? Math.round(codingHistory.reduce((a, c) => a + c.score, 0) / codingHistory.length)
      : 0;

  const assessmentHistory = assessmentData?.assessments ?? [];
  const latestAssessment = assessmentHistory[0];
  const assessmentScore = latestAssessment?.score ?? 70;

  const interviewHistory = interviewData?.history ?? [];
  const latestInterview = interviewHistory[0];
  const interviewScore = latestInterview?.overall_score ?? 75;

  const learningScore = 75;

  const placementReadinessScore = Math.round(
    (atsScore * 0.15) +
    (assessmentScore * 0.20) +
    (avgCodingScore * 0.20) +
    (interviewScore * 0.30) +
    (learningScore * 0.15)
  );

  const stats = [
    {
      label: 'ATS Resume Score',
      value: atsScore,
      suffix: '%',
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-emerald-400',
      glow: 'shadow-emerald-500/20',
      ring: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Skill Assessment',
      value: assessmentScore,
      suffix: '%',
      icon: Target,
      gradient: 'from-indigo-500 to-indigo-400',
      glow: 'shadow-indigo-500/20',
      ring: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Avg Coding Score',
      value: avgCodingScore,
      suffix: '%',
      icon: Code2,
      gradient: 'from-cyan-500 to-cyan-400',
      glow: 'shadow-cyan-500/20',
      ring: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      label: 'Mock Interview',
      value: interviewScore,
      suffix: '%',
      icon: Video,
      gradient: 'from-purple-500 to-purple-400',
      glow: 'shadow-purple-500/20',
      ring: 'bg-purple-500/10 border-purple-500/20',
    },
  ];

  const quickActions = [
    { to: '/resume', icon: Upload, label: 'My Resume', desc: 'Central resume & ATS analysis', gradient: 'from-indigo-500/20 to-indigo-600/5', border: 'hover:border-indigo-500/50', iconColor: 'text-indigo-400' },
    { to: '/jobs', icon: Briefcase, label: 'Jobs & Tracker', desc: 'Recommendations & applications', gradient: 'from-cyan-500/20 to-cyan-600/5', border: 'hover:border-cyan-500/50', iconColor: 'text-cyan-400' },
    { to: '/assessment', icon: Target, label: 'AI Skill Assessment', desc: 'MCQs, coding & combined report', gradient: 'from-emerald-500/20 to-emerald-600/5', border: 'hover:border-emerald-500/50', iconColor: 'text-emerald-400' },
    { to: '/mock-interview', icon: Video, label: 'AI Mock Interview', desc: 'Voice, video & readiness score', gradient: 'from-purple-500/20 to-purple-600/5', border: 'hover:border-purple-500/50', iconColor: 'text-purple-400' },
  ];

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] ?? 'Candidate';

  const breakdownBars = [
    { label: 'Resume ATS', value: atsScore, gradient: 'from-emerald-500 to-emerald-400' },
    { label: 'Skills Assessment', value: assessmentScore, gradient: 'from-indigo-500 to-indigo-400' },
    { label: 'Coding Score', value: avgCodingScore, gradient: 'from-cyan-500 to-cyan-400' },
    { label: 'AI Mock Interview', value: interviewScore, gradient: 'from-purple-500 to-purple-400' },
    { label: 'Learning Progress', value: learningScore, gradient: 'from-amber-500 to-amber-400' },
  ];

  if (isLoading) {
    return (
      <PageWrapper title={`${timeGreeting}, ${firstName}`} subtitle="Loading your dashboard...">
        <SkeletonDashboard />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`${timeGreeting}, ${firstName} 👋`}
      subtitle="Everything you need to become job-ready."
    >
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 select-none">

        {/* ── Hero Section ── */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-primary)]">
            <div className="absolute inset-0">
              <img
                src={IMAGES.dashboard.hero}
                alt="Dashboard hero"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-[var(--bg-primary)]/60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
            </div>
            <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={12} /> AI Career Command Center
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                  Welcome back,{' '}
                  <span className="brand-gradient-text">{firstName}</span>
                </h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-md">
                  Your personalized career dashboard. Track progress, sharpen skills, and land your dream role.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Activity size={14} className="text-emerald-400" />
                    <span><AnimatedCounter value={assessmentHistory.length + interviewHistory.length + codingHistory.length} /> activities</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Clock size={14} className="text-cyan-400" />
                    <span>Last active today</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <ScoreRing score={placementReadinessScore} size={120} strokeWidth={7} label="Readiness" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Career Journey Roadmap ── */}
        <motion.div variants={itemVariants}>
          <Card padding="md" className="overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Trophy size={16} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Career Journey Roadmap</h3>
            </div>
            <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
              <div className="flex items-center gap-0 min-w-[640px]">
                {CAREER_ROADMAP.map((step, idx) => (
                  <div key={step.label} className="flex items-center shrink-0">
                    <Link
                      to={step.to}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center transition-all duration-300 group-hover:from-indigo-500/40 group-hover:to-purple-500/40 group-hover:border-indigo-400/60 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/20">
                          <step.icon size={16} className="text-indigo-300 group-hover:text-indigo-200 transition-colors" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] flex items-center justify-center">
                          <CheckCircle size={10} className="text-white" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] group-hover:text-indigo-300 transition-colors">{step.label}</span>
                    </Link>
                    {idx < CAREER_ROADMAP.length - 1 && (
                      <div className="flex items-center mx-1 mt-[-16px]">
                        <div className="w-8 h-[2px] bg-gradient-to-r from-indigo-500/40 to-indigo-500/10" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Placement Readiness Score ── */}
        <motion.div variants={itemVariants}>
          <Card padding="lg" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full -translate-y-32 translate-x-32" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="pulse-glow">
                  <ScoreRing score={placementReadinessScore} size={110} strokeWidth={8} label="Readiness" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                    <Zap size={12} /> CareerIQ Readiness Matrix
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                    Overall Readiness: <AnimatedCounter value={placementReadinessScore} suffix="%" className="brand-gradient-text" />
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
                    Weighted evaluation across ATS Resume (15%), Skill Assessment (20%), Coding (20%), Mock Interview (30%), and Learning Progress (15%).
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-80 space-y-3">
                {breakdownBars.map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[var(--text-secondary)] mb-1.5">
                      <span className="text-xs font-semibold">{bar.label}</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">{bar.value}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${bar.gradient} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.value}%` }}
                        transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Stats Grid ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} padding="md" hoverEffect className={`border border-[var(--border-subtle)] relative overflow-hidden group`}>
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${stat.gradient} opacity-5 rounded-bl-full transition-opacity group-hover:opacity-10`} />
              <div className="relative z-10">
                <div className={`w-11 h-11 rounded-2xl border ${stat.ring} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <stat.icon size={20} className={`bg-gradient-to-br ${stat.gradient} bg-clip-text`} style={{ color: 'inherit' }} />
                </div>
                <p className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">{stat.label}</p>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* ── Quick Actions Grid ── */}
        <motion.div variants={itemVariants}>
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`block rounded-2xl p-5 border border-[var(--border-subtle)] ${action.border} bg-gradient-to-br ${action.gradient} transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:border-white/20`}>
                  <action.icon size={20} className={action.iconColor} />
                </div>
                <p className="font-bold text-[var(--text-primary)] text-sm">{action.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{action.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Recent Activity ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Assessment Activity */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Target size={14} className="text-indigo-400" />
                </div>
                Recent AI Assessments
              </h3>
              <Link to="/assessment" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {assessmentHistory.length > 0 ? (
              <div className="space-y-1">
                {assessmentHistory.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-3 px-3 flex items-center justify-between text-xs rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Target size={14} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{item.role}</p>
                        <p className="text-[var(--text-muted)]">{item.experience_level} · {item.status}</p>
                      </div>
                    </div>
                    <Badge variant={item.score !== null && item.score >= 70 ? 'success' : 'warning'}>
                      {item.score !== null ? `${item.score}%` : 'In Progress'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <img src={IMAGES.empty.noData} alt="" className="w-24 h-24 rounded-2xl object-cover opacity-40" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">No assessments yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Start your first AI skill assessment to unlock insights.</p>
                </div>
                <Link to="/assessment">
                  <Button variant="gradient" size="sm" leftIcon={<Target size={14} />}>Start Assessment</Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Mock Interview Activity */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Video size={14} className="text-purple-400" />
                </div>
                Mock Interview Sessions
              </h3>
              <Link to="/mock-interview/history" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {interviewHistory.length > 0 ? (
              <div className="space-y-1">
                {interviewHistory.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-3 px-3 flex items-center justify-between text-xs rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Video size={14} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{item.target_role}</p>
                        <p className="text-[var(--text-muted)]">{item.interview_type} · {item.difficulty}</p>
                      </div>
                    </div>
                    {item.overall_score !== null ? (
                      <Badge variant={item.overall_score >= 75 ? 'success' : 'warning'}>
                        {item.overall_score}%
                      </Badge>
                    ) : (
                      <span className="text-amber-400 font-semibold">{item.status}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <img src={IMAGES.empty.noResults} alt="" className="w-24 h-24 rounded-2xl object-cover opacity-40" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">No interviews yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Practice with AI mock interviews to boost your readiness.</p>
                </div>
                <Link to="/mock-interview">
                  <Button variant="gradient" size="sm" leftIcon={<Video size={14} />}>Start Interview</Button>
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
