import type { ReactNode } from "react";
import { Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Client } from "@/types/client";
import { formatDateTime } from "@/lib/client-utils";
import { Card } from "@/components/ui/card";

interface ClientReportHeaderProps {
  client: Client;
  isDemo: boolean;
  generatedAt: string;
  showPdfTrigger?: boolean;
  pdfTrigger?: ReactNode;
  complianceTrigger?: ReactNode;
}

export function ClientReportHeader({
  client,
  isDemo,
  generatedAt,
  showPdfTrigger,
  pdfTrigger,
  complianceTrigger,
}: ClientReportHeaderProps) {
  const initials =
    `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase();

  return (
    <Card className="border-border/60 overflow-hidden py-0 shadow-sm print:border-gray-300 print:shadow-none">
      <div className="relative bg-[oklch(0.35_0.08_250)] px-6 py-6 print:bg-gray-100">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/5 blur-xl" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-xl font-semibold text-white backdrop-blur-sm">
              {initials}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white print:text-xl print:text-gray-900">
                  {client.firstName} {client.lastName}
                </h2>
                {isDemo ? (
                  <Badge
                    variant="secondary"
                    className="border-white/20 bg-white/10 text-white"
                  >
                    Demo
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70 print:text-gray-600">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Financial Needs Analysis
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(generatedAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            {showPdfTrigger ? pdfTrigger : null}
            {complianceTrigger}
          </div>
        </div>
      </div>
    </Card>
  );
}
