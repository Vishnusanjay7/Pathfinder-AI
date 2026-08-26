import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Search, Trash2, Code, FileCode } from "lucide-react";
import { codingAPI } from "../../api/endpoints";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/common/Card";
import Pagination from "../../components/common/Pagination";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";

export default function CodingHistoryPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data = [], isLoading } = useQuery({
    queryKey: ["coding-history"],
    queryFn: () => codingAPI.getHistory().then((r) => r.data),
  });

  const filtered = useMemo(
    () =>
      data.filter((item) =>
        item.language.toLowerCase().includes(search.toLowerCase())
      ),
    [data, search]
  );

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const remove = async (id: number) => {
    try {
      await codingAPI.delete(id);
      await client.invalidateQueries({ queryKey: ["coding-history"] });
      toast.success("Submission deleted.");
    } catch {
      toast.error("Unable to delete submission.");
    }
  };

  return (
    <PageWrapper
      title="Coding History"
      subtitle="Review your submitted coding assessments."
    >
      <Card padding="none" hoverEffect>
        {/* Search Header */}
        <div className="border-b border-[var(--border-primary)] p-4 flex items-center gap-3">
          <Search size={16} className="text-[var(--text-muted)] shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            placeholder="Search by language..."
          />
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              Loading submissions...
            </p>
          </div>
        ) : visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="p-4 font-bold">Language</th>
                  <th className="p-4 font-bold">Score</th>
                  <th className="p-4 font-bold">Passed</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {visible.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-t border-[var(--border-primary)] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 capitalize font-medium text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <FileCode
                          size={14}
                          className="text-blue-400"
                        />
                        {item.language}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-bold ${
                          item.score >= 70
                            ? "text-emerald-400"
                            : item.score >= 40
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {item.score}%
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)]">
                      {item.passed}
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => remove(item.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Code size={36} />}
            title="No Coding Submissions Found"
            description={
              search
                ? `No submissions match "${search}". Try a different search.`
                : "Start coding to see your submission history here."
            }
          />
        )}

        <div className="px-4 border-t border-[var(--border-primary)]">
          <Pagination
            page={page}
            total={filtered.length}
            pageSize={pageSize}
            onChange={setPage}
          />
        </div>
      </Card>
    </PageWrapper>
  );
}
