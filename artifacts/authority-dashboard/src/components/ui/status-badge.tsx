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
      colorClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      break;
    case 'under_review':
      label = "পর্যালোচনাধীন";
      colorClass = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      break;
    case 'in_progress':
      label = "কাজ চলছে";
      colorClass = "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
      break;
    case 'resolved':
      label = "সমাধান হয়েছে";
      colorClass = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      break;
    case 'rejected':
      label = "প্রত্যাখ্যাত";
      colorClass = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      break;
    default:
      label = status;
      colorClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }

  return (
    <Badge variant="outline" className={`${colorClass} font-medium`} data-testid={`badge-status-${status}`}>
      {label}
    </Badge>
  );
}
