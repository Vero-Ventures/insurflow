"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { useDemoContext } from "@/components/demo/demo-context";
import { demoScenarios } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/client-utils";

/**
 * Demo landing page - overview of what the demo covers.
 * Entry point for the comprehensive demo experience.
 */
export default function DemoPage() {
  const { state, setDemoMode, setSelectedScenarioId } = useDemoContext();

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

          <div className="mx-auto mb-8 flex w-fit rounded-full border p-1">
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

        <div className="animate-fade-up animation-delay-150 mx-auto mt-8 max-w-5xl">
          <h2 className="text-foreground mb-3 text-left text-xl font-semibold">
            Choose a planning scenario
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {demoScenarios.map((scenario) => {
              const selected = scenario.id === state.selectedScenarioId;

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-emerald bg-emerald/5"
                      : "border-border/60 bg-card/50 hover:border-emerald/40"
                  }`}
                >
                  <p className="text-foreground text-sm font-semibold">
                    {scenario.name}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {scenario.profile}
                  </p>
                  <p className="text-foreground mt-3 text-xs font-medium">
                    Typical need: {formatCurrency(scenario.recommendedCoverage)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="animate-fade-up animation-delay-300 mx-auto mt-12 max-w-lg text-center">
          <Button
            asChild
            size="lg"
            className="bg-emerald hover:bg-emerald/90 gap-2 text-white shadow-lg"
          >
            <Link href="/demo/intake">
              <Play className="h-4 w-4" />
              Start Guided Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <p className="text-muted-foreground mt-4 text-sm">
            {state.demoMode === "guided"
              ? "About 8-10 minutes. No sign-up required."
              : "About 3-4 minutes. No sign-up required."}
          </p>
        </div>
      </div>
    </div>
  );
}
