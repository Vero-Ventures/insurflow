import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusIndicatorVariants = cva(
  "inline-flex items-center gap-1.5 text-sm font-medium",
  {
    variants: {
      status: {
        // Positive states
        success: "text-success",
        adequate: "text-success",
        complete: "text-success",

        // Warning states
        warning: "text-warning",
        review: "text-warning",
        pending: "text-warning",

        // Danger states
        danger: "text-destructive",
        critical: "text-destructive",
        gap: "text-destructive",

        // Neutral states
        info: "text-primary",
        neutral: "text-muted-foreground",
        inactive: "text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  },
);

const dotVariants = cva("size-2 rounded-full shrink-0", {
  variants: {
    status: {
      success: "bg-success",
      adequate: "bg-success",
      complete: "bg-success",

      warning: "bg-warning",
      review: "bg-warning",
      pending: "bg-warning",

      danger: "bg-destructive",
      critical: "bg-destructive",
      gap: "bg-destructive",

      info: "bg-primary",
      neutral: "bg-muted-foreground",
      inactive: "bg-muted-foreground/50",
    },
    pulse: {
      true: "animate-pulse",
      false: "",
    },
  },
  defaultVariants: {
    status: "neutral",
    pulse: false,
  },
});

export interface StatusIndicatorProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusIndicatorVariants> {
  /** Show a pulsing dot for active/live states */
  pulse?: boolean;
  /** Hide the dot and show only text */
  hideDot?: boolean;
}

/**
 * StatusIndicator - Color-coded status display
 *
 * Uses a consistent color system across the app:
 * - Green (success/adequate/complete): Positive states
 * - Yellow (warning/review/pending): Attention needed
 * - Red (danger/critical/gap): Critical issues
 * - Blue (info): Informational
 * - Gray (neutral/inactive): Neutral states
 *
 * @example
 * <StatusIndicator status="success">Fully Protected</StatusIndicator>
 * <StatusIndicator status="warning">Review Recommended</StatusIndicator>
 * <StatusIndicator status="critical" pulse>Critical Coverage Gap</StatusIndicator>
 */
function StatusIndicator({
  status,
  pulse = false,
  hideDot = false,
  className,
  children,
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(statusIndicatorVariants({ status }), className)}
      {...props}
    >
      {!hideDot && <span className={cn(dotVariants({ status, pulse }))} />}
      {children}
    </span>
  );
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: "success" | "warning" | "danger" | "info" | "neutral";
}

/**
 * StatusBadge - Compact status indicator as a badge
 *
 * @example
 * <StatusBadge status="success">Active</StatusBadge>
 * <StatusBadge status="danger">Expired</StatusBadge>
 */
function StatusBadge({
  status,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const statusClasses = {
    success: "bg-success/10 text-success border-success/20 dark:bg-success/20",
    warning:
      "bg-warning/10 text-warning-foreground border-warning/20 dark:bg-warning/20",
    danger:
      "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
    info: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20",
    neutral: "bg-muted text-muted-foreground border-border dark:bg-muted/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        statusClasses[status],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { StatusIndicator, StatusBadge, statusIndicatorVariants };
