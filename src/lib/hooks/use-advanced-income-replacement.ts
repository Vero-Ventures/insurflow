"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type {
  IncomeReplacementResult,
  AnnualScheduleEntry,
} from "@/lib/financial/income-replacement";

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters that can be sent to the advanced income replacement endpoint.
 * All optional — the API falls back to stored client data / defaults.
 */
export interface AdvancedIncomeReplacementParams {
  durationScenario?: "childTurns18" | "retirement" | "lifetime" | "custom";
  customDurationYears?: number;
  includeSpouseIncome?: boolean;
  replacementRatio?: number;
  inflationRate?: number;
  discountRate?: number;
  govSurvivorBenefit?: number;
  investmentIncome?: number;
  otherIncome?: number;
}

/** API response (engine result + metadata added by the route). */
export interface AdvancedIncomeReplacementResponse extends IncomeReplacementResult {
  clientId: string;
  clientName: string;
  currentAge: number;
  liquidAssets: number;
  calculatedAt: string;
}

export interface UseAdvancedIncomeReplacementOptions {
  clientId: string;
  /** If false the hook won't fire automatically on mount. Default: true */
  enabled?: boolean;
}

export interface UseAdvancedIncomeReplacementReturn {
  /** Full calculation result (null until first successful call). */
  result: AdvancedIncomeReplacementResponse | null;
  /** Convenience: the year-by-year schedule (empty array until loaded). */
  schedule: AnnualScheduleEntry[];
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
 * The calculation must be triggered manually by calling `calculate()`.
 *
 * The `enabled` flag only acts as a guard — when `false`, calls to
 * `calculate()` are no-ops. It does **not** trigger an automatic fetch.
 */
export function useAdvancedIncomeReplacement(
  options: UseAdvancedIncomeReplacementOptions,
): UseAdvancedIncomeReplacementReturn {
  const { clientId, enabled = true } = options;

  const [result, setResult] =
    useState<AdvancedIncomeReplacementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);

  const isFetchingRef = useRef(false);

  const calculate = useCallback(
    async (params?: AdvancedIncomeReplacementParams): Promise<boolean> => {
      if (!clientId || !enabled || isFetchingRef.current) return false;

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
    [clientId, enabled],
  );

  return {
    result,
    schedule: result?.annualSchedule ?? [],
    isLoading,
    error,
    calculate,
    calculatedAt,
  };
}
