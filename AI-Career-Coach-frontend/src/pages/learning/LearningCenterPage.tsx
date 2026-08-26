import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Hammer,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Zap,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { learningCenterAPI } from "../../api/endpoints";
import { IMAGES } from "../../config/images";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import EmptyState from "../../components/common/EmptyState";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function LearningCenterPage() {
  const client = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["learning-center"],
    queryFn: () => learningCenterAPI.overview().then((r) => r.data),
  });

  const complete = async (
    type: "course" | "certification" | "project" | "practice" | "interview",
    key: string,
    title: string
  ) => {
    await learningCenterAPI.complete(type, key, title);
    await client.invalidateQueries({ queryKey: ["learning-center"] });
  };

  if (isLoading) {
    return (
      <PageWrapper
        title="Learning Center Workspace"
        subtitle="Building your personalized career roadmap..."
      >
        <div className="p-12 text-center text-[var(--text-muted)]">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Fetching roadmap nodes and recommended courses...
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Learning Center Workspace"
        subtitle="Unable to load learning data"
      >
        <Card className="text-center p-8 text-rose-400">
          Learning data could not be retrieved from the server.
        </Card>
      </PageWrapper>
    );
  }

  const report = data?.report;
  if (!report) {
    return (
      <PageWrapper
        title="Learning Center Workspace"
        subtitle="Personalized roadmap requires an AI Skill Assessment."
      >
        <EmptyState
          image={IMAGES.learning.study}
          title="No Active Learning Roadmap Found"
          description="Complete an AI Skill Assessment to automatically generate a step-by-step career roadmap, recommended courses, and targeted interview practice."
          action={
            <a
              href="/assessment"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/25"
            >
              Take AI Skill Assessment Now
            </a>
          }
        />
      </PageWrapper>
    );
  }

  const completed = new Set(
    data?.progress.map((item) => `${item.resource_type}:${item.resource_key}`)
  );

  const stats = [
    {
      label: "Career Score",
      value: report.overall_career_score,
      suffix: "%",
      icon: <Zap size={18} />,
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/25",
      valueColor: "text-blue-400",
    },
    {
      label: "Interview Readiness",
      value: null,
      text: report.interview_readiness,
      icon: <Target size={18} />,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/25",
      valueColor: "text-emerald-400",
    },
    {
      label: "Completed Tasks",
      value: data?.progress.length ?? 0,
      icon: <Trophy size={18} />,
      gradient: "from-purple-500/20 to-violet-500/20",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/25",
      valueColor: "text-purple-400",
    },
  ];

  return (
    <PageWrapper
      title="Personalized Career Roadmap & Learning Academy"
      subtitle={`Turn Skill Gaps into Market Mastery · Target Role Readiness: ${report.interview_readiness} · ${data?.progress.length ?? 0} Completed Tasks`}
    >
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* ── Premium Stats Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <Card
                padding="sm"
                hoverEffect
                className={`relative overflow-hidden border ${s.borderColor}`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-40`}
                />
                <div className="relative flex items-center gap-4 p-1">
                  <div
                    className={`w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${s.iconColor}`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                      {s.label}
                    </p>
                    <p className={`text-2xl font-black mt-0.5 ${s.valueColor}`}>
                      {s.value !== null ? (
                        <AnimatedCounter value={s.value} suffix={s.suffix} />
                      ) : (
                        s.text
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Connected Career Roadmap Pipeline ── */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-blue-500/20">
            <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-4 mb-6">
              <h2 className="text-base font-black text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles size={18} className="text-blue-400" /> Connected
                Career Action Roadmap
              </h2>
              <Badge variant="info">Automated Pipeline</Badge>
            </div>

            <div className="space-y-0 relative">
              {report.learning_roadmap.map((item, idx) => (
                <div
                  key={item.period}
                  className="flex items-start gap-4 relative"
                >
                  {/* Step Circle + Connector */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center font-black text-sm z-10 shadow-lg shadow-blue-500/10">
                      0{idx + 1}
                    </div>
                    {idx < report.learning_roadmap.length - 1 && (
                      <div className="w-0.5 h-12 bg-gradient-to-b from-blue-500/40 to-blue-500/10" />
                    )}
                  </div>

                  {/* Node Content */}
                  <div className="flex-1 glass rounded-2xl p-4 mb-4 hover:border-white/12 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        {item.period}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Stage {idx + 1}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mt-1">
                      {item.goal}
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                      {item.tasks.map((t, tidx) => (
                        <span
                          key={tidx}
                          className="bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06] text-[var(--text-secondary)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* ── Resources Grid ── */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
          <div className="grid gap-6 lg:grid-cols-2">
            <ResourceList
              icon={<BookOpen size={18} className="text-blue-400" />}
              title="Recommended Courses"
              items={report.courses}
              type="course"
              completed={completed}
              onComplete={complete}
            />
            <ResourceList
              icon={<GraduationCap size={18} className="text-emerald-400" />}
              title="Industry Certifications"
              items={report.certifications}
              type="certification"
              completed={completed}
              onComplete={complete}
            />
            <ResourceList
              icon={<Hammer size={18} className="text-purple-400" />}
              title="Recommended Portfolio Projects"
              items={report.projects}
              type="project"
              completed={completed}
              onComplete={complete}
            />

            {/* Practice & Prompts */}
            <Card hoverEffect>
              <h2 className="flex items-center gap-2 font-black text-[var(--text-primary)] text-sm mb-4">
                <MessageCircle size={18} className="text-amber-400" />{" "}
                Practice Platforms & Interview Preparation
              </h2>

              <div className="space-y-2 mb-4">
                <p className="text-xs font-bold text-[var(--text-muted)]">
                  Practice Platforms:
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.practice_platforms.map((p) => (
                    <a
                      key={p.url}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="glass px-3 py-1.5 text-blue-400 hover:text-blue-300 border border-blue-500/15 rounded-xl text-xs font-semibold flex items-center gap-1 transition hover:border-blue-500/30"
                    >
                      {p.name} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </div>

              {report.interview_preparation?.technical_questions && (
                <div className="space-y-2 border-t border-[var(--border-primary)] pt-3">
                  <p className="text-xs font-bold text-[var(--text-secondary)]">
                    Suggested Technical Prompts:
                  </p>
                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                    {report.interview_preparation.technical_questions
                      .slice(0, 4)
                      .map((q, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 glass rounded-xl text-[var(--text-secondary)]"
                        >
                          {q}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}

function ResourceList({
  icon,
  title,
  items,
  type,
  completed,
  onComplete,
}: {
  icon: React.ReactNode;
  title: string;
  items: {
    title: string;
    url?: string;
    description?: string;
    difficulty?: string;
    estimated_time?: string;
    provider?: string;
    duration?: string;
    pricing?: string;
  }[];
  type: "course" | "certification" | "project";
  completed: Set<string>;
  onComplete: (
    type: "course" | "certification" | "project",
    key: string,
    title: string
  ) => Promise<void>;
}) {
  return (
    <Card hoverEffect>
      <h2 className="flex items-center gap-2 font-black text-[var(--text-primary)] text-sm mb-4">
        {icon} {title}
      </h2>
      <div className="space-y-3">
        {items.map((item, index) => {
          const key = `${title}-${index}`;
          const done = completed.has(`${type}:${key}`);
          return (
            <div
              key={key}
              className="glass rounded-xl p-4 text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <b className="text-[var(--text-primary)] text-xs font-bold">
                  {item.title}
                </b>
                {done && <Badge variant="success">Completed</Badge>}
              </div>

              <p className="text-[var(--text-secondary)] leading-relaxed">
                {item.description ||
                  item.difficulty ||
                  item.estimated_time ||
                  (item.provider
                    ? `${item.provider} · ${item.duration}`
                    : "Recommended resource.")}
              </p>

              <div className="flex items-center justify-between pt-1">
                {item.url ? (
                  <a
                    className="text-blue-400 hover:text-blue-300 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                    target="_blank"
                    rel="noreferrer"
                    href={item.url}
                  >
                    Open Resource <ExternalLink size={11} />
                  </a>
                ) : (
                  <span />
                )}

                <Button
                  size="xs"
                  variant={done ? "ghost" : "outline"}
                  disabled={done}
                  onClick={() => onComplete(type, key, item.title)}
                >
                  {done ? (
                    <>
                      <CheckCircle2 size={13} /> Completed
                    </>
                  ) : (
                    "Mark Complete"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
