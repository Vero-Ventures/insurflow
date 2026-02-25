"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import type { CalculationTrace, TraceItem } from "@/types/calculation-trace";

interface CalculationTraceViewerProps {
  trace: CalculationTrace;
  className?: string;
}

function formatTraceValue(item: TraceItem): string {
  if (item.value === null) return "Not provided";
  if (typeof item.value === "string") return item.value;

  switch (item.unit) {
    case "currency":
      return formatCurrency(item.value);
    case "percent":
      return `${item.value}%`;
    case "years":
      return `${item.value} ${item.value === 1 ? "year" : "years"}`;
    case "ratio":
      return item.value.toFixed(4).replace(/\.?0+$/, "");
    default:
      return String(item.value);
  }
}

function kindLabel(kind: TraceItem["kind"]): string {
  switch (kind) {
    case "input":
      return "Input";
    case "assumption":
      return "Assumption";
    case "intermediate":
      return "Intermediate";
    case "result":
      return "Result";
  }
}

export function CalculationTraceViewer({
  trace,
  className,
}: CalculationTraceViewerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Show your work</h4>
          <p className="text-muted-foreground text-xs">
            Structured calculation trace (v{trace.version})
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {trace.sections.map((section) => (
          <details
            key={section.key}
            className="bg-muted/20 border-border/60 rounded-lg border"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium">{section.label}</p>
                <p className="text-muted-foreground text-xs">{section.key}</p>
              </div>
              {typeof section.result === "number" && (
                <Badge variant="outline" className="font-mono text-xs">
                  {formatCurrency(section.result)}
                </Badge>
              )}
            </summary>

            <div className="space-y-3 border-t p-3">
              {section.notes && section.notes.length > 0 && (
                <div className="bg-muted/40 rounded-md border p-2">
                  <p className="text-xs font-medium">Notes</p>
                  <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5 text-xs">
                    {section.notes.map((note, index) => (
                      <li key={`${section.key}-note-${index}`}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={`${section.key}.${item.key}`}
                    className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.label}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {kindLabel(item.kind)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {item.key}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {formatTraceValue(item)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
