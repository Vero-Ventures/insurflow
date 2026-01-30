import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Format a number as Canadian currency
 * Uses monospace font with tabular figures for aligned columns
 */
function formatCurrency(
  value: number,
  options?: {
    showCents?: boolean;
    showSign?: boolean;
  },
): string {
  const { showCents = false, showSign = false } = options ?? {};

  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(absValue);

  if (value < 0) {
    return showSign ? `-${formatted}` : `(${formatted})`;
  }

  return showSign && value > 0 ? `+${formatted}` : formatted;
}

export interface CurrencyProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The numeric value to display */
  value: number;
  /** Show cents (decimal places). Default: false for cleaner display of large numbers */
  showCents?: boolean;
  /** Show +/- sign prefix. Default: false */
  showSign?: boolean;
  /** Size variant */
  size?: "sm" | "default" | "lg" | "xl";
  /** Color the value based on positive/negative. Default: false */
  colorize?: boolean;
}

/**
 * Currency - Display financial values with proper formatting
 *
 * Features:
 * - Monospace font with tabular figures for aligned columns
 * - Positive values in default or green color
 * - Negative values in red with parentheses
 * - Consistent formatting across the app
 *
 * @example
 * // Basic usage
 * <Currency value={1234567} />  // $1,234,567
 *
 * // With cents
 * <Currency value={1234.56} showCents />  // $1,234.56
 *
 * // Colorized (positive=green, negative=red)
 * <Currency value={-500} colorize />  // ($500) in red
 *
 * // Large display
 * <Currency value={1000000} size="xl" />
 */
function Currency({
  value,
  showCents = false,
  showSign = false,
  size = "default",
  colorize = false,
  className,
  ...props
}: CurrencyProps) {
  const isNegative = value < 0;
  const isPositive = value > 0;

  const sizeClasses = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg",
    xl: "text-2xl",
  };

  const colorClasses = colorize
    ? isNegative
      ? "text-liability"
      : isPositive
        ? "text-asset"
        : "text-foreground"
    : "";

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums",
        sizeClasses[size],
        colorClasses,
        className,
      )}
      {...props}
    >
      {formatCurrency(value, { showCents, showSign })}
    </span>
  );
}

export interface PercentageProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The numeric value (0-100 or decimal 0-1) */
  value: number;
  /** If true, value is treated as decimal (0.15 = 15%). Default: false (value is already percentage) */
  isDecimal?: boolean;
  /** Number of decimal places. Default: 1 */
  decimals?: number;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Color the value based on positive/negative. Default: false */
  colorize?: boolean;
}

/**
 * Percentage - Display percentage values with proper formatting
 *
 * @example
 * <Percentage value={15.5} />  // 15.5%
 * <Percentage value={0.155} isDecimal />  // 15.5%
 * <Percentage value={-5} colorize />  // -5.0% in red
 */
function Percentage({
  value,
  isDecimal = false,
  decimals = 1,
  size = "default",
  colorize = false,
  className,
  ...props
}: PercentageProps) {
  // Convert to decimal for Intl.NumberFormat (expects 0.15 for 15%)
  const valueForIntl = isDecimal ? value : value / 100;
  const isNegative = value < 0;
  const isPositive = value > 0;

  const sizeClasses = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg",
  };

  const colorClasses = colorize
    ? isNegative
      ? "text-liability"
      : isPositive
        ? "text-asset"
        : "text-foreground"
    : "";

  const formattedValue = new Intl.NumberFormat("en-CA", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(valueForIntl);

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums",
        sizeClasses[size],
        colorClasses,
        className,
      )}
      {...props}
    >
      {formattedValue}
    </span>
  );
}

export { Currency, Percentage, formatCurrency };
