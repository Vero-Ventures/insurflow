import { formatDateTime } from "@/lib/client-utils";

interface ClientReportFooterProps {
  clientId: string;
  updatedAt: string;
}

export function ClientReportFooter({
  clientId,
  updatedAt,
}: ClientReportFooterProps) {
  return (
    <div className="border-border/60 text-muted-foreground border-t pt-6 text-sm print:pt-2">
      <p className="leading-relaxed">
        This report is generated for informational purposes only and should not
        be considered financial advice. Please consult with a licensed insurance
        professional for personalized recommendations.
      </p>
      <p className="mt-3 font-mono text-xs">
        Report ID: {clientId} | Last Updated: {formatDateTime(updatedAt)}
      </p>
    </div>
  );
}
