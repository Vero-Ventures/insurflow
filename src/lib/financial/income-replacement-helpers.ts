/**
 * Pure helper functions for the income replacement API route.
 *
 * Extracted from the route handler so they can be unit-tested
 * without requiring database or HTTP context.
 */

import type { DurationScenario } from "./income-replacement";

// ============================================================================
// Decimal conversion
// ============================================================================

/**
 * Safely convert a decimal string (as returned by Drizzle for `numeric`
 * columns) to a JavaScript number.
 *
 * Returns `0` for null, undefined, empty-string, or non-numeric values.
 */
export function decimalToNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// ============================================================================
// Duration-scenario builder
// ============================================================================

/**
 * Build a `DurationScenario` from the raw request + client data.
 *
 * Defaults:
 *  - If `scenarioType` is omitted → "custom" with the client's
 *    `replacementDurationYears` (or the provided fallback).
 *  - "childTurns18" uses `clientYoungestChildAge` (falls back to 0).
 *  - "retirement" uses `clientRetirementAge` (falls back to 65).
 *  - "lifetime" only needs `currentAge`.
 */
export function buildDurationScenario(
  scenarioType: string | undefined,
  customYears: number | undefined,
  currentAge: number,
  clientRetirementAge: number | null,
  clientYoungestChildAge: number | null,
  clientReplacementDurationYears: number,
): DurationScenario {
  switch (scenarioType) {
    case "childTurns18":
      return {
        type: "childTurns18",
        youngestChildAge: clientYoungestChildAge ?? 0,
      };
    case "retirement":
      return {
        type: "retirement",
        currentAge,
        retirementAge: clientRetirementAge ?? 65,
      };
    case "lifetime":
      return {
        type: "lifetime",
        currentAge,
      };
    case "custom":
    default:
      return {
        type: "custom",
        years: customYears ?? clientReplacementDurationYears,
      };
  }
}
