import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let label = "";
  let colorClass = "";

  switch (status) {
    case 'submitted':
      label = "জমা দেওয়া হয়েছে";
      colorClass = "bg-secondary/60 text-secondary-foreground border-secondary";
      break;
    case 'under_review':
      label = "পর্যালোচনাধীন";
      colorClass = "bg-amber-100 text-amber-800 border-amber-300";
      break;
    case 'in_progress':
      label = "কাজ চলছে";
      colorClass = "bg-orange-100 text-orange-800 border-orange-300";
      break;
    case 'resolved':
      label = "সমাধান হয়েছে";
      colorClass = "bg-primary/15 text-primary border-primary/30";
      break;
    case 'rejected':
      label = "প্রত্যাখ্যাত";
      colorClass = "bg-destructive/10 text-destructive border-destructive/30";
      break;
    default:
      label = status;
      colorClass = "bg-muted text-muted-foreground border-border";
  }

  return (
    <Badge variant="outline" className={`${colorClass} font-medium`} data-testid={`badge-status-${status}`}>
      {label}
    </Badge>
  );
}
