"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type {
  USSettlingRequirementsResult,
  USProfessionalFeesConfig,
} from "@/lib/financial/settling-requirements-us";

// Re-export for consumers who import from this hook
export type { USSettlingRequirementsResult };

/**
 * API response shape (extends the base result with additional metadata)
 */
interface CalculateSettlingResponse extends USSettlingRequirementsResult {
  clientId: string;
  clientName: string;
  calculatedAt: string;
  defaultsUsed?: {
    professionalFees?: USProfessionalFeesConfig;
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
 * Extract the core result fields from the API response
 */
function extractResultFromResponse(
  data: CalculateSettlingResponse,
): USSettlingRequirementsResult {
  return {
    probateFees: data.probateFees,
    federalEstateTax: data.federalEstateTax,
    stateEstateTax: data.stateEstateTax,
    finalIncomeTax: data.finalIncomeTax,
    professionalFees: data.professionalFees,
    funeralExpenses: data.funeralExpenses,
    totalSettlingRequirements: data.totalSettlingRequirements,
    notes: data.notes,
    inputsUsed: data.inputsUsed,
  };
}

/**
 * Map HTTP status codes to user-friendly error messages
 */
function getErrorMessageForStatus(
  status: number,
  errorData?: { error?: string },
): string {
  switch (status) {
    case 404:
      return "Client not found";
    case 401:
      return "Unauthorized";
    case 400:
      return (
        errorData?.error ||
        "Invalid state. Please ensure client has a valid US state."
      );
    default:
      return "Failed to calculate settling requirements";
  }
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

  // Track previous clientId to detect changes
  const prevClientIdRef = useRef(clientId);

  // Reset isInitialLoad when clientId changes to enable auto-fetch for new client
  useEffect(() => {
    if (prevClientIdRef.current !== clientId) {
      prevClientIdRef.current = clientId;
      setIsInitialLoad(true);
      setResult(null);
      setError(null);
      setCalculatedAt(null);
    }
  }, [clientId]);

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
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const errorData =
          response.status === 400 ? await response.json() : undefined;
        throw new Error(getErrorMessageForStatus(response.status, errorData));
      }

      const responseData = await response.json();
      const data: CalculateSettlingResponse = responseData.data ?? responseData;

      setResult(extractResultFromResponse(data));
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
