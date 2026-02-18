"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DollarSign,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useDemoContext } from "@/components/demo/demo-context";
import { demoScenarios } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/client-utils";

/**
 * Demo landing page - overview of what the demo covers.
 * Entry point for the comprehensive demo experience.
 */
export default function DemoPage() {
  const { state, setDemoMode, setSelectedScenarioId } = useDemoContext();
  const selectedScenario =
    demoScenarios.find(
      (scenario) => scenario.id === state.selectedScenarioId,
    ) ?? demoScenarios[0];

  if (!selectedScenario) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-8 -ml-2">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        {/* Hero Section */}
        <div className="animate-fade-up mx-auto max-w-3xl text-center">
          <h1 className="font-display text-foreground mb-4 text-4xl font-semibold tracking-tight lg:text-5xl">
            Experience the Client Journey
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed sm:text-lg">
            Configure one realistic scenario, run the intake in minutes, and
            jump straight into advisor-ready analysis output.
          </p>

          <div className="mx-auto mt-6 mb-2 flex w-fit rounded-full border p-1">
            <button
              type="button"
              onClick={() => setDemoMode("guided")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                state.demoMode === "guided"
                  ? "bg-emerald text-white"
                  : "text-muted-foreground"
              }`}
            >
              Guided mode (8-10 min)
            </button>
            <button
              type="button"
              onClick={() => setDemoMode("quick")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                state.demoMode === "quick"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              }`}
            >
              Quick mode (3-4 min)
            </button>
          </div>
        </div>

        <div className="animate-fade-up animation-delay-150 mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Card className="border-border/60 bg-card/50 p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-foreground text-xl font-semibold">
                Choose a planning scenario
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Pick one path to pre-load context and make the walkthrough feel
                like a real advisor session.
              </p>
            </div>

            <div className="space-y-3">
              {demoScenarios.map((scenario) => {
                const selected = scenario.id === state.selectedScenarioId;

                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-emerald bg-emerald/5"
                        : "border-border/60 bg-background/60 hover:border-emerald/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-foreground text-sm font-semibold">
                          {scenario.name}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {scenario.profile}
                        </p>
                      </div>
                      {selected ? (
                        <span className="bg-emerald inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <p className="text-foreground/90 mt-3 text-sm">
                      {scenario.headline}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/60 bg-card/60 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="text-emerald h-4 w-4" />
                <h3 className="text-foreground text-base font-semibold">
                  Session brief
                </h3>
              </div>
              <p className="text-foreground text-sm font-medium">
                {selectedScenario.name}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {selectedScenario.headline}
              </p>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Coverage
                  </span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(selectedScenario.recommendedCoverage)}
                  </span>
                </div>
                <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Premium est.
                  </span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(selectedScenario.estimatedAnnualPremium)}/yr
                  </span>
                </div>
                <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" /> Analysis pace
                  </span>
                  <span className="text-foreground font-medium">
                    {state.demoMode === "guided" ? "Guided" : "Quick"}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <Button
                  asChild
                  size="lg"
                  className="bg-emerald hover:bg-emerald/90 w-full gap-2 text-white shadow-lg"
                >
                  <Link href="/demo/intake">
                    <Play className="h-4 w-4" />
                    Start {state.demoMode === "guided"
                      ? "Guided"
                      : "Quick"}{" "}
                    Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-muted-foreground mt-3 text-xs">
                  {state.demoMode === "guided"
                    ? "Expect 8-10 minutes."
                    : "Expect 3-4 minutes."}{" "}
                  No sign-up required.
                </p>
              </div>
            </Card>

            <Card className="border-border/60 bg-card/40 p-5">
              <p className="text-foreground text-sm font-semibold">
                Output preview
              </p>
              <ul className="text-muted-foreground mt-2 space-y-2 text-sm">
                <li>- Structured intake with scenario context</li>
                <li>- Live estimate adjustments before advisor review</li>
                <li>- AI letter and client-report handoff preview</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
