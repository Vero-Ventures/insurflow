/**
 * Application Timeline Component
 *
 * Displays a vertical timeline of application status events.
 * Each event shows status, source, timestamp, and optional metadata.
 */

import {
  Check,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/server/db/schemas/applications-schema";

export interface TimelineEvent {
  id: string;
  status: ApplicationStatus;
  source: string;
  occurredAt: Date;
  metadata: Record<string, unknown> | null;
}

interface ApplicationTimelineProps {
  events: TimelineEvent[];
  currentStatus: ApplicationStatus;
  className?: string;
}

/** Maps application status to display configuration */
const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    label: string;
    description: string;
    icon: typeof Check;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  draft: {
    label: "Draft Started",
    description: "Application draft created",
    icon: FileText,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
    borderClass: "border-muted-foreground/30",
  },
  submitted: {
    label: "Submitted",
    description: "Application sent to carrier",
    icon: Check,
    colorClass: "text-primary",
    bgClass: "bg-primary",
    borderClass: "border-primary",
  },
  received: {
    label: "Received",
    description: "Carrier acknowledged receipt",
    icon: CheckCircle2,
    colorClass: "text-emerald",
    bgClass: "bg-emerald",
    borderClass: "border-emerald",
  },
  in_review: {
    label: "In Review",
    description: "Underwriting in progress",
    icon: Loader2,
    colorClass: "text-primary",
    bgClass: "bg-primary",
    borderClass: "border-primary",
  },
  additional_info_requested: {
    label: "Info Requested",
    description: "Carrier needs additional information",
    icon: AlertCircle,
    colorClass: "text-warning",
    bgClass: "bg-warning",
    borderClass: "border-warning",
  },
  approved: {
    label: "Approved",
    description: "Application approved",
    icon: CheckCircle2,
    colorClass: "text-emerald",
    bgClass: "bg-emerald",
    borderClass: "border-emerald",
  },
  declined: {
    label: "Declined",
    description: "Application declined",
    icon: XCircle,
    colorClass: "text-destructive",
    bgClass: "bg-destructive",
    borderClass: "border-destructive",
  },
};

/** Maps event source to readable label */
const SOURCE_LABELS: Record<string, string> = {
  consumer: "You",
  provider: "Carrier",
  system: "System",
  webhook: "Carrier update",
};

/** Maps event source to badge styling */
const SOURCE_STYLE_CONFIG: Record<string, string> = {
  consumer: "bg-primary/10 text-primary",
  provider: "bg-emerald/10 text-emerald",
  webhook: "bg-emerald/10 text-emerald",
  system: "bg-muted text-muted-foreground",
};

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TimelineEventItem({
  event,
  isLast,
  isCurrent,
}: {
  event: TimelineEvent;
  isLast: boolean;
  isCurrent: boolean;
}) {
  const config = STATUS_CONFIG[event.status];
  const Icon = config.icon;
  const sourceLabel = SOURCE_LABELS[event.source] ?? event.source;

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div
          className={cn(
            "absolute top-10 left-4 h-full w-0.5 -translate-x-1/2",
            isCurrent ? "bg-border" : config.bgClass,
          )}
          aria-hidden="true"
        />
      )}

      {/* Status icon */}
      <div
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
          isCurrent && event.status === "in_review" ? "animate-pulse" : "",
          config.borderClass,
          isCurrent ? "bg-background" : config.bgClass,
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            isCurrent ? config.colorClass : "text-white",
            event.status === "in_review" && isCurrent && "animate-spin",
          )}
          aria-hidden="true"
        />
      </div>

      {/* Event content */}
      <div className={cn("flex-1 pb-8", isLast && "pb-0")}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3
              className={cn(
                "font-medium",
                isCurrent ? config.colorClass : "text-foreground",
              )}
            >
              {config.label}
              {isCurrent && (
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  (Current)
                </span>
              )}
            </h3>
            <p className="text-muted-foreground text-sm">
              {config.description}
            </p>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <time dateTime={event.occurredAt.toISOString()}>
              {formatEventDate(event.occurredAt)}
            </time>
          </div>
        </div>

        {/* Source badge */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              SOURCE_STYLE_CONFIG[event.source],
            )}
          >
            <Info className="h-3 w-3" aria-hidden="true" />
            {sourceLabel}
          </span>
        </div>

        {/* Metadata display (if present and relevant) */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="bg-muted/50 text-muted-foreground mt-2 rounded-md p-2 text-xs">
            {typeof event.metadata.statusReason === "string" && (
              <p>Reason: {event.metadata.statusReason}</p>
            )}
            {typeof event.metadata.providerEventId === "string" && (
              <p>Reference: {event.metadata.providerEventId}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ApplicationTimeline({
  events,
  currentStatus,
  className,
}: ApplicationTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-center", className)}>
        <p>No timeline events yet.</p>
      </div>
    );
  }

  // Find the index of the current status event (last occurrence)
  let currentStatusIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]?.status === currentStatus) {
      currentStatusIndex = i;
      break;
    }
  }

  return (
    <div className={cn("relative", className)}>
      {events.map((event, index) => (
        <TimelineEventItem
          key={event.id}
          event={event}
          isLast={index === events.length - 1}
          isCurrent={index === currentStatusIndex}
        />
      ))}
    </div>
  );
}

/** Upcoming steps indicator for pending statuses */
export function PendingStepsIndicator({
  currentStatus,
  className,
}: {
  currentStatus: ApplicationStatus;
  className?: string;
}) {
  // Define the typical progression
  const progression: ApplicationStatus[] = [
    "submitted",
    "received",
    "in_review",
    "approved",
  ];

  const currentIndex = progression.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= progression.length - 1) {
    return null;
  }

  const pendingSteps = progression.slice(currentIndex + 1);

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-muted-foreground text-sm font-medium">
        What&apos;s next
      </h4>
      <div className="space-y-2">
        {pendingSteps.map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <div
              key={status}
              className="text-muted-foreground/60 flex items-center gap-3"
            >
              <div className="border-muted-foreground/30 flex h-6 w-6 items-center justify-center rounded-full border border-dashed">
                <Icon className="h-3 w-3" aria-hidden="true" />
              </div>
              <span className="text-sm">{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
