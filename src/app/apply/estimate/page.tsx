"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/client-utils";
import { loadD2cIntake, saveD2cIntake } from "@/lib/d2c/intake-storage";
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

export default function ApplyEstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const [isHydrated, setIsHydrated] = useState(false);
  const [premiumLow, setPremiumLow] = useState<number>(0);
  const [premiumHigh, setPremiumHigh] = useState<number>(0);

  const intake = useMemo(() => loadD2cIntake(), []);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration flag intentionally flips once after mount
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!intake.province || !intake.dateOfBirth || intake.annualIncome <= 0) {
      router.replace("/apply/intake");
    }
  }, [intake, isHydrated, router]);

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
            Step 2 of 4
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Your non-binding estimate preview
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            This estimate is based on your intake details for {intake.province}.
            It is not an offer, quote, or policy approval.
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
              Estimated monthly range
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
          This is a conservative, non-binding estimate preview only. Final
          premium, eligibility, and coverage depend on full underwriting,
          disclosures, and carrier review.
        </Card>

        <div className="flex justify-end">
          <Button
            className="bg-emerald hover:bg-emerald/90"
            onClick={() => {
              const reviewUrl = clientId
                ? `/apply/review?clientId=${encodeURIComponent(clientId)}`
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
