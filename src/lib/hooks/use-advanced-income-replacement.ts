"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type {
  AnnualScheduleEntry,
  CalculationMode,
  CalculationAssumptions,
} from "@/lib/financial/income-replacement";

// ============================================================================
// Types
// ============================================================================

/**
 * Income-multiplier mode configuration for the API.
 */
export interface IncomeMultiplierModeConfig {
  mode: "income-multiplier";
  baseAnnualIncome?: number;
  replacementRatio?: number;
}

/**
 * Expense-based mode configuration for the API.
 */
export interface ExpenseBasedModeConfig {
  mode: "expense-based";
  annualExpenses: number;
  expenseReductionPercent?: number;
}

/**
 * Union type for mode configuration.
 */
export type ModeConfigParam =
  | IncomeMultiplierModeConfig
  | ExpenseBasedModeConfig;

/**
 * Parameters that can be sent to the advanced income replacement endpoint.
 * All optional — the API falls back to stored client data / defaults.
 */
export interface AdvancedIncomeReplacementParams {
  /** Explicit mode configuration. If omitted, uses income-multiplier with client defaults. */
  modeConfig?: ModeConfigParam;
  durationScenario?: "childTurns18" | "retirement" | "lifetime" | "custom";
  customDurationYears?: number;
  includeSpouseIncome?: boolean;
  /** @deprecated Use modeConfig instead */
  replacementRatio?: number;
  inflationRate?: number;
  discountRate?: number;
  govSurvivorBenefit?: number;
  investmentIncome?: number;
  otherIncome?: number;
}

/** API response (engine result + metadata added by the route). */
export interface AdvancedIncomeReplacementResponse {
  /** Duration used (resolved from scenario) */
  durationYears: number;
  /** Year-by-year schedule */
  annualSchedule: AnnualScheduleEntry[];
  /** PV of gross income replacement needs */
  presentValueTotal: number;
  /** PV of total survivor resources */
  survivorResourcesPV: number;
  /** Net coverage gap = max(0, presentValueTotal − survivorResourcesPV) */
  netCoverageNeededPV: number;
  /** Metadata about the calculation mode and assumptions used */
  calculationMetadata: CalculationAssumptions;
  /** Debug: the inputs after defaults/clamping were applied */
  resolvedInputs: {
    baseAnnualIncome?: number;
    replacementRatio?: number;
    annualExpenses?: number;
    expenseReductionPercent?: number;
    annualBaselineNeed?: number;
    mode?: CalculationMode;
    inflationRate: number;
    discountRate: number;
    durationYears: number;
    survivorResources: {
      govSurvivorBenefit: number;
      existingInsurance: number;
      investmentIncome: number;
      otherIncome: number;
    };
  };
  clientId: string;
  clientName: string;
  currentAge: number;
  liquidAssets: number;
  calculatedAt: string;
}

export interface UseAdvancedIncomeReplacementOptions {
  clientId: string;
  /** Reserved for future auto-fetch behaviour. Does not block manual `calculate()` calls. */
  enabled?: boolean;
}

export interface UseAdvancedIncomeReplacementReturn {
  /** Full calculation result (null until first successful call). */
  result: AdvancedIncomeReplacementResponse | null;
  /** Convenience: the year-by-year schedule (empty array until loaded). */
  schedule: AnnualScheduleEntry[];
  /** The calculation mode used (null until first successful call). */
  mode: CalculationMode | null;
  /** Calculation metadata including assumptions (null until first successful call). */
  calculationMetadata: CalculationAssumptions | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Trigger a (re)calculation with optional parameter overrides.
   * Returns `true` on success.
   */
  calculate: (params?: AdvancedIncomeReplacementParams) => Promise<boolean>;
  calculatedAt: string | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for the advanced (PV-based) income replacement calculator.
 *
 * Unlike `useInsuranceNeeds`, this hook does **not** auto-fetch on mount.
 * The calculation must always be triggered manually via `calculate()`.
 *
 * `calculate()` only requires a valid `clientId` and that no other
 * request is in-flight. The `enabled` option is reserved for future
 * auto-fetch behaviour and does not block manual calls.
 */
export function useAdvancedIncomeReplacement(
  options: UseAdvancedIncomeReplacementOptions,
): UseAdvancedIncomeReplacementReturn {
  const { clientId } = options;

  const [result, setResult] =
    useState<AdvancedIncomeReplacementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);

  const isFetchingRef = useRef(false);

  const calculate = useCallback(
    async (params?: AdvancedIncomeReplacementParams): Promise<boolean> => {
      if (!clientId || isFetchingRef.current) return false;

      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const hasBody = params && Object.keys(params).length > 0;

        const response = await fetch(
          `/api/clients/${clientId}/calculate/income-replacement`,
          {
            method: "POST",
            headers: hasBody
              ? { "Content-Type": "application/json" }
              : undefined,
            body: hasBody ? JSON.stringify(params) : undefined,
            credentials: "include",
          },
        );

        if (!response.ok) {
          if (response.status === 404) throw new Error("Client not found");
          if (response.status === 401) throw new Error("Unauthorized");
          if (response.status === 400) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Invalid calculation parameters");
          }
          throw new Error("Failed to calculate income replacement needs");
        }

        const responseData = await response.json();
        const data: AdvancedIncomeReplacementResponse =
          responseData.data ?? responseData;

        setResult(data);
        setCalculatedAt(data.calculatedAt);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        toast.error("Failed to calculate income replacement", {
          description: errorMessage,
        });
        return false;
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [clientId],
  );

  return {
    result,
    schedule: result?.annualSchedule ?? [],
    mode: result?.calculationMetadata?.mode ?? null,
    calculationMetadata: result?.calculationMetadata ?? null,
    isLoading,
    error,
    calculate,
    calculatedAt,
  };
}
