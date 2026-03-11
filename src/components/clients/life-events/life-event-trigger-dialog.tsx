"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap } from "lucide-react";
import type { LifeEventType } from "@/lib/hooks/use-life-events";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

// ============================================================================
// LIFE EVENT CONFIG
// ============================================================================

export const LIFE_EVENT_LABELS: Record<LifeEventType, string> = {
  income_change: "Income Change",
  new_child: "New Child",
  debt_change: "Debt Change",
  marriage: "Marriage",
  divorce: "Divorce",
};

export const LIFE_EVENT_DESCRIPTIONS: Record<LifeEventType, string> = {
  income_change: "Client's income has significantly increased or decreased",
  new_child: "Client has a new child or dependent",
  debt_change: "Client acquired or paid off significant debt",
  marriage: "Client got married",
  divorce: "Client went through a divorce",
};

// ============================================================================
// COMPONENT
// ============================================================================

interface LifeEventTriggerDialogProps {
  currentResult: InsuranceNeedsResult | null;
  isTriggeringEvent: boolean;
  onTrigger: (params: {
    lifeEvent: LifeEventType;
    notes?: string;
    currentResult: InsuranceNeedsResult;
  }) => Promise<unknown>;
}

export function LifeEventTriggerDialog({
  currentResult,
  isTriggeringEvent,
  onTrigger,
}: LifeEventTriggerDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LifeEventType | "">("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!selectedEvent || !currentResult) return;

    await onTrigger({
      lifeEvent: selectedEvent as LifeEventType,
      notes: notes.trim() || undefined,
      currentResult,
    });

    setOpen(false);
    setSelectedEvent("");
    setNotes("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedEvent("");
      setNotes("");
    }
    setOpen(next);
  };

  const isDisabled = !currentResult;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          title={
            isDisabled
              ? "Generate an insurance estimate first"
              : "Record a life event to trigger recalculation"
          }
        >
          <Zap className="mr-2 h-4 w-4" />
          Record Life Event
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Life Event</DialogTitle>
          <DialogDescription>
            Record a major life event to capture a before/after snapshot of this
            client&apos;s insurance needs estimate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="life-event-type">Life Event</Label>
            <Select
              value={selectedEvent}
              onValueChange={(v) => setSelectedEvent(v as LifeEventType)}
            >
              <SelectTrigger id="life-event-type">
                <SelectValue placeholder="Select a life event…" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LIFE_EVENT_LABELS) as LifeEventType[]).map(
                  (type) => (
                    <SelectItem key={type} value={type}>
                      <span className="font-medium">
                        {LIFE_EVENT_LABELS[type]}
                      </span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        — {LIFE_EVENT_DESCRIPTIONS[type]}
                      </span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="life-event-notes">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="life-event-notes"
              placeholder="Add context about this life event…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <p className="text-muted-foreground text-xs">
              {notes.length}/1000 characters
            </p>
          </div>

          <p className="text-muted-foreground text-sm">
            The current estimate will be captured as the <strong>before</strong>{" "}
            snapshot. A fresh calculation will be run as the{" "}
            <strong>after</strong> snapshot.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isTriggeringEvent}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEvent || isTriggeringEvent}
          >
            {isTriggeringEvent ? "Recording…" : "Record Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
