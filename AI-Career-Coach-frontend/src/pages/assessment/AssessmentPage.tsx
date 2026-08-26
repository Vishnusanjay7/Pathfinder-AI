import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { codingAPI, skillAssessmentAPI, resumeAPI } from "../../api/endpoints";
import type {
  AdaptiveAssessmentEvaluateResponse,
  AdaptiveAssessmentStartResponse,
  CodingSubmitResponse,
  ExperienceLevel,
  SkillAssessmentReport,
} from "../../types";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import ScoreRing from "../../components/common/ScoreRing";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import {
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Code,
  Sparkles,
  Terminal,
  Play,
  RotateCcw,
  Check,
  X,
  Zap,
  Target,
  Trophy,
  AlertTriangle,
} from "lucide-react";

const roles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Java Developer",
  "Python Developer",
  "Data Analyst",
  "AI Engineer",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "DevOps Engineer",
  "Cyber Security Engineer",
  "Mobile App Developer",
];

type Step = "setup" | "mcq" | "mcq_transition" | "coding" | "report";

interface CodingQuestionData {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  language: string;
  topic: string;
  tags: string[];
  constraints: string[];
  input_format: string;
  output_format: string;
  sample_input: string;
  sample_output: string;
  explanation: string;
  expected_time_complexity: string;
  expected_space_complexity: string;
  time_limit: number;
  memory_limit: number;
  visible_test_cases: { input: string; output: string }[];
}

interface QuestionAnswerState {
  code: string;
  language: string;
  status: "not_started" | "attempted" | "passed" | "failed";
  score?: number;
  testResult?: CodingSubmitResponse | null;
}

export default function AssessmentPage() {
  const [step, setStep] = useState<Step>("setup");
  const [role, setRole] = useState(roles[0]);
  const [level, setLevel] = useState<ExperienceLevel>("Beginner");
  const [resumeText, setResumeText] = useState("");
  const [started, setStarted] =
    useState<AdaptiveAssessmentStartResponse | null>(null);
  const [evaluation, setEvaluation] =
    useState<AdaptiveAssessmentEvaluateResponse | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);

  const [codingQuestions, setCodingQuestions] = useState<CodingQuestionData[]>(
    []
  );
  const [currentCodingIdx, setCurrentCodingIdx] = useState<number>(0);
  const [codingAnswers, setCodingAnswers] = useState<
    Record<number, QuestionAnswerState>
  >({});

  const [loading, setLoading] = useState(false);
  const [activeResume, setActiveResume] = useState<
    import("../../types").ActiveResume | null
  >(null);
  const [report, setReport] = useState<SkillAssessmentReport | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(45 * 60);

  const answeredMcqs = Object.keys(mcqAnswers).length;
  const mcqProgress = useMemo(
    () =>
      started
        ? Math.round((answeredMcqs / started.questions.length) * 100)
        : 0,
    [answeredMcqs, started]
  );

  useEffect(() => {
    resumeAPI
      .getCurrent()
      .then((res) => {
        if (res.data.has_resume && res.data.resume) {
          setActiveResume(res.data.resume);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== "mcq" && step !== "coding") return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const generate = async () => {
    setLoading(true);
    try {
      const response = await skillAssessmentAPI.generate({
        role,
        experience_level: level,
        resume_text: resumeText,
      });
      setStarted(response.data);
      setMcqAnswers({});
      setStartedAt(Date.now());
      setCurrentMcqIndex(0);
      setStep("mcq");
    } catch {
      toast.error("Unable to generate assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finishMcq = async () => {
    if (!started || answeredMcqs !== started.questions.length) {
      return toast.error("Please answer all MCQ questions before continuing.");
    }
    setLoading(true);
    try {
      const response = await skillAssessmentAPI.evaluateMcq(
        started.assessment_id,
        mcqAnswers,
        Math.round((Date.now() - startedAt) / 1000)
      );
      const resData = response.data;
      setEvaluation(resData);

      const qList: CodingQuestionData[] =
        resData.coding_questions ||
        (resData.coding_question ? [resData.coding_question] : []);
      setCodingQuestions(qList);

      const initialAnswers: Record<number, QuestionAnswerState> = {};
      qList.forEach((q) => {
        initialAnswers[q.id] = {
          code: "",
          language: "python",
          status: "not_started",
        };
      });
      setCodingAnswers(initialAnswers);
      setStep("mcq_transition");
    } catch {
      toast.error("Unable to evaluate the MCQ round.");
    } finally {
      setLoading(false);
    }
  };

  const startCodingRound = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
    setCurrentCodingIdx(0);
    setStep("coding");
  };

  const currentCodingQuestion = codingQuestions[currentCodingIdx] || null;
  const currentCodingState: QuestionAnswerState =
    currentCodingQuestion && codingAnswers[currentCodingQuestion.id]
      ? codingAnswers[currentCodingQuestion.id]
      : {
          code: "",
          language: "python",
          status: "not_started",
          testResult: null,
        };

  const updateCurrentQuestionState = (
    updates: Partial<QuestionAnswerState>
  ) => {
    if (!currentCodingQuestion) return;
    setCodingAnswers((prev) => ({
      ...prev,
      [currentCodingQuestion.id]: {
        ...prev[currentCodingQuestion.id],
        ...updates,
      },
    }));
  };

  const handleClearCode = () => {
    updateCurrentQuestionState({ code: "" });
    toast.success("Code editor cleared.");
  };

  const handleLanguageChange = (newLang: string) => {
    updateCurrentQuestionState({ language: newLang, code: "" });
  };

  const handleRunCode = async () => {
    if (!started || !currentCodingQuestion) return;
    setLoading(true);
    try {
      const res = await codingAPI.run({
        assessment_id: started.legacy_assessment_id,
        question_id: currentCodingQuestion.id,
        language: currentCodingState.language,
        source_code: currentCodingState.code,
      });
      updateCurrentQuestionState({
        status: "attempted",
        testResult: res.data,
      });
      toast.success(
        `Ran visible test cases (${res.data.passed}/${res.data.total_test_cases} Passed)`
      );
    } catch {
      toast.error(
        "Code execution failed. Ensure execution service is available."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!started || !currentCodingQuestion) return;
    setLoading(true);
    try {
      const res = await codingAPI.submit({
        assessment_id: started.legacy_assessment_id,
        question_id: currentCodingQuestion.id,
        language: currentCodingState.language,
        source_code: currentCodingState.code,
      });
      const passed = res.data.score >= 70;
      updateCurrentQuestionState({
        status: passed ? "passed" : "failed",
        score: res.data.score,
        testResult: res.data,
      });
      toast.success(`Question Submitted! Score: ${res.data.score}%`);
    } catch {
      toast.error("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!started || !evaluation) return;
    setLoading(true);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }

      const scores = Object.values(codingAnswers).map((a) =>
        a.score ?? (a.status === "passed" ? 100 : a.status === "failed" ? 30 : 0)
      );
      const aggregateCodingScore = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const feedback = [
        `Completed ${scores.length} coding questions with aggregate score of ${aggregateCodingScore}%.`,
      ];

      const finalReportRes = await skillAssessmentAPI.report(
        started.assessment_id,
        aggregateCodingScore,
        feedback
      );
      setReport(finalReportRes.data.report);
      setStep("report");
      toast.success("Final Assessment Report generated!");
    } catch {
      toast.error("Failed to submit final assessment.");
    } finally {
      setLoading(false);
    }
  };

  const currentMcqQuestion = started?.questions[currentMcqIndex];

  const attemptedCount = Object.values(codingAnswers).filter(
    (a) => a.status !== "not_started"
  ).length;
  const passedCount = Object.values(codingAnswers).filter(
    (a) => a.status === "passed"
  ).length;

  return (
    <div>
      {/* ═══════════════════════════════════════
          1. SETUP STEP
          ═══════════════════════════════════════ */}
      {step === "setup" && (
        <PageWrapper
          title="AI Skill & Coding Assessment"
          subtitle="Adaptive candidate evaluation: 20 personalized MCQs, 5 LeetCode-style coding questions, and placement report."
        >
          <Card padding="lg" className="mx-auto max-w-3xl space-y-6">
            {activeResume ? (
              <div className="p-4 glass rounded-2xl flex items-center justify-between text-xs text-blue-300 border border-blue-500/20">
                <span className="font-semibold">
                  Active Resume Loaded: {activeResume.filename} (
                  {activeResume.skills?.length || 0} Skills)
                </span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  Auto-Personalized
                </span>
              </div>
            ) : (
              <div className="p-4 glass rounded-2xl text-xs text-amber-300 border border-amber-500/20">
                Upload your central resume in{" "}
                <a
                  href="/resume"
                  className="underline font-bold text-amber-400"
                >
                  My Resume
                </a>{" "}
                for automatic assessment personalization.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                  Target Career Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl glass border border-[var(--border-primary)] p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                  Experience Level
                </label>
                <select
                  value={level}
                  onChange={(e) =>
                    setLevel(e.target.value as ExperienceLevel)
                  }
                  className="w-full rounded-xl glass border border-[var(--border-primary)] p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                >
                  {(
                    ["Beginner", "Intermediate", "Advanced"] as ExperienceLevel[]
                  ).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                Additional Context / Skills{" "}
                <span className="text-[var(--text-muted)] font-normal">
                  (Optional)
                </span>
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="min-h-24 w-full rounded-xl glass border border-[var(--border-primary)] p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                placeholder="Paste extra skills or project context if desired."
              />
            </div>

            <Button
              isLoading={loading}
              onClick={generate}
              className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black border-none shadow-lg shadow-emerald-500/25"
            >
              <Sparkles size={16} /> Start Adaptive AI Skill Assessment
            </Button>
          </Card>
        </PageWrapper>
      )}

      {/* ═══════════════════════════════════════
          2. MCQ STEP
          ═══════════════════════════════════════ */}
      {step === "mcq" && started && currentMcqQuestion && (
        <PageWrapper
          title="MCQ Skill Round"
          subtitle={`Role: ${started.role} · Time Remaining: ${formatTime(timeRemaining)}`}
        >
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Progress Header */}
            <Card className="glass border-blue-500/20">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold uppercase">
                    MCQ Round · {started.role}
                  </span>
                  <h2 className="text-lg font-black text-[var(--text-primary)] mt-1">
                    Question {currentMcqIndex + 1} of{" "}
                    {started.questions.length}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-blue-400 glass px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Clock size={14} /> {formatTime(timeRemaining)}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 glass px-3 py-1.5 rounded-xl">
                    {answeredMcqs} / {started.questions.length} Answered (
                    {mcqProgress}%)
                  </span>
                </div>
              </div>

              <div className="mt-4 h-2 rounded-full glass overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${mcqProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </Card>

            {/* Question Card */}
            <motion.div
              key={currentMcqIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="space-y-5">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="font-bold text-blue-400 uppercase tracking-wider">
                    {currentMcqQuestion.topic}
                  </span>
                  <span className="px-2 py-0.5 glass rounded font-medium">
                    {currentMcqQuestion.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--text-primary)] leading-relaxed">
                  {currentMcqIndex + 1}. {currentMcqQuestion.question}
                </h3>

                <div className="grid gap-3 md:grid-cols-2">
                  {currentMcqQuestion.options.map((option) => (
                    <label
                      key={option}
                      onClick={() =>
                        setMcqAnswers((curr) => ({
                          ...curr,
                          [currentMcqQuestion.id]: option,
                        }))
                      }
                      className={`cursor-pointer rounded-xl glass border p-4 text-xs font-medium transition-all ${
                        mcqAnswers[currentMcqQuestion.id] === option
                          ? "border-emerald-500/50 bg-emerald-500/10 text-[var(--text-primary)] shadow-lg shadow-emerald-500/10"
                          : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-white/15 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <input
                        type="radio"
                        className="mr-2"
                        name={currentMcqQuestion.id}
                        checked={
                          mcqAnswers[currentMcqQuestion.id] === option
                        }
                        onChange={() => {}}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </Card>
            </motion.div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                disabled={currentMcqIndex === 0}
                onClick={() =>
                  setCurrentMcqIndex((prev) => prev - 1)
                }
                leftIcon={<ArrowLeft size={16} />}
              >
                Previous Question
              </Button>

              {currentMcqIndex + 1 < started.questions.length ? (
                <Button
                  onClick={() =>
                    setCurrentMcqIndex((prev) => prev + 1)
                  }
                  rightIcon={<ArrowRight size={16} />}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  isLoading={loading}
                  onClick={finishMcq}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold border-none shadow-lg shadow-emerald-500/25"
                >
                  Finish MCQs and Proceed
                </Button>
              )}
            </div>
          </div>
        </PageWrapper>
      )}

      {/* ═══════════════════════════════════════
          3. MCQ TRANSITION SCREEN
          ═══════════════════════════════════════ */}
      {step === "mcq_transition" && evaluation && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6 select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-md w-full glass-strong rounded-3xl p-8 text-center space-y-6 shadow-2xl border border-blue-500/20"
          >
            <div className="w-16 h-16 bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/15">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase">
                MCQ Score: {evaluation.mcq_result.percentage}%
              </span>
              <h1 className="text-2xl font-black text-[var(--text-primary)] mt-3">
                MCQ Round Completed
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Now let's test your coding skills in an immersive full-screen
                IDE with{" "}
                <strong>{codingQuestions.length} tailored problems</strong>.
              </p>
            </div>

            <div className="glass p-4 rounded-2xl border border-[var(--border-primary)] text-left text-xs space-y-2">
              <p className="font-bold text-[var(--text-primary)]">
                Coding Assessment Rules:
              </p>
              <p className="text-[var(--text-secondary)]">
                · {codingQuestions.length} distinct problem statements matching
                your resume & weak skills.
              </p>
              <p className="text-[var(--text-secondary)]">
                · Editor starts 100% empty; write your code from scratch.
              </p>
              <p className="text-[var(--text-secondary)]">
                · Use Question Navigator to switch between questions freely.
              </p>
            </div>

            <button
              onClick={startCodingRound}
              className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              Start Coding Round <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          4. FULL-SCREEN CODING ROUND
          ═══════════════════════════════════════ */}
      {step === "coding" && currentCodingQuestion && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] text-[var(--text-primary)] w-screen h-screen overflow-hidden flex flex-col justify-between select-none">
          {/* Top Bar */}
          <div className="glass-strong border-b border-[var(--border-primary)] px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-blue-400" />
                <h1 className="text-sm font-black text-[var(--text-primary)]">
                  Coding Assessment
                </h1>
              </div>

              {/* Question Navigator */}
              <div className="flex items-center gap-1.5 ml-4">
                {codingQuestions.map((q, idx) => {
                  const qState = codingAnswers[q.id] || {
                    status: "not_started",
                  };
                  const isCurrent = idx === currentCodingIdx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentCodingIdx(idx)}
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition border ${
                        isCurrent
                          ? "border-blue-500 bg-blue-600 text-white shadow-md"
                          : qState.status === "passed"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : qState.status === "failed"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                          : qState.status === "attempted"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : "border-[var(--border-primary)] glass text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                      title={`Q${idx + 1}: ${q.title}`}
                    >
                      {qState.status === "passed" ? (
                        <Check size={12} />
                      ) : qState.status === "failed" ? (
                        <X size={12} />
                      ) : (
                        idx + 1
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer & Stats */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-[var(--text-muted)] flex items-center gap-1">
                Attempted:{" "}
                <b className="text-[var(--text-primary)]">
                  {attemptedCount}/{codingQuestions.length}
                </b>
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                Passed:{" "}
                <b className="text-[var(--text-primary)]">
                  {passedCount}/{codingQuestions.length}
                </b>
              </span>
              <span className="px-3 py-1 glass text-blue-400 border border-blue-500/20 rounded-xl font-mono flex items-center gap-1.5">
                <Clock size={13} /> {formatTime(timeRemaining)}
              </span>

              <Button
                size="sm"
                isLoading={loading}
                onClick={handleSubmitAssessment}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold border-none shadow-lg shadow-emerald-500/25"
              >
                Submit Assessment
              </Button>
            </div>
          </div>

          {/* IDE Workspace */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {/* Left: Problem Description */}
            <div className="p-6 overflow-y-auto border-r border-[var(--border-primary)] space-y-4 scrollbar-hide bg-[var(--bg-primary)]">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold uppercase">
                  Q{currentCodingIdx + 1}:{" "}
                  {currentCodingQuestion.difficulty} ·{" "}
                  {currentCodingQuestion.topic}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  ID: #{currentCodingQuestion.id}
                </span>
              </div>

              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {currentCodingQuestion.title}
              </h2>
              <p className="whitespace-pre-line text-xs text-[var(--text-secondary)] leading-relaxed">
                {currentCodingQuestion.description}
              </p>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-[var(--text-primary)]">
                  Constraints:
                </p>
                <ul className="list-disc pl-5 text-[var(--text-secondary)] space-y-1">
                  {currentCodingQuestion.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-[var(--text-primary)]">
                  Input Format:
                </p>
                <p className="text-[var(--text-secondary)] glass p-2.5 rounded-xl border border-[var(--border-primary)] font-mono">
                  {currentCodingQuestion.input_format}
                </p>

                <p className="font-bold text-[var(--text-primary)] mt-2">
                  Output Format:
                </p>
                <p className="text-[var(--text-secondary)] glass p-2.5 rounded-xl border border-[var(--border-primary)] font-mono">
                  {currentCodingQuestion.output_format}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-[var(--text-primary)]">
                  Sample Example:
                </p>
                <div className="glass p-3 rounded-xl border border-[var(--border-primary)] font-mono space-y-1">
                  <p className="text-[var(--text-secondary)]">
                    Input: {currentCodingQuestion.sample_input}
                  </p>
                  <p className="text-emerald-400">
                    Output: {currentCodingQuestion.sample_output}
                  </p>
                </div>
                <p className="text-[var(--text-secondary)] italic text-[11px] mt-1">
                  Explanation: {currentCodingQuestion.explanation}
                </p>
              </div>
            </div>

            {/* Right: Code Editor + Console */}
            <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
              {/* Editor Controls Bar */}
              <div className="p-3 glass-strong border-b border-[var(--border-primary)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Terminal size={16} className="text-blue-400" />
                  <select
                    value={currentCodingState.language}
                    onChange={(e) =>
                      handleLanguageChange(e.target.value)
                    }
                    className="glass text-xs font-bold text-[var(--text-primary)] border border-[var(--border-primary)] rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="python">Python 3</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="javascript">JavaScript</option>
                    <option value="c">C</option>
                  </select>

                  <button
                    onClick={handleClearCode}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <RotateCcw size={12} /> Clear Code
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={loading}
                    onClick={handleRunCode}
                    leftIcon={<Play size={12} />}
                  >
                    Run Code
                  </Button>
                  <Button
                    size="sm"
                    isLoading={loading}
                    onClick={handleSubmitQuestion}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black border-none"
                  >
                    Submit Question
                  </Button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 relative bg-[var(--bg-primary)] p-4">
                <textarea
                  value={currentCodingState.code}
                  onChange={(e) =>
                    updateCurrentQuestionState({ code: e.target.value })
                  }
                  spellCheck={false}
                  placeholder="// Code editor is 100% empty. Type your full solution here..."
                  className="w-full h-full bg-transparent font-mono text-xs text-[var(--text-primary)] focus:outline-none resize-none placeholder-[var(--text-muted)]"
                />
              </div>

              {/* Console & Test Results */}
              {currentCodingState.testResult && (
                <div className="h-40 glass-strong border-t border-[var(--border-primary)] p-4 overflow-y-auto shrink-0 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-primary)]">
                      Execution Output
                    </span>
                    <span className="font-bold text-emerald-400">
                      Score: {currentCodingState.testResult.score}% (
                      {currentCodingState.testResult.passed}/
                      {currentCodingState.testResult.total_test_cases} Passed)
                    </span>
                  </div>

                  <div className="text-xs font-mono glass p-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)]">
                    <p>
                      Execution Time:{" "}
                      {currentCodingState.testResult.average_execution_time}s
                    </p>
                    <p>
                      Memory Usage:{" "}
                      {currentCodingState.testResult.maximum_memory} KB
                    </p>
                    {currentCodingState.testResult.ai_review?.feedback?.map(
                      (fb, idx) => (
                        <p key={idx} className="text-blue-400 mt-1">
                          · {fb}
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="glass-strong border-t border-[var(--border-primary)] px-6 py-2 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={currentCodingIdx === 0}
              onClick={() =>
                setCurrentCodingIdx((prev) => prev - 1)
              }
              leftIcon={<ArrowLeft size={14} />}
            >
              Previous Problem
            </Button>

            <span className="text-xs font-bold text-[var(--text-muted)]">
              Problem {currentCodingIdx + 1} of {codingQuestions.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentCodingIdx + 1 >= codingQuestions.length}
              onClick={() =>
                setCurrentCodingIdx((prev) => prev + 1)
              }
              rightIcon={<ArrowRight size={14} />}
            >
              Next Problem
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          5. FINAL ASSESSMENT REPORT
          ═══════════════════════════════════════ */}
      {step === "report" && report && (
        <PageWrapper
          title="Final Placement Assessment Report"
          subtitle="Comprehensive performance evaluation across MCQ and 5 Coding Questions."
        >
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Hero Score Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                padding="lg"
                className="relative overflow-hidden text-center py-8 border border-emerald-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900" />
                <div className="relative">
                  <ScoreRing
                    score={report.overall_career_score}
                    size={110}
                    label="Overall Score"
                  />
                  <h2 className="text-2xl font-black text-[var(--text-primary)] mt-4">
                    Readiness: {report.interview_readiness}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-xl mx-auto">
                    {report.feedback}
                  </p>
                </div>
              </Card>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Breakdown Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="space-y-4">
                  <h3 className="font-black text-[var(--text-primary)] text-sm flex items-center gap-2">
                    <Zap size={16} className="text-blue-400" /> MCQ & Coding
                    Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="glass p-3 rounded-xl border border-blue-500/15">
                      <span className="text-[var(--text-muted)]">
                        MCQ Score:
                      </span>
                      <p className="text-xl font-bold text-blue-400 mt-1">
                        {evaluation?.mcq_result.percentage || 80}%
                      </p>
                    </div>
                    <div className="glass p-3 rounded-xl border border-emerald-500/15">
                      <span className="text-[var(--text-muted)]">
                        Coding Questions Passed:
                      </span>
                      <p className="text-xl font-bold text-emerald-400 mt-1">
                        {passedCount} / {codingQuestions.length || 5}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs pt-2">
                    <p className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Target size={13} /> Strong Topics:{" "}
                      {report.skill_analysis.strong_areas.join(", ") ||
                        "Emerging"}
                    </p>
                    <p className="text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} /> Weak Topics:{" "}
                      {report.skill_analysis.critical_weak_areas.join(", ") ||
                        "None"}
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* Roadmap Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="space-y-3">
                  <h3 className="font-black text-[var(--text-primary)] text-sm flex items-center gap-2">
                    <Trophy size={16} className="text-purple-400" />{" "}
                    Actionable Learning Roadmap
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {report.learning_roadmap.map((item) => (
                      <div
                        key={item.period}
                        className="glass rounded-xl p-3 border-l-2 border-blue-500/40"
                      >
                        <p className="font-bold text-[var(--text-primary)]">
                          {item.period}: {item.goal}
                        </p>
                        <p className="text-[var(--text-secondary)] mt-0.5">
                          {item.tasks.join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </PageWrapper>
      )}
    </div>
  );
}
