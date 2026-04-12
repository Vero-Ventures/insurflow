import { formatCurrency } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SettlingRequirementsMetricBoxProps {
  icon: LucideIcon;
  iconBgClass: string;
  iconClass: string;
  label: string;
  value: number;
  description: string;
  children?: React.ReactNode;
}

export function SettlingRequirementsMetricBox({
  icon: Icon,
  iconBgClass,
  iconClass,
  label,
  value,
  description,
  children,
}: SettlingRequirementsMetricBoxProps) {
  return (
    <div className="bg-muted/30 rounded-xl border p-4">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            iconBgClass,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", iconClass)} />
        </div>
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
      </div>
      <p className="font-currency text-lg font-semibold">
        {formatCurrency(value)}
      </p>
      {children || (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      )}
    </div>
  );
}
