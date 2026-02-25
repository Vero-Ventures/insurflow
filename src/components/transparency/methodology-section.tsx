"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, BookOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MethodologyData } from "@/lib/transparency/methodology-data";
import { SourceCitationBadge } from "./source-citation";
import { CalculationBreakdown } from "./calculation-breakdown";

interface MethodologySectionProps {
  methodology: MethodologyData;
  /** Actual values to show alongside each step (optional) */
  stepValues?: Record<number, { value: string }>;
  /** Default open state */
  defaultOpen?: boolean;
}

export function MethodologySection({
  methodology,
  stepValues,
  defaultOpen = false,
}: MethodologySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/60">
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-sm font-medium">
                  How we calculated this
                </CardTitle>
              </div>
              <ChevronDown
                className={cn(
                  "text-muted-foreground h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Summary */}
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {methodology.summary}
              </p>
            </div>

            {/* Step-by-step breakdown */}
            <CalculationBreakdown
              steps={methodology.steps}
              stepValues={stepValues}
            />

            {/* Assumptions */}
            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-medium">
                <Info className="h-3.5 w-3.5" />
                Assumptions
              </h4>
              <ul className="space-y-1">
                {methodology.assumptions.map((assumption, i) => (
                  <li
                    key={i}
                    className="text-muted-foreground flex items-start gap-2 text-sm"
                  >
                    <span className="text-muted-foreground/50 mt-1 block h-1 w-1 flex-shrink-0 rounded-full bg-current" />
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sources */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sources</h4>
              <div className="flex flex-wrap gap-2">
                {methodology.sources.map((source) => (
                  <SourceCitationBadge key={source.url} source={source} />
                ))}
              </div>
            </div>

            {/* Last reviewed */}
            <div className="border-border/40 border-t pt-3">
              <p className="text-muted-foreground text-xs">
                Methodology last reviewed:{" "}
                <span className="font-medium">
                  {new Date(methodology.lastReviewedDate).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    },
                  )}
                </span>
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
