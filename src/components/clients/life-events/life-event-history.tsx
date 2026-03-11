"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import type { LifeEvent } from "@/lib/hooks/use-life-events";
import { LifeEventComparisonCard } from "./life-event-comparison-card";

// ============================================================================
// COMPONENT
// ============================================================================

interface LifeEventHistoryProps {
  events: LifeEvent[];
  isLoading: boolean;
  error: string | null;
}

export function LifeEventHistory({
  events,
  isLoading,
  error,
}: LifeEventHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load life event history.
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
        <History className="h-8 w-8 opacity-40" />
        <p className="text-sm">No life events recorded yet.</p>
        <p className="text-xs">
          Use <strong>Record Life Event</strong> to capture before/after
          estimate comparisons for major client milestones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <LifeEventComparisonCard key={event.id} event={event} />
      ))}
    </div>
  );
}
