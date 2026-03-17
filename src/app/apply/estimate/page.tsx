"use client";

import { useEffect, useMemo, useState } from "react";
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
import { calculateInsuranceNeedsRounded } from "@/lib/financial/insurance-needs";
import { mockTermLifeProvider } from "@/lib/providers/mock-term-life-provider";

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

  useEffect(() => {
    if (!isReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration flag intentionally flips once after mount
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
              Carrier-agnostic estimate range in CAD for a {intake.termYears}
              -year term.
            </p>
          </Card>
        </section>

        <Card className="border-amber-300/40 bg-amber-50/40 p-4 text-sm leading-relaxed">
          This is a conservative, non-binding estimate only. Final premium,
          eligibility, and coverage depend on full underwriting, disclosures,
          and selected provider review.
        </Card>

        <div className="flex justify-end">
          <Button
            className="bg-emerald hover:bg-emerald/90"
            onClick={() => {
              const reviewUrl = resolvedClientId
                ? `/apply/review?clientId=${encodeURIComponent(resolvedClientId)}`
                : "/apply/review";
              router.push(reviewUrl);
            }}
          >
            Continue to review
          </Button>
        </div>
      </div>
    </main>
  );
}
