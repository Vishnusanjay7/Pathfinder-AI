import { useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Terminal,
  Play,
  Code,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { codingAPI } from "../../api/endpoints";
import type { CodingSubmitResponse } from "../../types";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";

export default function CodingPage() {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CodingSubmitResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const runSubmit = async (submit: boolean) => {
    if (!code.trim()) return toast.error("Write some code before running.");
    setLoading(true);
    try {
      const res = submit
        ? await codingAPI.submit({
            assessment_id: 1,
            question_id: 1,
            language,
            source_code: code,
          })
        : await codingAPI.run({
            assessment_id: 1,
            question_id: 1,
            language,
            source_code: code,
          });
      setResult(res.data);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      toast.error(
        status === 503
          ? "⚠ Code execution service is temporarily unavailable. Please try again later."
          : "Code execution failed. Please review your code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Coding Assessment"
      subtitle="Solve the programming challenge below. Run against visible tests, then submit to check hidden cases."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor Card */}
        <Card padding="none" hoverEffect>
          {/* Controls Bar */}
          <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Code size={16} />
              </div>
              <div>
                <p className="text-xs uppercase text-blue-400 font-bold">
                  Problem
                </p>
                <h3 className="text-sm font-black text-[var(--text-primary)]">
                  Coding Challenge
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="glass rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] border border-[var(--border-primary)] focus:outline-none focus:border-blue-500/50"
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="javascript">JavaScript</option>
                <option value="c">C</option>
              </select>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={loading}
                  onClick={() => runSubmit(false)}
                  leftIcon={<Play size={12} />}
                >
                  Run code
                </Button>
                <Button
                  size="sm"
                  isLoading={loading}
                  onClick={() => runSubmit(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black border-none shadow-lg shadow-emerald-500/20"
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="p-4">
            <p className="mt-1 mb-3 text-sm text-[var(--text-secondary)]">
              Select a programming challenge from your assessment to begin. Use
              the code editor to write your solution.
            </p>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              placeholder="Write your solution here..."
              className="min-h-96 w-full rounded-xl glass border border-[var(--border-primary)] p-4 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 resize-none"
            />
          </div>
        </Card>

        {/* Results Card */}
        <Card padding="lg" hoverEffect>
          <div className="flex items-center gap-2 mb-4">
            <Terminal
              size={18}
              className={
                result
                  ? "text-emerald-400"
                  : "text-[var(--text-muted)]"
              }
            />
            <h2 className="font-black text-[var(--text-primary)] text-sm">
              Execution Result
            </h2>
          </div>

          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`text-4xl font-black ${
                    result.score >= 70
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {result.score}%
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Passed{" "}
                    <span className="text-emerald-400 font-bold">
                      {result.passed}
                    </span>
                    , failed{" "}
                    <span className="text-rose-400 font-bold">
                      {result.failed}
                    </span>{" "}
                    of {result.total_test_cases}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass p-3 rounded-xl border border-[var(--border-primary)]">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                    <Clock size={12} /> Execution time
                  </div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {result.average_execution_time}s
                  </p>
                </div>
                <div className="glass p-3 rounded-xl border border-[var(--border-primary)]">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                    <Cpu size={12} /> Memory
                  </div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {result.maximum_memory} KB
                  </p>
                </div>
              </div>

              {result.ai_review && (
                <div className="glass p-4 rounded-xl border border-blue-500/15">
                  <p className="font-black text-[var(--text-primary)] text-sm flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-400" /> AI
                    Code Review
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      Time complexity:{" "}
                      <b className="text-blue-400">
                        {result.ai_review.time_complexity}
                      </b>
                    </p>
                    <p>
                      Space complexity:{" "}
                      <b className="text-blue-400">
                        {result.ai_review.space_complexity}
                      </b>
                    </p>
                    {result.ai_review.optimization_suggestions?.map(
                      (s, i) => (
                        <p
                          key={i}
                          className="mt-2 border-t border-[var(--border-primary)] pt-2 text-sm text-[var(--text-secondary)]"
                        >
                          {s}
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--text-muted)] mb-4">
                <Terminal size={28} />
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Run code to see test results and AI feedback.
              </p>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
