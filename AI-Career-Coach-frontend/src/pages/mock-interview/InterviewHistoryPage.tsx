import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { History, Calendar, Trash2, ArrowRight, Play } from "lucide-react";
import { mockInterviewAPI } from "../../api/endpoints";
import type { MockInterviewHistoryItem } from "../../types";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";

export default function InterviewHistoryPage() {
  const [history, setHistory] = useState<MockInterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mockInterviewAPI.getHistory();
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (_err) {
      toast.error("Failed to load interview history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this mock interview session?")) return;
    try {
      await mockInterviewAPI.delete(id);
      toast.success("Interview session deleted.");
      fetchHistory();
    } catch (_err) {
      toast.error("Failed to delete interview session.");
    }
  };

  return (
    <PageWrapper
      title="AI Mock Interview History"
      subtitle="Review past mock interview sessions, performance scores, and detailed evaluation reports."
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History size={20} className="text-blue-400" /> Past Sessions ({history.length})
          </h2>
          <Link to="/mock-interview">
            <Button size="sm" className="flex items-center gap-1.5">
              <Play size={14} /> Start New Interview
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading interview history...</p>
        ) : history.length === 0 ? (
          <Card className="text-center p-8">
            <p className="text-slate-400 mb-4">No previous mock interview sessions found.</p>
            <Link to="/mock-interview">
              <Button size="sm">Start Your First Interview</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <Card key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{item.target_role}</h3>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs font-semibold">
                      {item.interview_type}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">
                      {item.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(item.started_at).toLocaleDateString()}
                    </span>
                    <span>{item.question_count} Questions</span>
                    <span className={`font-semibold capitalize ${item.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  {item.overall_score !== null && (
                    <div className="text-center px-3 py-1 bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-400">Overall Score</p>
                      <p className="text-lg font-bold text-blue-400">{item.overall_score}%</p>
                    </div>
                  )}

                  <Link
                    to={item.status === 'completed' ? `/mock-interview/report/${item.id}` : `/mock-interview/room/${item.id}`}
                    className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-500/30"
                  >
                    {item.status === 'completed' ? "View Report" : "Resume Room"} <ArrowRight size={12} />
                  </Link>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Session"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
