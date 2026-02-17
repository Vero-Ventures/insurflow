"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  Play,
  UserPlus,
  Calculator,
  FileText,
  Wand2,
  Briefcase,
  Landmark,
  Users,
} from "lucide-react";
import { demoScenarios } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/client-utils";

const scenarioIconMap = {
  family: Users,
  briefcase: Briefcase,
  landmark: Landmark,
} as const;

/**
 * Demo landing page - overview of what the demo covers.
 * Keeps the original flow while adding richer scenario previews.
 */
export default function DemoPage() {
  const journeySteps = [
    {
      step: 1,
      icon: <UserPlus className="h-5 w-5" />,
      title: "Add a Client",
      description: "Enter client details and financial information",
    },
    {
      step: 2,
      icon: <Calculator className="h-5 w-5" />,
      title: "See the Analysis",
      description: "Watch our engine calculate exact coverage needs",
    },
    {
      step: 3,
      icon: <Wand2 className="h-5 w-5" />,
      title: "Generate AI Letter",
      description: "Create a compliant 'Reasons Why' letter in seconds",
    },
    {
      step: 4,
      icon: <FileText className="h-5 w-5" />,
      title: "Export Report",
      description: "Get a polished, print-ready client deliverable",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
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

        <div className="animate-fade-up mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-emerald/30 bg-emerald/5 text-emerald mb-6 inline-flex items-center gap-1.5 px-3 py-1"
          >
            <Sparkles className="h-3 w-3" />
            Interactive Demo
          </Badge>

          <h1 className="font-display text-foreground mb-4 text-4xl font-semibold tracking-tight lg:text-5xl">
            Experience InsurFlow
          </h1>

          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg leading-relaxed">
            Follow the journey of creating a complete insurance needs analysis.
            See exactly how InsurFlow transforms your financial analysis process
            in just a few steps.
          </p>
        </div>

        <div className="animate-fade-up animation-delay-200 mx-auto mt-8 max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {journeySteps.map((item) => (
              <div
                key={item.step}
                className="border-border/60 bg-card/50 group relative rounded-xl border p-5"
              >
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

        <div className="animate-fade-up animation-delay-250 mx-auto mt-10 max-w-5xl">
          <div className="mb-4 text-center">
            <h2 className="text-foreground text-xl font-semibold">
              Try a real-world scenario
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Demo mode includes preloaded cases so you can validate different
              advisor workflows quickly.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {demoScenarios.map((scenario) => {
              const Icon = scenarioIconMap[scenario.icon];

              return (
                <Card key={scenario.id} className="border-border/60 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="bg-primary/10 text-primary inline-flex h-9 w-9 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      ~{scenario.analysisTimeMinutes} min
                    </Badge>
                  </div>
                  <h3 className="text-foreground text-base font-semibold">
                    {scenario.name}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {scenario.profile}
                  </p>
                  <div className="mt-3 text-sm">
                    <p className="text-muted-foreground">
                      Example recommendation
                    </p>
                    <p className="text-foreground font-semibold">
                      {formatCurrency(scenario.recommendedCoverage)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="animate-fade-up animation-delay-300 mx-auto mt-12 max-w-lg text-center">
          <Button
            asChild
            size="lg"
            className="bg-emerald hover:bg-emerald/90 gap-2 text-white shadow-lg"
          >
            <Link href="/demo/portfolio">
              <Play className="h-4 w-4" />
              Start Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <p className="text-muted-foreground mt-4 text-sm">
            Takes about 3 minutes. No sign-up required.
          </p>
        </div>

        <div className="animate-fade-up animation-delay-400 relative mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.05_250)] to-[oklch(0.28_0.06_240)]" />

          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[oklch(0.696_0.17_162.48_/_0.2)] to-transparent blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-tr from-[oklch(0.45_0.1_230_/_0.15)] to-transparent blur-2xl" />

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
