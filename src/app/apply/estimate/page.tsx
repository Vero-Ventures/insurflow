"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authClient } from "@/server/better-auth/client";
import { formatCurrency } from "@/lib/client-utils";
import {
  DEFAULT_D2C_INTAKE,
  loadD2cIntake,
  saveD2cIntake,
} from "@/lib/d2c/intake-storage";
import { clientFieldsToD2cIntake } from "@/lib/d2c/client-adapter";
import type { DraftClientRecord } from "@/lib/api/d2c-draft-helpers";
import { calculateInsuranceNeedsRounded } from "@/lib/financial/insurance-needs";
import { getAgeFromDateOfBirth } from "@/lib/financial/life-expectancy-profile";
import { mockTermLifeProvider } from "@/lib/providers/mock-term-life-provider";
import { ProductRecommendationsCard } from "@/components/financial/product-recommendations-card";
import type { Sex } from "@/lib/financial/mortality-tables";
import type { InsuranceGoal } from "@/lib/financial/product-recommendation";

/**
 * Loads intake data, preferring DB draft when clientId is available
 * to avoid stale sessionStorage resumes.
 *
 * When a clientId is present, fetches the specific draft via
 * GET /api/d2c/draft/[clientId] rather than the generic collection
 * endpoint, which could return a different (newer) draft.
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

export default function ApplyEstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const [isHydrated, setIsHydrated] = useState(false);
  const [premiumLow, setPremiumLow] = useState<number>(0);
  const [premiumHigh, setPremiumHigh] = useState<number>(0);
  const [isContinuing, setIsContinuing] = useState(false);
  const { data: session } = authClient.useSession();

  const { intake, isReady, resolvedClientId } = useIntakeData(clientId);
  const age = getAgeFromDateOfBirth(intake.dateOfBirth);

  const needs = useMemo(
    () =>
      calculateInsuranceNeedsRounded({
        clientIncome: intake.annualIncome,
        spouseIncome: 0,
        includeSpouseIncome: false,
        incomeReplacementPercent: 70,
        replacementDurationYears: 15,
        existingLifeInsuranceCoverage: 0,
        totalDebts: 0,
        liquidAssets: 0,
        totalAssets: 0,
        estateBuffer: { type: "fixed", amount: 25000 },
      }),
    [intake.annualIncome],
  );

  const recommendedCoverage =
    intake.coverageAmount > 0
      ? intake.coverageAmount
      : needs.totalInsuranceNeeds;

  const recommendationInput = useMemo(() => {
    return {
      age,
      sex: "M" as Sex, // Fallback as D2C intake doesn't currently collect sex
      isSmoker: intake.tobaccoUse,
      healthClass: "standard" as const, // Fallback
      annualIncome: intake.annualIncome,
      totalDebts: 0,
      liquidAssets: 0,
      existingCoverage: 0,
      coverageNeeded: recommendedCoverage,
      primaryGoal: "income_replacement" as InsuranceGoal,
      hasDependents: false,
    };
  }, [age, intake.tobaccoUse, intake.annualIncome, recommendedCoverage]);

  useEffect(() => {
    if (!isReady) return;

    setIsHydrated(true);
  }, [isReady]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!intake.province || !intake.dateOfBirth || intake.annualIncome <= 0) {
      const intakeUrl = resolvedClientId
        ? `/apply/intake?clientId=${encodeURIComponent(resolvedClientId)}`
        : "/apply/intake";
      router.replace(intakeUrl);
    }
  }, [intake, isHydrated, router, resolvedClientId]);

  useEffect(() => {
    if (!isHydrated) return;

    const runEstimate = async () => {
      const range = await mockTermLifeProvider.estimatePremiumRange({
        age,
        tobaccoUse: intake.tobaccoUse,
        province: intake.province,
        termYears: intake.termYears,
        coverageAmount: recommendedCoverage,
      });

      setPremiumLow(range.lowMonthlyPremiumCad);
      setPremiumHigh(range.highMonthlyPremiumCad);
      saveD2cIntake({ coverageAmount: recommendedCoverage });
    };

    void runEstimate();
  }, [
    age,
    intake.province,
    intake.termYears,
    intake.tobaccoUse,
    isHydrated,
    recommendedCoverage,
  ]);

  if (!isHydrated) {
    return <main className="min-h-[calc(100vh-3.5rem)]" />;
  }

  const handleContinueToReview = async () => {
    if (isContinuing) return;
    setIsContinuing(true);
    try {
      let nextClientId = resolvedClientId;

      // Ensure review always has a persisted draft context for authenticated users.
      if (!nextClientId && session?.user) {
        try {
          const response = await fetch("/api/d2c/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intake }),
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              draft?: { id?: string };
            };
            const createdId = payload.draft?.id;
            if (typeof createdId === "string" && createdId.length > 0) {
              nextClientId = createdId;
            }
          }
        } catch (error) {
          // Best-effort: fall back to review route without clientId.
          console.error("Failed to create draft before review:", error);
        }
      }

      const reviewUrl = nextClientId
        ? `/apply/review?clientId=${encodeURIComponent(nextClientId)}`
        : "/apply/review";
      router.push(reviewUrl);
    } finally {
      setIsContinuing(false);
    }
  };

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

        <section>
          <ProductRecommendationsCard input={recommendationInput} />
        </section>

        <Card className="border-amber-300/40 bg-amber-50/40 p-4 text-sm leading-relaxed">
          This is a conservative, non-binding estimate only. Final premium,
          eligibility, and coverage depend on full underwriting, disclosures,
          and selected provider review.
        </Card>

        <div className="flex justify-end">
          <Button
            className="bg-emerald hover:bg-emerald/90"
            onClick={() => void handleContinueToReview()}
            disabled={isContinuing}
          >
            Continue to review
          </Button>
        </div>
      </div>
    </main>
  );
}
