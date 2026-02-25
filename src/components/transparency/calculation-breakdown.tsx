"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MethodologyStep } from "@/lib/transparency/methodology-data";

interface CalculationBreakdownProps {
  steps: MethodologyStep[];
  /** Actual calculated values to display next to each step */
  stepValues?: Record<number, { label: string; value: string }>;
}

export function CalculationBreakdown({
  steps,
  stepValues,
}: CalculationBreakdownProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Step-by-Step Breakdown</h4>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const actualValue = stepValues?.[step.step];
          const isLast = i === steps.length - 1;

          return (
            <div key={step.step} className="flex gap-3">
              {/* Step indicator line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isLast
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.step}
                </div>
                {!isLast && <div className="bg-border my-1 w-px flex-1" />}
              </div>

              {/* Step content */}
              <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-sm leading-6 font-medium">
                    {step.title}
                  </h5>
                  {actualValue && (
                    <Badge
                      variant="outline"
                      className="flex-shrink-0 font-mono text-xs"
                    >
                      {actualValue.value}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {step.description}
                </p>
                {step.formula && (
                  <code className="bg-muted text-muted-foreground mt-1.5 inline-block rounded px-2 py-1 font-mono text-xs">
                    {step.formula}
                  </code>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
