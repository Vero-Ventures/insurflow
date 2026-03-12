"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
import type { LifeEvent } from "@/lib/hooks/use-life-events";
import { LIFE_EVENT_LABELS } from "./life-event-trigger-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function getDelta(before: number, after: number) {
  const delta = after - before;
  return { delta, percent: before === 0 ? 0 : (delta / before) * 100 };
}

function DeltaBadge({ before, after }: { before: number; after: number }) {
  const { delta, percent } = getDelta(before, after);

  if (Math.abs(delta) < 1) {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-sm">
        <Minus className="h-3.5 w-3.5" />
        No change
      </span>
    );
  }

  const isIncrease = delta > 0;
  return (
    <span
      className={`flex items-center gap-1 text-sm font-medium ${isIncrease ? "text-destructive" : "text-green-600"}`}
    >
      {isIncrease ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      {isIncrease ? "+" : ""}
      {formatCurrency(delta)} ({percent >= 0 ? "+" : ""}
      {percent.toFixed(1)}%)
    </span>
  );
}

// ============================================================================
// SINGLE EVENT COMPARISON CARD
// ============================================================================

interface LifeEventComparisonCardProps {
  event: LifeEvent;
  /** Callback to re-trigger recalculation for this event type */
  onRecalculate?: (event: LifeEvent) => void;
  /** Whether a recalculation is currently in progress */
  isRecalculating?: boolean;
  /** Callback to delete this life event record */
  onDelete?: (event: LifeEvent) => void;
  /** Whether a deletion is currently in progress */
  isDeleting?: boolean;
}

export function LifeEventComparisonCard({
  event,
  onRecalculate,
  isRecalculating,
  onDelete,
  isDeleting,
}: LifeEventComparisonCardProps) {
  const { beforeSnapshot: before, afterSnapshot: after } = event;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {LIFE_EVENT_LABELS[event.lifeEvent]}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRecalculate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRecalculate(event)}
                disabled={isRecalculating}
                title="Recalculate with current client data"
              >
                <RefreshCw
                  className={`mr-1 h-3.5 w-3.5 ${
                    isRecalculating ? "animate-spin" : ""
                  }`}
                />
                Recalculate
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(event)}
                disabled={isDeleting}
                title="Delete this life event record"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            <span className="text-muted-foreground text-xs">
              {formatDateTime(event.triggeredAt)}
            </span>
          </div>
        </div>
        {event.notes && (
          <p className="text-muted-foreground text-sm">{event.notes}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Total needs row */}
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            Total Insurance Needs
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-sm">
              {formatCurrency(before.totalInsuranceNeeds)}
            </Badge>
            <ArrowRight className="text-muted-foreground h-4 w-4" />
            <Badge variant="outline" className="font-mono text-sm">
              {formatCurrency(after.totalInsuranceNeeds)}
            </Badge>
            <DeltaBadge
              before={before.totalInsuranceNeeds}
              after={after.totalInsuranceNeeds}
            />
          </div>
        </div>

        {/* Breakdown grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {[
            {
              label: "Income Replacement",
              b: before.incomeReplacementNeeds,
              a: after.incomeReplacementNeeds,
            },
            {
              label: "Debt Payoff",
              b: before.debtPayoffNeeds,
              a: after.debtPayoffNeeds,
            },
            {
              label: "Estate Buffer",
              b: before.estateBufferNeeds,
              a: after.estateBufferNeeds,
            },
            {
              label: "Existing Coverage",
              b: before.existingCoverage,
              a: after.existingCoverage,
            },
            {
              label: "Liquid Assets",
              b: before.liquidAssets,
              a: after.liquidAssets,
            },
          ].map(({ label, b, a }) => (
            <div key={label}>
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="font-mono">
                {formatCurrency(b)}{" "}
                <span className="text-muted-foreground">→</span>{" "}
                {formatCurrency(a)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
