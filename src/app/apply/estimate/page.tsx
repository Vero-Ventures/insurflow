"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/client-utils";
import {
  DEFAULT_D2C_INTAKE,
  loadD2cIntake,
  saveD2cIntake,
} from "@/lib/d2c/intake-storage";
import { clientFieldsToD2cIntake } from "@/lib/d2c/client-adapter";
import type { DraftClientRecord } from "@/lib/api/d2c-draft-helpers";
import type { EstimateRunOutputs } from "@/server/db/schemas/estimate-runs-schema";

/**
 * Computes age from an ISO date-of-birth string.
 *
 * @param dateOfBirth - ISO date string (YYYY-MM-DD).
 * @returns Age in whole years, or 0 if the input is empty or invalid.
 */
function getAgeFromDateOfBirth(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return Math.max(0, age);
}

/**
 * Loads intake data, preferring DB draft when clientId is available
 * to avoid stale sessionStorage resumes.
 *
 * When a clientId is present, fetches the specific draft via
 * GET /api/d2c/draft/[clientId] rather than the generic collection
 * endpoint, which could return a different (newer) draft.
 *
 * @param clientId - Optional client UUID from URL search params.
 * @returns Intake data, readiness flag, and resolved client ID.
 */
function useIntakeData(clientId: string | null) {
  const [intake, setIntake] = useState(DEFAULT_D2C_INTAKE);
  const [isReady, setIsReady] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(
    clientId,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Case 1: clientId provided — always load from DB (source of truth)
      if (clientId) {
        try {
          const res = await fetch(
            `/api/d2c/draft/${encodeURIComponent(clientId)}`,
          );
          if (res.ok) {
            const json = (await res.json()) as {
              draft?: DraftClientRecord;
            };
            const draft = json.draft;
            if (draft && !cancelled) {
              const loaded = clientFieldsToD2cIntake(draft);
              setIntake(loaded);
              saveD2cIntake(loaded);
              setResolvedClientId(draft.id);
              setIsReady(true);
              return;
            }
          }
        } catch {
          // Fall through — draft not accessible
        }

        // Draft could not be loaded for this clientId — use empty defaults
        // so the redirect-to-intake guard fires correctly.
        if (!cancelled) {
          setIntake(DEFAULT_D2C_INTAKE);
          setResolvedClientId(null);
          setIsReady(true);
        }
        return;
      }

      // Case 2: No clientId — use sessionStorage (normal flow from intake page)
      const stored = loadD2cIntake();
      if (!cancelled) {
        setIntake(stored);
        setResolvedClientId(null);
        setIsReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { intake, isReady, resolvedClientId };
}

/** Response shape from POST /api/d2c/estimate */
interface EstimateApiResponse {
  estimateRun: {
    id: string;
    runNumber: number;
    outputs: EstimateRunOutputs;
    assumptionVersionLabel: string;
    engineVersion: string;
    createdAt: string;
  };
}

export default function ApplyEstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const [isHydrated, setIsHydrated] = useState(false);

  // Server estimate state
  const [estimateRunId, setEstimateRunId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<EstimateRunOutputs | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const { intake, isReady, resolvedClientId } = useIntakeData(clientId);
  const age = getAgeFromDateOfBirth(intake.dateOfBirth);

  // Derive coverage amount from intake (user override or 0 for engine default)
  const coverageAmountOverride =
    intake.coverageAmount > 0 ? intake.coverageAmount : 0;

  useEffect(() => {
    if (!isReady) return;
    setIsHydrated(true);
  }, [isReady]);

  // Guard: redirect to intake if required fields are missing
  useEffect(() => {
    if (!isHydrated) return;
    if (!intake.province || !intake.dateOfBirth || intake.annualIncome <= 0) {
      const intakeUrl = resolvedClientId
        ? `/apply/intake?clientId=${encodeURIComponent(resolvedClientId)}`
        : "/apply/intake";
      router.replace(intakeUrl);
    }
  }, [intake, isHydrated, router, resolvedClientId]);

  /**
   * Calls the server estimate API and persists the result.
   * Replaces the previous client-side calculation approach.
   */
  const executeEstimate = useCallback(async () => {
    if (
      !isHydrated ||
      !intake.province ||
      !intake.dateOfBirth ||
      intake.annualIncome <= 0
    ) {
      return;
    }

    setIsEstimating(true);
    setEstimateError(null);

    try {
      const res = await fetch("/api/d2c/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: resolvedClientId,
          annualIncome: intake.annualIncome,
          age,
          province: intake.province,
          tobaccoUse: intake.tobaccoUse,
          termYears: intake.termYears,
          coverageAmountOverride,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message =
          (errorBody as { error?: string } | null)?.error ?? "Estimate failed";
        setEstimateError(message);
        return;
      }

      const json = (await res.json()) as EstimateApiResponse;
      const run = json.estimateRun;

      setEstimateRunId(run.id);
      setOutputs(run.outputs);

      // Sync coverage amount back to sessionStorage for downstream pages
      saveD2cIntake({ coverageAmount: run.outputs.recommendedCoverage });
    } catch {
      setEstimateError("Network error — please try again");
    } finally {
      setIsEstimating(false);
    }
  }, [
    isHydrated,
    intake.province,
    intake.dateOfBirth,
    intake.annualIncome,
    intake.tobaccoUse,
    intake.termYears,
    resolvedClientId,
    age,
    coverageAmountOverride,
  ]);

  // Run estimate when inputs are ready
  useEffect(() => {
    void executeEstimate();
  }, [executeEstimate]);

  if (!isHydrated) {
    return <main className="min-h-[calc(100vh-3.5rem)]" />;
  }

  // Derive display values from server response (or show loading state)
  const recommendedCoverage = outputs?.recommendedCoverage ?? 0;
  const premiumLow = outputs?.premiumRange.lowMonthlyPremiumCad ?? 0;
  const premiumHigh = outputs?.premiumRange.highMonthlyPremiumCad ?? 0;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <section className="space-y-2">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Step 3 of 4
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Your estimate preview
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            This non-binding estimate is based on your intake details for{" "}
            {intake.province}. It is not an offer, quote, or policy approval.
          </p>
        </section>

        {estimateError ? (
          <Card className="border-red-300/40 bg-red-50/40 p-4 text-sm leading-relaxed text-red-900">
            Something went wrong generating your estimate: {estimateError}.
            Please go back and try again.
          </Card>
        ) : isEstimating ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/60 bg-card/80 animate-pulse p-6">
              <p className="text-muted-foreground text-sm">
                Recommended coverage
              </p>
              <div className="bg-muted mt-2 h-9 w-40 rounded" />
            </Card>
            <Card className="border-border/60 bg-card/80 animate-pulse p-6">
              <p className="text-muted-foreground text-sm">
                Estimated monthly cost range
              </p>
              <div className="bg-muted mt-2 h-9 w-52 rounded" />
            </Card>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/60 bg-card/80 p-6">
              <p className="text-muted-foreground text-sm">
                Recommended coverage
              </p>
              <p className="text-foreground mt-2 text-3xl font-semibold">
                {formatCurrency(recommendedCoverage)}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                Uses baseline income replacement assumptions from your intake.
              </p>
            </Card>

            <Card className="border-border/60 bg-card/80 p-6">
              <p className="text-muted-foreground text-sm">
                Estimated monthly cost range
              </p>
              <p className="text-foreground mt-2 text-3xl font-semibold">
                {formatCurrency(premiumLow)} - {formatCurrency(premiumHigh)}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                Provider estimate range in CAD for a {intake.termYears}
                -year term.
              </p>
            </Card>
          </section>
        )}

        <Card className="border-amber-300/40 bg-amber-50/40 p-4 text-sm leading-relaxed">
          This is a conservative, non-binding estimate only. Final premium,
          eligibility, and coverage depend on full underwriting, disclosures,
          and selected provider review.
        </Card>

        <div className="flex justify-end">
          <Button
            className="bg-emerald hover:bg-emerald/90"
            disabled={isEstimating || !!estimateError || !outputs}
            onClick={() => {
              const params = new URLSearchParams();
              if (resolvedClientId) params.set("clientId", resolvedClientId);
              if (estimateRunId) params.set("estimateRunId", estimateRunId);
              const qs = params.toString();
              router.push(`/apply/review${qs ? `?${qs}` : ""}`);
            }}
          >
            Continue to review
          </Button>
        </div>
      </div>
    </main>
  );
}
