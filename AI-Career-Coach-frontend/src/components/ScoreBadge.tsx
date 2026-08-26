interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

function getColor(score: number) {
  if (score >= 80) return "text-green-400 bg-green-400/10 border-green-400/30";
  if (score >= 60) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  return "text-red-400 bg-red-400/10 border-red-400/30";
}

const sizes = {
  sm: "text-sm px-2 py-1",
  md: "text-base px-3 py-1.5",
  lg: "text-2xl px-4 py-2 font-bold",
};

export default function ScoreBadge({ score, label, size = "md" }: ScoreBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold ${getColor(score)} ${sizes[size]}`}>
      <span>{score}</span>
      {label && <span className="text-xs font-normal opacity-70">{label}</span>}
    </div>
  );
}
