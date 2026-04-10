import { Badge } from "@/components/ui/badge";

interface UrgencyBadgeProps {
  score: number;
}

export function UrgencyBadge({ score }: UrgencyBadgeProps) {
  let label = "";
  let colorClass = "";

  if (score >= 9) {
    label = "CRITICAL";
    colorClass = "bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20 dark:text-red-400 dark:border-red-400/20";
  } else if (score >= 7) {
    label = "HIGH";
    colorClass = "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-500/20 dark:text-orange-400 dark:border-orange-400/20";
  } else if (score >= 5) {
    label = "MEDIUM";
    colorClass = "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/20";
  } else if (score >= 3) {
    label = "LOW";
    colorClass = "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20 dark:text-blue-400 dark:border-blue-400/20";
  } else {
    label = "MONITORING";
    colorClass = "bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 border-slate-500/20 dark:text-slate-400 dark:border-slate-400/20";
  }

  return (
    <Badge variant="outline" className={`${colorClass} font-semibold`} data-testid={`badge-urgency-${score}`}>
      <span className="font-mono mr-1">{score}</span> {label}
    </Badge>
  );
}
