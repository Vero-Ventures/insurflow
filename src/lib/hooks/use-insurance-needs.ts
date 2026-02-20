"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { ConfidenceResult } from "@/lib/financial/confidence-scoring";

/** Recommendation band: low / target / high for a key value (re-exported for consumers) */
export type RecommendationBand = {
  low: number;
  target: number;
  high: number;
};

export interface InsuranceNeedsResult {
  incomeReplacementNeeds: number;
  debtPayoffNeeds: number;
  estateBufferNeeds: number;
  grossNeeds: number;
  existingCoverage: number;
  liquidAssets: number;
  totalInsuranceNeeds: number;
  /** Recommendation band for total insurance needs: { low, target, high } */
  totalInsuranceNeedsBand?: RecommendationBand;
  inputsUsed: {
    clientIncome: number;
    spouseIncome: number;
    includeSpouseIncome: boolean;
    incomeReplacementPercent: number;
    replacementDurationYears: number;
    estateBufferType: "fixed" | "percentage";
    estateBufferValue: number;
  };
}

interface CalculateResponse {
  incomeReplacementNeeds: number;
  debtPayoffNeeds: number;
  estateBufferNeeds: number;
  grossNeeds: number;
  existingCoverage: number;
  liquidAssets: number;
  totalInsuranceNeeds: number;
  totalInsuranceNeedsBand?: RecommendationBand;
  inputsUsed: {
    clientIncome: number;
    spouseIncome: number;
    includeSpouseIncome: boolean;
    incomeReplacementPercent: number;
    replacementDurationYears: number;
    estateBufferType: "fixed" | "percentage";
    estateBufferValue: number;
  };
  confidence?: ConfidenceResult;
  clientId: string;
  clientName: string;
  calculatedAt: string;
}

export interface UseInsuranceNeedsOptions {
  clientId: string;
  enabled?: boolean;
}

export interface UseInsuranceNeedsReturn {
  result: InsuranceNeedsResult | null;
  confidence: ConfidenceResult | null;
  isLoading: boolean;
  error: string | null;
  recalculate: () => Promise<void>;
  calculatedAt: string | null;
  isInitialLoad: boolean;
}

/**
 * Hook to manage insurance needs calculation for a client
 *
 * Automatically fetches calculation results when enabled and clientId is provided.
 * Provides manual recalculate function for refreshing data.
 */
export function useInsuranceNeeds(
  options: UseInsuranceNeedsOptions,
): UseInsuranceNeedsReturn {
  const { clientId, enabled = true } = options;

  const [result, setResult] = useState<InsuranceNeedsResult | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceResult | null>(null);
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
      const response = await fetch(`/api/clients/${clientId}/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Client not found");
        }
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        let serverMessage = "Failed to calculate insurance needs";
        try {
          const errJson = await response.json();
          serverMessage =
            errJson?.message ||
            errJson?.error ||
            errJson?.details?.message ||
            serverMessage;
        } catch {
          // ignore parse errors
        }
        throw new Error(serverMessage);
      }

      const responseData = await response.json();

      // Handle both { data: ... } and direct response formats
      const data: CalculateResponse = responseData.data ?? responseData;

      setResult({
        incomeReplacementNeeds: data.incomeReplacementNeeds,
        debtPayoffNeeds: data.debtPayoffNeeds,
        estateBufferNeeds: data.estateBufferNeeds,
        grossNeeds: data.grossNeeds,
        existingCoverage: data.existingCoverage,
        liquidAssets: data.liquidAssets,
        totalInsuranceNeeds: data.totalInsuranceNeeds,
        totalInsuranceNeedsBand: data.totalInsuranceNeedsBand,
        inputsUsed: data.inputsUsed,
      });

      setConfidence(data.confidence ?? null);
      setCalculatedAt(data.calculatedAt);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Failed to calculate insurance needs", {
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
      toast.success("Insurance needs recalculated");
    }
  }, [calculate]);

  return {
    result,
    confidence,
    isLoading,
    error,
    recalculate,
    calculatedAt,
    isInitialLoad,
  };
}
