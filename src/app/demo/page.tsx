"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Landmark,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDemoContext } from "@/components/demo/demo-context";
import { TourOverlay } from "@/components/demo/tour-overlay";
import { demoLandingTourSteps } from "@/components/demo/tour-steps";
import { demoScenarios, type DemoScenario } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/client-utils";

const scenarioIconMap = {
  family: Users,
  briefcase: Briefcase,
  landmark: Landmark,
} as const;

function getScenarioBaseCoverage(scenario: DemoScenario): number {
  return scenario.recommendedCoverage;
}

export default function DemoPage() {
  const { state, nextTourStep, prevTourStep, setShowTour } = useDemoContext();
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<DemoScenario["id"]>("young-family");
  const [replacementPercent, setReplacementPercent] = useState(70);
  const [durationYears, setDurationYears] = useState(20);

  const selectedScenario =
    demoScenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    demoScenarios[0]!;

  const projectedCoverage = useMemo(() => {
    const baseCoverage = getScenarioBaseCoverage(selectedScenario);
    const replacementFactor = replacementPercent / 70;
    const durationFactor = durationYears / 20;
    return Math.round(baseCoverage * replacementFactor * durationFactor);
  }, [durationYears, replacementPercent, selectedScenario]);

  const projectedPremium = useMemo(() => {
    const premiumRatio =
      projectedCoverage / selectedScenario.recommendedCoverage;
    return Math.round(selectedScenario.estimatedAnnualPremium * premiumRatio);
  }, [projectedCoverage, selectedScenario]);

  const coverageDelta =
    projectedCoverage - selectedScenario.recommendedCoverage;

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        <Button variant="ghost" asChild className="mb-8 -ml-2">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="mx-auto max-w-5xl space-y-10">
          <section className="text-center" data-tour="demo-hero">
            <Badge
              variant="outline"
              className="border-emerald/30 bg-emerald/5 text-emerald mb-4 inline-flex items-center gap-1.5 px-3 py-1"
            >
              <Sparkles className="h-3 w-3" />
              Interactive Demo Mode
            </Badge>
            <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight lg:text-5xl">
              See the full advisor workflow in under 5 minutes
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-3xl text-lg">
              Explore realistic client scenarios, interact with live coverage
              assumptions, and preview mock AI-powered compliance output before
              creating your account.
            </p>
          </section>

          <section
            className="grid gap-4 md:grid-cols-3"
            data-tour="scenario-selector"
            role="radiogroup"
            aria-label="Select a scenario"
          >
            {demoScenarios.map((scenario) => {
              const Icon = scenarioIconMap[scenario.icon];
              const selected = scenario.id === selectedScenarioId;

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className="text-left"
                  role="radio"
                  aria-checked={selected}
                >
                  <Card
                    className={`border-border/60 h-full p-5 transition ${
                      selected
                        ? "ring-primary bg-primary/5 ring-2"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="bg-primary/10 text-primary inline-flex h-9 w-9 items-center justify-center rounded-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                      {selected && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-foreground text-base font-semibold">
                      {scenario.name}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {scenario.profile}
                    </p>
                    <p className="text-foreground mt-3 text-sm font-medium">
                      {scenario.headline}
                    </p>
                  </Card>
                </button>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card
              className="border-border/60 p-6"
              data-tour="live-calc-preview"
            >
              <h2 className="text-foreground text-xl font-semibold">
                Live calculation preview
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Adjust assumptions to demonstrate how recommendation amounts
                change in real time.
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Income replacement %
                    </span>
                    <span className="font-medium">{replacementPercent}%</span>
                  </div>
                  <input
                    type="range"
                    value={replacementPercent}
                    onChange={(event) =>
                      setReplacementPercent(Number(event.target.value))
                    }
                    min={40}
                    max={90}
                    step={5}
                    className="accent-primary w-full"
                    aria-label="Income replacement percentage"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Coverage duration
                    </span>
                    <span className="font-medium">{durationYears} years</span>
                  </div>
                  <input
                    type="range"
                    value={durationYears}
                    onChange={(event) =>
                      setDurationYears(Number(event.target.value))
                    }
                    min={10}
                    max={30}
                    step={1}
                    className="accent-primary w-full"
                    aria-label="Coverage duration in years"
                  />
                </div>

                <div className="bg-muted/40 rounded-xl border p-4">
                  <p className="text-muted-foreground text-xs">
                    Projected coverage need
                  </p>
                  <p className="text-foreground mt-1 text-2xl font-semibold">
                    {formatCurrency(projectedCoverage)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Baseline:{" "}
                    {formatCurrency(selectedScenario.recommendedCoverage)}{" ("}
                    {coverageDelta >= 0 ? "+" : ""}
                    {formatCurrency(coverageDelta)})
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-border/60 p-6" data-tour="mock-ai-preview">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-foreground text-xl font-semibold">
                  Mock AI recommendation preview
                </h2>
                <Badge variant="outline">Mock State</Badge>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                This PR keeps AI generation in demo mode as a mock experience.
                Real endpoint integration is tracked separately in Tier-4 issue
                #204.
              </p>

              <div className="bg-muted/40 mt-6 rounded-xl border p-4 text-sm leading-relaxed">
                <p className="text-foreground font-medium">
                  Draft recommendation summary for {selectedScenario.name}
                </p>
                <p className="text-muted-foreground mt-2">
                  Recommend {formatCurrency(projectedCoverage)} of total
                  coverage to support client goals across income continuity,
                  debt obligations, and estate transition. Estimated annual
                  premium: {formatCurrency(projectedPremium)}.
                </p>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {selectedScenario.goals.map((goal) => (
                  <li
                    key={goal}
                    className="text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-1 h-1.5 w-1.5 rounded-full bg-current" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60 p-5">
              <p className="text-muted-foreground text-sm">
                Time saved per analysis
              </p>
              <p className="text-foreground mt-1 text-2xl font-semibold">
                ~{selectedScenario.analysisTimeMinutes} min
              </p>
            </Card>
            <Card className="border-border/60 p-5">
              <p className="text-muted-foreground text-sm">
                Recommended coverage
              </p>
              <p className="text-foreground mt-1 text-2xl font-semibold">
                {formatCurrency(selectedScenario.recommendedCoverage)}
              </p>
            </Card>
            <Card className="border-border/60 p-5">
              <p className="text-muted-foreground text-sm">
                Estimated annual premium
              </p>
              <p className="text-foreground mt-1 text-2xl font-semibold">
                {formatCurrency(selectedScenario.estimatedAnnualPremium)}
              </p>
            </Card>
          </section>

          <section
            className="rounded-2xl border p-8 text-center"
            data-tour="start-demo"
          >
            <h2 className="font-display text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to walk through the end-to-end flow?
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
              Continue to portfolio mode to follow the guided experience from
              client selection to final report.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-emerald hover:bg-emerald/90 gap-2 text-white"
              >
                <Link href="/demo/portfolio">
                  <Play className="h-4 w-4" />
                  Start Demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/sign-up">Create Free Account</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      <TourOverlay
        steps={demoLandingTourSteps}
        currentStep={state.currentTourStep}
        onNext={() => {
          if (state.currentTourStep >= demoLandingTourSteps.length - 1) {
            setShowTour(false);
          } else {
            nextTourStep();
          }
        }}
        onPrev={prevTourStep}
        onSkip={() => setShowTour(false)}
        isVisible={state.showTour}
      />
    </div>
  );
}
