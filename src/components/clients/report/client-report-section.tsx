import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClientReportSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  icon?: ReactNode;
  contentClassName?: string;
}

export function ClientReportSection({
  title,
  description,
  children,
  icon,
  contentClassName,
}: ClientReportSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm print:border-gray-300 print:shadow-none">
      <CardHeader className="pb-4 print:pb-2">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              {icon}
            </div>
          ) : null}
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
