"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductRecommendationsCard } from "@/components/financial/product-recommendations-card";
import { authClient } from "@/server/better-auth/client";
import { formatCurrency } from "@/lib/client-utils";
import {
  DEFAULT_D2C_INTAKE,
  loadD2cIntake,
  saveD2cIntake,
} from "@/lib/d2c/intake-storage";
import type { D2cIntake } from "@/lib/d2c/intake-types";
import { clientFieldsToD2cIntake } from "@/lib/d2c/client-adapter";
import type { DraftClientRecord } from "@/lib/api/d2c-draft-helpers";
import { calculateInsuranceNeedsRounded } from "@/lib/financial/insurance-needs";
import type { InsuranceGoal } from "@/lib/financial/product-recommendation";
import {
  getAgeFromDateOfBirth,
  normalizeHealthClass,
  normalizeLifeExpectancySex,
} from "@/lib/financial/life-expectancy-profile";
import {
  getLifeExpectancy,
  toSmokingStatus,
} from "@/lib/financial/mortality-tables";
import { getMockPremiumRangeMonthly } from "@/lib/providers/mock-term-life-provider";
import type { EstimateRunOutputs } from "@/server/db/schemas/estimate-runs-schema";

function useIntakeData(clientId: string | null) {
  const [intake, setIntake] = useState(DEFAULT_D2C_INTAKE);
  const [isReady, setIsReady] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(
    clientId,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
          // Fall through.
        }

        if (!cancelled) {
          setIntake(DEFAULT_D2C_INTAKE);
          setResolvedClientId(null);
          setIsReady(true);
        }
        return;
      }

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

interface DraftPersistenceInput {
  nextClientId: string | null;
  shouldTryPersistDraft: boolean;
  intakeForDraft: D2cIntake;
}

interface DraftPersistenceResult {
  nextClientId: string | null;
  createdDraftNow: boolean;
}

interface EstimateApiResponse {
  estimateRun: {
    id: string;
    outputs: EstimateRunOutputs;
  };
}

function getEstimateErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message === "Failed to fetch"
      ? "Network error — please try again"
      : error.message;
  }

  return "Network error — please try again";
}

async function createDraftForReviewIfNeeded({
  nextClientId: initialClientId,
  shouldTryPersistDraft,
  intakeForDraft,
}: Readonly<DraftPersistenceInput>): Promise<DraftPersistenceResult> {
  if (initialClientId || !shouldTryPersistDraft) {
    return { nextClientId: initialClientId, createdDraftNow: false };
  }

  let nextClientId = initialClientId;
  let createdDraftNow = false;

  try {
    const response = await fetch("/api/d2c/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intake: intakeForDraft }),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        draft?: { id?: string };
        existed?: boolean;
      };
      const createdId = payload.draft?.id;
      if (typeof createdId === "string" && createdId.length > 0) {
        nextClientId = createdId;
        createdDraftNow =
          payload.existed === false ||
          (payload.existed === undefined && response.status === 201);
      }
    } else if (response.status !== 401 && response.status !== 403) {
      console.error("Failed to create draft before review:", response);
    }
  } catch (error) {
    console.error("Failed to create draft before review:", error);
  }

  return { nextClientId, createdDraftNow };
}

async function syncDraftForReviewIfNeeded({
  nextClientId,
  shouldTryPersistDraft,
  intakeForDraft,
  createdDraftNow,
}: Readonly<
  DraftPersistenceInput & { createdDraftNow: boolean }
>): Promise<void> {
  if (!nextClientId || !shouldTryPersistDraft || createdDraftNow) {
    return;
  }

  try {
    const response = await fetch(
      `/api/d2c/draft/${encodeURIComponent(nextClientId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: intakeForDraft }),
      },
    );

    if (!response.ok && response.status !== 401 && response.status !== 403) {
      console.error("Failed to sync draft before review:", response);
    }
  } catch (error) {
    console.error("Failed to sync draft before review:", error);
  }
}

function getReviewUrl(clientId: string | null, estimateRunId: string | null) {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (estimateRunId) params.set("estimateRunId", estimateRunId);
  const qs = params.toString();
  return `/apply/review${qs ? `?${qs}` : ""}`;
}

export default function ApplyEstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const [isHydrated, setIsHydrated] = useState(false);
  const [estimateRunId, setEstimateRunId] = useState<string | null>(null);
  const [persistedOutputs, setPersistedOutputs] =
    useState<EstimateRunOutputs | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const { intake, isReady, resolvedClientId } = useIntakeData(clientId);
  const age = getAgeFromDateOfBirth(intake.dateOfBirth);
  const sex = normalizeLifeExpectancySex(intake.gender);
  const healthClass = normalizeHealthClass(intake.healthClass || undefined);
  const lifeExpectancyYears = getLifeExpectancy({
    age,
    sex,
    smokingStatus: toSmokingStatus(intake.tobaccoUse),
    healthClass,
  });
  const shouldPersistEstimate = resolvedClientId !== null;

  const localOutputs = useMemo<EstimateRunOutputs>(() => {
    const needs = calculateInsuranceNeedsRounded({
      clientIncome: intake.annualIncome,
      spouseIncome: 0,
      includeSpouseIncome: false,
      incomeReplacementPercent: 70,
      replacementDurationYears: 15,
      existingLifeInsuranceCoverage: 0,
      totalDebts: 0,
      liquidAssets: 0,
      totalAssets: 0,
      estateBuffer: { type: "fixed", amount: 25_000 },
    });

    const recommendedCoverage =
      intake.coverageAmount > 0
        ? intake.coverageAmount
        : needs.totalInsuranceNeeds;
    const premiumRange = getMockPremiumRangeMonthly({
      age,
      tobaccoUse: intake.tobaccoUse,
      province: intake.province,
      termYears: intake.termYears,
      coverageAmount: recommendedCoverage,
    });

    return {
      insuranceNeeds: {
        incomeReplacementNeeds: needs.incomeReplacementNeeds,
        debtPayoffNeeds: needs.debtPayoffNeeds,
        estateBufferNeeds: needs.estateBufferNeeds,
        grossNeeds: needs.grossNeeds,
        existingCoverage: needs.existingCoverage,
        liquidAssets: needs.liquidAssets,
        totalInsuranceNeeds: needs.totalInsuranceNeeds,
      },
      recommendedCoverage,
      premiumRange: {
        lowMonthlyPremiumCad: premiumRange.lowMonthlyPremiumCad,
        highMonthlyPremiumCad: premiumRange.highMonthlyPremiumCad,
        currency: premiumRange.currency,
        nonBinding: premiumRange.nonBinding,
      },
    };
  }, [
    age,
    intake.annualIncome,
    intake.coverageAmount,
    intake.province,
    intake.termYears,
    intake.tobaccoUse,
  ]);

  const displayOutputs = persistedOutputs ?? localOutputs;
  const intakeForDraft = useMemo(
    () => ({ ...intake, coverageAmount: displayOutputs.recommendedCoverage }),
    [displayOutputs.recommendedCoverage, intake],
  );

  const recommendationInput = useMemo(() => {
    return {
      age,
      sex,
      isSmoker: intake.tobaccoUse,
      healthClass,
      annualIncome: intake.annualIncome,
      totalDebts: 0,
      liquidAssets: 0,
      existingCoverage: 0,
      coverageNeeded: displayOutputs.recommendedCoverage,
      primaryGoal: "income_replacement" as InsuranceGoal,
      hasDependents: intake.hasSpouse || intake.youngestChildAge !== null,
      youngestDependentAge: intake.youngestChildAge ?? undefined,
    };
  }, [
    age,
    displayOutputs.recommendedCoverage,
    healthClass,
    intake.annualIncome,
    intake.hasSpouse,
    intake.tobaccoUse,
    intake.youngestChildAge,
    sex,
  ]);

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
  }, [intake, isHydrated, resolvedClientId, router]);

  useEffect(() => {
    if (!isHydrated) return;
    saveD2cIntake({ coverageAmount: displayOutputs.recommendedCoverage });
  }, [displayOutputs.recommendedCoverage, isHydrated]);

  const executePersistedEstimate = useCallback(
    async (nextClientId: string) => {
      const res = await fetch("/api/d2c/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: nextClientId,
          annualIncome: intake.annualIncome,
          age,
          province: intake.province,
          tobaccoUse: intake.tobaccoUse,
          termYears: intake.termYears,
          coverageAmountOverride:
            intake.coverageAmount > 0 ? intake.coverageAmount : 0,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message =
          (errorBody as { error?: string } | null)?.error ?? "Estimate failed";
        throw new Error(message);
      }

      const json = (await res.json()) as EstimateApiResponse;
      return json.estimateRun;
    },
    [
      age,
      intake.annualIncome,
      intake.coverageAmount,
      intake.province,
      intake.termYears,
      intake.tobaccoUse,
    ],
  );

  useEffect(() => {
    if (!isHydrated || !shouldPersistEstimate || !resolvedClientId) {
      setEstimateError(null);
      setPersistedOutputs(null);
      setEstimateRunId(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsEstimating(true);
      setEstimateError(null);

      try {
        const estimateRun = await executePersistedEstimate(resolvedClientId);
        if (cancelled) return;
        setEstimateRunId(estimateRun.id);
        setPersistedOutputs(estimateRun.outputs);
      } catch (error) {
        if (cancelled) return;
        setEstimateError(getEstimateErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsEstimating(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    executePersistedEstimate,
    isHydrated,
    resolvedClientId,
    shouldPersistEstimate,
  ]);

  if (!isHydrated) {
    return <main className="min-h-[calc(100vh-3.5rem)]" />;
  }

  const handleContinueToReview = async () => {
    if (isContinuing) return;
    setIsContinuing(true);

    try {
      const shouldTryPersistDraft =
        resolvedClientId !== null || Boolean(session?.user) || isSessionPending;

      const { nextClientId, createdDraftNow } =
        await createDraftForReviewIfNeeded({
          nextClientId: resolvedClientId,
          shouldTryPersistDraft,
          intakeForDraft,
        });

      await syncDraftForReviewIfNeeded({
        nextClientId,
        shouldTryPersistDraft,
        createdDraftNow,
        intakeForDraft,
      });

      let nextEstimateRunId = estimateRunId;

      if (nextClientId) {
        try {
          const estimateRun = await executePersistedEstimate(nextClientId);
          nextEstimateRunId = estimateRun.id;
          setEstimateRunId(estimateRun.id);
          setPersistedOutputs(estimateRun.outputs);
          setEstimateError(null);
        } catch {
          nextEstimateRunId = null;
        }
      }

      router.push(getReviewUrl(nextClientId, nextEstimateRunId));
    } finally {
      setIsContinuing(false);
    }
  };

  const recommendedCoverage = displayOutputs.recommendedCoverage;
  const premiumLow = displayOutputs.premiumRange.lowMonthlyPremiumCad;
  const premiumHigh = displayOutputs.premiumRange.highMonthlyPremiumCad;
  const showPersistedError = shouldPersistEstimate && estimateError;

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

        {showPersistedError ? (
          <Card className="border-red-300/40 bg-red-50/40 p-4 text-sm leading-relaxed text-red-900">
            Something went wrong generating your estimate: {estimateError}.
            Please go back and try again.
          </Card>
        ) : shouldPersistEstimate && isEstimating ? (
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
                Provider estimate range in CAD for a {intake.termYears}-year
                term.
              </p>
            </Card>
          </section>
        )}

        <Card className="border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">
          Based on your profile, your life expectancy is approximately{" "}
          <span className="font-semibold">{lifeExpectancyYears} years</span>{" "}
          using 2017 CSO mortality tables.
        </Card>

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
            disabled={
              isContinuing ||
              (shouldPersistEstimate && (isEstimating || !!estimateError))
            }
            onClick={() => void handleContinueToReview()}
          >
            Continue to review
          </Button>
        </div>
      </div>
    </main>
  );
}
