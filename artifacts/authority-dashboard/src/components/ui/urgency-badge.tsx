import { Badge } from "@/components/ui/badge";

interface UrgencyBadgeProps {
  score: number;
}

export function UrgencyBadge({ score }: UrgencyBadgeProps) {
  let label = "";
  let colorClass = "";

  if (score >= 9) {
    label = "CRITICAL";
    colorClass = "bg-destructive/10 text-destructive border-destructive/30";
  } else if (score >= 7) {
    label = "HIGH";
    colorClass = "bg-orange-100 text-orange-700 border-orange-300";
  } else if (score >= 5) {
    label = "MEDIUM";
    colorClass = "bg-amber-100 text-amber-700 border-amber-300";
  } else if (score >= 3) {
    label = "LOW";
    colorClass = "bg-secondary/70 text-secondary-foreground border-secondary";
  } else {
    label = "MONITORING";
    colorClass = "bg-muted text-muted-foreground border-border";
  }

  return (
    <Badge variant="outline" className={`${colorClass} font-semibold`} data-testid={`badge-urgency-${score}`}>
      <span className="font-mono mr-1">{score}</span> {label}
    </Badge>
  );
}
