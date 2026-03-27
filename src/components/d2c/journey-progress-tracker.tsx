"use client";

import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";
import {
  JOURNEY_STEPS,
  getJourneyStepStatuses,
  getStepRouteWithClient,
  type JourneyStepStatus,
} from "@/lib/d2c/journey-steps";
import type { D2cIntake } from "@/lib/d2c/intake-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JourneyProgressTrackerProps {
  intake: D2cIntake | null;
  clientId: string | null;
  hasAnyDraft: boolean;
  className?: string;
}

const statusConfig: Record<
  JourneyStepStatus,
  { icon: typeof Check | typeof Circle; color: string; bgColor: string }
> = {
  complete: {
    icon: Check,
    color: "text-emerald",
    bgColor: "bg-emerald",
  },
  "in-progress": {
    icon: Circle,
    color: "text-primary",
    bgColor: "bg-primary",
  },
  pending: {
    icon: Circle,
    color: "text-muted-foreground/50",
    bgColor: "bg-muted",
  },
  "not-started": {
    icon: Circle,
    color: "text-muted-foreground/30",
    bgColor: "bg-muted",
  },
};

function StepIndicator({
  stepNumber,
  status,
}: {
  stepNumber: number;
  status: JourneyStepStatus;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === "complete") {
    return (
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          config.bgColor,
        )}
      >
        <Icon className="h-4 w-4 text-white" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border-2",
        status === "in-progress"
          ? "border-primary bg-primary/10"
          : status === "pending"
            ? "border-accent bg-accent/10"
            : status === "not-started"
              ? "border-muted-foreground/20 bg-background"
              : "border-muted-foreground/20 bg-background",
      )}
    >
      <span
        className={cn(
          "text-sm font-medium",
          status === "in-progress"
            ? "text-primary"
            : status === "pending"
              ? "text-accent-foreground"
              : status === "not-started"
                ? "text-muted-foreground/30"
                : "text-muted-foreground/50",
        )}
      >
        {stepNumber}
      </span>
    </div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  return (
    <div
      className={cn(
        "mx-2 hidden h-0.5 w-8 flex-1 sm:block lg:w-12",
        isComplete ? "bg-emerald" : "bg-muted",
      )}
      aria-hidden="true"
    />
  );
}

export function JourneyProgressTracker({
  intake,
  clientId,
  hasAnyDraft,
  className,
}: JourneyProgressTrackerProps) {
  const statuses = getJourneyStepStatuses(intake, hasAnyDraft);

  // Find the current step for the CTA
  const currentStepIndex = JOURNEY_STEPS.findIndex(
    (step) => statuses[step.id] === "in-progress",
  );
  const firstStep = JOURNEY_STEPS[0]!;
  const currentStep =
    currentStepIndex >= 0 ? JOURNEY_STEPS[currentStepIndex]! : firstStep;
  const ctaHref = getStepRouteWithClient(currentStep, clientId);
  const ctaLabel = hasAnyDraft ? "Continue application" : "Start application";

  return (
    <Card
      className={cn(
        "border-border/60 bg-card/80 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <CardHeader className="space-y-2">
        {hasAnyDraft ? (
          <p className="text-emerald text-xs font-semibold tracking-wide uppercase">
            Application in progress
          </p>
        ) : (
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Your journey
          </p>
        )}
        <CardTitle className="text-xl">
          {hasAnyDraft ? "Resume your application" : "Get your coverage"}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {hasAnyDraft
            ? "Pick up where you left off. Your progress is saved automatically."
            : "Complete these steps to get your life insurance coverage."}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step Progress - Horizontal on desktop, stacked on mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {JOURNEY_STEPS.map((step, index) => {
            const status = statuses[step.id];
            const isClickable =
              status === "complete" || status === "in-progress";
            const isLastStep = index === JOURNEY_STEPS.length - 1;

            const stepContent = (
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <StepIndicator stepNumber={step.stepNumber} status={status} />
                <div className="flex flex-col sm:items-center">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      status === "complete" || status === "in-progress"
                        ? "text-foreground"
                        : status === "pending"
                          ? "text-muted-foreground/70"
                          : status === "not-started"
                            ? "text-muted-foreground/50"
                            : "text-muted-foreground/60",
                    )}
                  >
                    <span className="sm:hidden">{step.label}</span>
                    <span className="hidden sm:inline">{step.shortLabel}</span>
                  </span>
                  {status === "in-progress" && (
                    <span className="text-primary text-xs">Current step</span>
                  )}
                  {status === "complete" && (
                    <span className="text-emerald text-xs">Complete</span>
                  )}
                  {status === "pending" && (
                    <span className="text-accent-foreground text-xs">Up next</span>
                  )}
                  {status === "not-started" && (
                    <span className="text-muted-foreground/40 text-xs">Not started</span>
                  )}
                </div>
              </div>
            );

            return (
              <div
                key={step.id}
                className="flex items-center sm:flex-1 sm:justify-center"
              >
                {isClickable ? (
                  <Link
                    href={getStepRouteWithClient(step, clientId)}
                    className={cn(
                      "hover:bg-muted/50 rounded-lg p-2 transition-colors",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    )}
                  >
                    {stepContent}
                  </Link>
                ) : (
                  <div className="p-2 opacity-60">{stepContent}</div>
                )}

                {/* Connector line - hidden on mobile, visible on desktop */}
                {!isLastStep && (
                  <StepConnector
                    isComplete={
                      statuses[step.id] === "complete" ||
                      statuses[JOURNEY_STEPS[index + 1]!.id] === "complete"
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center pt-2">
          <Button asChild className="bg-emerald hover:bg-emerald/90 gap-2">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}