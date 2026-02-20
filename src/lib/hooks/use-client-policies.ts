"use client";

import { useCallback, useState, useEffect } from "react";
import type { Policy, PolicyCoverageAggregation } from "@/types/policy";
import { aggregatePolicyCoverage } from "@/types/policy";

export interface UseClientPoliciesReturn {
  policies: Policy[];
  isLoading: boolean;
  error: string | null;
  /** Total active coverage amount */
  totalCoverage: number;
  /** Full coverage aggregation details */
  coverageAggregation: PolicyCoverageAggregation;
  refetch: () => Promise<void>;
  addPolicy: (data: Partial<Policy>) => Promise<Policy | null>;
  updatePolicy: (
    policyId: string,
    data: Partial<Policy>,
  ) => Promise<Policy | null>;
  deletePolicy: (policyId: string) => Promise<boolean>;
}

/**
 * Hook for managing client policies with CRUD operations.
 *
 * @param clientId - The client ID to fetch policies for
 * @returns Object with policies data and CRUD functions
 */
export function useClientPolicies(clientId: string): UseClientPoliciesReturn {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/clients/${clientId}/policies`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch policies");
      }

      const data = await response.json();
      setPolicies(data.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setPolicies([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // Initial fetch
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const addPolicy = useCallback(
    async (data: Partial<Policy>): Promise<Policy | null> => {
      try {
        const response = await fetch(`/api/clients/${clientId}/policies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create policy");
        }

        const result = await response.json();
        const newPolicy = result.policy;

        setPolicies((prev) => [...prev, newPolicy]);
        return newPolicy;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      }
    },
    [clientId],
  );

  const updatePolicy = useCallback(
    async (policyId: string, data: Partial<Policy>): Promise<Policy | null> => {
      try {
        const response = await fetch(
          `/api/clients/${clientId}/policies/${policyId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update policy");
        }

        const result = await response.json();
        const updatedPolicy = result.policy;

        setPolicies((prev) =>
          prev.map((p) => (p.id === policyId ? updatedPolicy : p)),
        );
        return updatedPolicy;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      }
    },
    [clientId],
  );

  const deletePolicy = useCallback(
    async (policyId: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/clients/${clientId}/policies/${policyId}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete policy");
        }

        setPolicies((prev) => prev.filter((p) => p.id !== policyId));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return false;
      }
    },
    [clientId],
  );

  const coverageAggregation = aggregatePolicyCoverage(policies);

  return {
    policies,
    isLoading,
    error,
    totalCoverage: coverageAggregation.totalActiveCoverage,
    coverageAggregation,
    refetch: fetchPolicies,
    addPolicy,
    updatePolicy,
    deletePolicy,
  };
}
