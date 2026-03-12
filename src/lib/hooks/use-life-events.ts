"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

// ============================================================================
// TYPES
// ============================================================================

export type LifeEventType =
  | "income_change"
  | "new_child"
  | "debt_change"
  | "marriage"
  | "divorce";

export interface InsuranceNeedsSnapshot {
  incomeReplacementNeeds: number;
  debtPayoffNeeds: number;
  estateBufferNeeds: number;
  grossNeeds: number;
  existingCoverage: number;
  liquidAssets: number;
  totalInsuranceNeeds: number;
}

export interface LifeEvent {
  id: string;
  clientId: string;
  userId: string;
  lifeEvent: LifeEventType;
  notes: string | null;
  triggeredAt: string;
  beforeSnapshot: InsuranceNeedsSnapshot;
  afterSnapshot: InsuranceNeedsSnapshot;
  createdAt: string;
}

export interface UseLifeEventsOptions {
  clientId: string;
  enabled?: boolean;
}

export interface UseLifeEventsReturn {
  events: LifeEvent[];
  isLoading: boolean;
  isTriggeringEvent: boolean;
  isRecalculating: boolean;
  isDeleting: boolean;
  error: string | null;
  triggerLifeEvent: (params: {
    lifeEvent: LifeEventType;
    notes?: string;
    currentResult: InsuranceNeedsResult;
  }) => Promise<LifeEvent | null>;
  /** Re-run calculation for an existing event, updating it in place */
  recalculateEvent: (params: {
    eventId: string;
    currentResult: InsuranceNeedsResult;
  }) => Promise<LifeEvent | null>;
  /** Delete a life event record */
  deleteEvent: (eventId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

// ============================================================================
// HELPERS
// ============================================================================

function toSnapshot(result: InsuranceNeedsResult): InsuranceNeedsSnapshot {
  return {
    incomeReplacementNeeds: result.incomeReplacementNeeds,
    debtPayoffNeeds: result.debtPayoffNeeds,
    estateBufferNeeds: result.estateBufferNeeds,
    grossNeeds: result.grossNeeds,
    existingCoverage: result.existingCoverage,
    liquidAssets: result.liquidAssets,
    totalInsuranceNeeds: result.totalInsuranceNeeds,
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to manage life event recalculations for a client.
 *
 * Fetches all life event history and provides a trigger function that:
 * 1. Takes the current insurance needs result as the "before" snapshot
 * 2. POSTs to the API which computes the fresh "after" snapshot server-side
 * 3. Returns and refreshes the event list
 */
export function useLifeEvents(
  options: UseLifeEventsOptions,
): UseLifeEventsReturn {
  const { clientId, enabled = true } = options;

  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggeringEvent, setIsTriggeringEvent] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!clientId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/life-events`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Failed to fetch life events",
        );
      }

      const data = (await response.json()) as { events: LifeEvent[] };
      setEvents(data.events ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch life events";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, enabled]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const triggerLifeEvent = useCallback(
    async (params: {
      lifeEvent: LifeEventType;
      notes?: string;
      currentResult: InsuranceNeedsResult;
    }): Promise<LifeEvent | null> => {
      setIsTriggeringEvent(true);

      try {
        const response = await fetch(`/api/clients/${clientId}/life-events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            lifeEvent: params.lifeEvent,
            notes: params.notes,
            beforeSnapshot: toSnapshot(params.currentResult),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? "Failed to record life event",
          );
        }

        const data = (await response.json()) as { event: LifeEvent };
        setEvents((prev) => [data.event, ...prev]);
        toast.success("Life event recorded");
        return data.event;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to record life event";
        toast.error(message);
        return null;
      } finally {
        setIsTriggeringEvent(false);
      }
    },
    [clientId],
  );

  const recalculateEvent = useCallback(
    async (params: {
      eventId: string;
      currentResult: InsuranceNeedsResult;
    }): Promise<LifeEvent | null> => {
      setIsRecalculating(true);

      try {
        const response = await fetch(`/api/clients/${clientId}/life-events`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            eventId: params.eventId,
            beforeSnapshot: toSnapshot(params.currentResult),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? "Failed to recalculate",
          );
        }

        const data = (await response.json()) as { event: LifeEvent };
        // Replace the event in the list in-place
        setEvents((prev) =>
          prev.map((e) => (e.id === data.event.id ? data.event : e)),
        );
        toast.success("Recalculation updated");
        return data.event;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to recalculate";
        toast.error(message);
        return null;
      } finally {
        setIsRecalculating(false);
      }
    },
    [clientId],
  );

  const deleteEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      setIsDeleting(true);

      try {
        const response = await fetch(`/api/clients/${clientId}/life-events`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ eventId }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? "Failed to delete life event",
          );
        }

        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        toast.success("Life event deleted");
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete life event";
        toast.error(message);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [clientId],
  );

  return {
    events,
    isLoading,
    isTriggeringEvent,
    isRecalculating,
    isDeleting,
    error,
    triggerLifeEvent,
    recalculateEvent,
    deleteEvent,
    refresh: fetchEvents,
  };
}
