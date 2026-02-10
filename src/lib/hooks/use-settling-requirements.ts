"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { USState } from "@/lib/financial/settling-requirements-us";

/**
 * Result shape for US settling requirements calculation
 */
export interface USSettlingRequirementsResult {
  probateFees: number;
  federalEstateTax: number;
  stateEstateTax: number;
  finalIncomeTax: number;
  professionalFees: {
    legalFees: number;
    accountingFees: number;
    executorFees: number;
    total: number;
  };
  funeralExpenses: number;
  totalSettlingRequirements: number;
  notes: string[];
  inputsUsed: {
    state: USState;
    stateName: string;
    estateValue: number;
    finalYearIncome: number;
    assetCount: number;
  };
}

/**
 * API response shape
 */
interface CalculateSettlingResponse {
  probateFees: number;
  federalEstateTax: number;
  stateEstateTax: number;
  finalIncomeTax: number;
  professionalFees: {
    legalFees: number;
    accountingFees: number;
    executorFees: number;
    total: number;
  };
  funeralExpenses: number;
  totalSettlingRequirements: number;
  notes: string[];
  inputsUsed: {
    state: USState;
    stateName: string;
    estateValue: number;
    finalYearIncome: number;
    assetCount: number;
  };
  clientId: string;
  clientName: string;
  calculatedAt: string;
  defaultsUsed?: {
    professionalFees?: unknown;
    funeralExpenses?: number;
  };
}

/**
 * Options for the useSettlingRequirements hook
 */
export interface UseSettlingRequirementsOptions {
  clientId: string;
  enabled?: boolean;
}

/**
 * Return type for the useSettlingRequirements hook
 */
export interface UseSettlingRequirementsReturn {
  result: USSettlingRequirementsResult | null;
  isLoading: boolean;
  error: string | null;
  recalculate: () => Promise<void>;
  calculatedAt: string | null;
  isInitialLoad: boolean;
}

/**
 * Hook to manage settling requirements calculation for a US client
 *
 * Automatically fetches calculation results when enabled and clientId is provided.
 * Uses the client's state from the database for state-specific calculations.
 *
 * @example
 * ```tsx
 * const {
 *   result,
 *   isLoading,
 *   error,
 *   recalculate,
 *   calculatedAt,
 * } = useSettlingRequirements({
 *   clientId: "abc123",
 * });
 * ```
 */
export function useSettlingRequirements(
  options: UseSettlingRequirementsOptions,
): UseSettlingRequirementsReturn {
  const { clientId, enabled = true } = options;

  const [result, setResult] = useState<USSettlingRequirementsResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use a ref to track if we're currently fetching to prevent double calls
  const isFetchingRef = useRef(false);

  const calculate = useCallback(async (): Promise<boolean> => {
    if (!clientId || !enabled || isFetchingRef.current) {
      return false;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/clients/${clientId}/calculate-settling`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Client not found");
        }
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              "Invalid state. Please ensure client has a valid US state.",
          );
        }
        throw new Error("Failed to calculate settling requirements");
      }

      const responseData = await response.json();

      // Handle both { data: ... } and direct response formats
      const data: CalculateSettlingResponse = responseData.data ?? responseData;

      setResult({
        probateFees: data.probateFees,
        federalEstateTax: data.federalEstateTax,
        stateEstateTax: data.stateEstateTax,
        finalIncomeTax: data.finalIncomeTax,
        professionalFees: data.professionalFees,
        funeralExpenses: data.funeralExpenses,
        totalSettlingRequirements: data.totalSettlingRequirements,
        notes: data.notes,
        inputsUsed: data.inputsUsed,
      });

      setCalculatedAt(data.calculatedAt);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Failed to calculate settling requirements", {
        description: errorMessage,
      });
      return false;
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      isFetchingRef.current = false;
    }
  }, [clientId, enabled]);

  // Auto-calculate when enabled and clientId changes
  useEffect(() => {
    if (enabled && clientId && isInitialLoad) {
      calculate();
    }
  }, [enabled, clientId, isInitialLoad, calculate]);

  const recalculate = useCallback(async () => {
    const success = await calculate();
    if (success) {
      toast.success("Settling requirements recalculated");
    }
  }, [calculate]);

  return {
    result,
    isLoading,
    error,
    recalculate,
    calculatedAt,
    isInitialLoad,
  };
}
