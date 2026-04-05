import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientReportPdfTriggerProps {
  isDownloading: boolean;
  onDownload: () => void;
  label: string;
  loadingLabel: string;
  icon?: ReactNode;
}

export function ClientReportPdfTrigger({
  isDownloading,
  onDownload,
  label,
  loadingLabel,
  icon,
}: ClientReportPdfTriggerProps) {
  return (
    <Button
      onClick={onDownload}
      disabled={isDownloading}
      variant="secondary"
      className="border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
    >
      {icon ?? <Download className="mr-2 h-4 w-4" />}
      {isDownloading ? loadingLabel : label}
    </Button>
  );
}
