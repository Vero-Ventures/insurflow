import { Badge } from "@/components/ui/badge";

/** Maps application status to badge variant and label */
const STATUS_CONFIG: Record<
  string,
  {
    variant: "success" | "warning" | "destructive" | "secondary";
    label: string;
  }
> = {
  draft: { variant: "secondary", label: "Draft" },
  submitted: { variant: "secondary", label: "Submitted" },
  received: { variant: "success", label: "Received" },
  in_review: { variant: "warning", label: "In Review" },
  additional_info_requested: { variant: "warning", label: "Info Needed" },
  approved: { variant: "success", label: "Approved" },
  declined: { variant: "destructive", label: "Declined" },
};

interface ApplicationStatusBadgeProps {
  status: string;
}

/**
 * Badge component for displaying application status.
 * Used on dashboard and status pages.
 */
export function ApplicationStatusBadge({
  status,
}: ApplicationStatusBadgeProps) {
  const { variant, label } = STATUS_CONFIG[status] ?? {
    variant: "secondary" as const,
    label: status,
  };

  return <Badge variant={variant}>{label}</Badge>;
}
