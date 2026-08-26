import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FileText, Trash2, Clock, TrendingUp } from "lucide-react";
import { resumeAPI } from "../../api/endpoints";
import { IMAGES } from "../../config/images";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ScoreRing from "../../components/common/ScoreRing";
import EmptyState from "../../components/common/EmptyState";

export default function ResumeHistoryPage() {
  const client = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["resume-history"],
    queryFn: () => resumeAPI.getHistory().then((r) => r.data),
  });

  const remove = async (id: number) => {
    try {
      await resumeAPI.delete(id);
      await client.invalidateQueries({ queryKey: ["resume-history"] });
      toast.success("Resume deleted.");
    } catch {
      toast.error("Unable to delete resume.");
    }
  };

  return (
    <PageWrapper title="Resume History" subtitle="Review past uploads, compare ATS scores, and manage resume versions.">
      <div className="max-w-4xl mx-auto space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer rounded-2xl p-6 h-24" />
            ))}
          </div>
        ) : data?.resumes.length ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 rounded-xl border border-indigo-500/15">
                  <FileText size={20} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Uploaded Resumes</p>
                  <p className="text-xs text-[var(--text-muted)]">{data.resumes.length} version{data.resumes.length !== 1 ? "s" : ""} in history</p>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {data.resumes.map((item: any, idx: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card hoverEffect className="group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0">
                        <FileText size={22} className="text-indigo-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{item.original_filename}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {new Date(item.upload_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp size={11} /> ATS: <strong className="text-indigo-400">{item.ats_score}%</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <ScoreRing score={item.ats_score} size={44} strokeWidth={3} />
                        <Button size="xs" variant="ghost" onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-300">
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            image={IMAGES.empty.noData}
            title="No Resumes Uploaded Yet"
            description="Upload your first resume to start AI-powered analysis and ATS scoring."
            action={
              <Button variant="gradient" onClick={() => window.location.href = "/resume"}>
                Upload Resume
              </Button>
            }
          />
        )}
      </div>
    </PageWrapper>
  );
}
