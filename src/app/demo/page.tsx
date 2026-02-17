"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  Play,
  ClipboardList,
  Calculator,
  Handshake,
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

  const journeySteps = [
    {
      step: 1,
      icon: <ClipboardList className="h-5 w-5" />,
      title: "Client Intake",
      description: "Answer a few simple household and income questions.",
    },
    {
      step: 2,
      icon: <Calculator className="h-5 w-5" />,
      title: "Estimate Snapshot",
      description: "Adjust assumptions and see estimate changes live.",
    },
    {
      step: 3,
      icon: <Sparkles className="h-5 w-5" />,
      title: "AI + Report Showcase",
      description: "Review advisor-ready letter and report previews.",
    },
    {
      step: 4,
      icon: <Handshake className="h-5 w-5" />,
      title: "Advisor Handoff",
      description:
        "Connect with an advisor to review and personalize next steps.",
    },
  ];

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
        <div
          className="animate-fade-up mx-auto max-w-3xl text-center"
          data-tour="demo-hero"
        >
          <Badge
            variant="outline"
            className="border-emerald/30 bg-emerald/5 text-emerald mb-6 inline-flex items-center gap-1.5 px-3 py-1"
          >
            <Sparkles className="h-3 w-3" />
            Interactive Demo
          </Badge>

          <h1 className="font-display text-foreground mb-4 text-4xl font-semibold tracking-tight lg:text-5xl">
            Experience the Client Journey
          </h1>

          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg leading-relaxed">
            This walkthrough is designed for advisors to preview exactly what a
            client sees: intake, live analysis, AI documentation, and advisor
            handoff.
          </p>

          <div
            className="mx-auto mb-8 flex w-fit rounded-full border p-1"
            data-tour="mode-selector"
          >
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

        <div
          className="animate-fade-up animation-delay-150 mx-auto mt-8 max-w-5xl"
          data-tour="scenario-selector"
        >
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

        {/* Journey Steps */}
        <div className="animate-fade-up animation-delay-200 mx-auto mt-8 max-w-4xl">
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            data-tour="live-calc-preview"
          >
            {journeySteps.map((item) => (
              <div
                key={item.step}
                className="border-border/60 bg-card/50 group relative rounded-xl border p-5"
              >
                {/* Step number */}
                <div className="text-muted-foreground/40 absolute top-3 right-3 text-xs font-medium">
                  Step {item.step}
                </div>
                <div className="bg-primary/5 mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
                  <div className="text-primary">{item.icon}</div>
                </div>
                <h3 className="text-foreground mb-1 font-medium">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="animate-fade-up animation-delay-300 mx-auto mt-12 max-w-lg text-center">
          <Button
            asChild
            size="lg"
            className="bg-emerald hover:bg-emerald/90 gap-2 text-white shadow-lg"
          >
            <Link href="/demo/intake" data-tour="start-demo">
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

        {/* CTA Section */}
        <div className="animate-fade-up animation-delay-400 relative mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.05_250)] to-[oklch(0.28_0.06_240)]" />

          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[oklch(0.696_0.17_162.48_/_0.2)] to-transparent blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-tr from-[oklch(0.45_0.1_230_/_0.15)] to-transparent blur-2xl" />

          {/* Content */}
          <div className="relative z-10 px-8 py-10 text-center sm:py-12">
            <h2 className="font-display mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-white/70">
              Skip the demo and dive right in. Sign up free and start creating
              professional analyses for your clients today.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-emerald hover:bg-emerald/90 min-w-[180px] gap-2 text-white shadow-lg"
              >
                <Link href="/auth/sign-up">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="min-w-[180px] border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10"
              >
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
