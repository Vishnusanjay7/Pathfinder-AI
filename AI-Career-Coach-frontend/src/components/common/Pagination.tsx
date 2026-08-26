interface PaginationProps { page: number; total: number; pageSize: number; onChange: (page: number) => void; }
export default function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1) return null;
  return <div className="flex items-center justify-end gap-3 pt-4 text-sm"><button disabled={page === 1} onClick={() => onChange(page - 1)} className="disabled:opacity-40">Previous</button><span className="text-slate-500">{page} / {pages}</span><button disabled={page === pages} onClick={() => onChange(page + 1)} className="disabled:opacity-40">Next</button></div>;
}
