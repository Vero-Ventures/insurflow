"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CalendarClock,
  FileCheck2,
  MessageCircle,
} from "lucide-react";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;

const nextSteps = [
  {
    title: "Create your account",
    description: "Save your progress and continue when you are ready.",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  {
    title: "Review your estimate and application",
    description: "Confirm your numbers, coverage priorities, and disclosures.",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    title: "Get matched to a best-fit provider",
    description: "Move toward the provider that best matches your application.",
    icon: <FileCheck2 className="h-4 w-4" />,
  },
];

export default function DemoHandoffPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              Step {CURRENT_STEP} of {TOTAL_STEPS}
            </span>
            <div className="bg-border h-1.5 w-32 overflow-hidden rounded-full">
              <div className="bg-emerald h-full" style={{ width: "100%" }} />
            </div>
          </div>

          <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
            Next steps after your estimate
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            You are at the final step. Create your account to save your
            estimate, continue the application, and move toward a best-fit
            provider.
          </p>
        </div>

        <Card className="border-border/60 p-6">
          <h2 className="text-foreground text-lg font-semibold">
            What happens next
          </h2>
          <div className="mt-4 space-y-4">
            {nextSteps.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary mt-0.5 flex h-8 w-8 items-center justify-center rounded-full">
                  {step.icon}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {index + 1}. {step.title}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-emerald/20 bg-emerald/5 mt-6 p-4">
          <Badge
            variant="outline"
            className="border-emerald/30 bg-emerald/10 text-emerald"
          >
            Demo summary
          </Badge>
          <p className="mt-2 text-sm leading-relaxed">
            Your intake, estimate, AI explanation, and report preview are ready
            for the next part of your application journey.
          </p>
        </Card>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button asChild className="bg-emerald hover:bg-emerald/90 gap-2">
            <Link href="/auth/sign-up">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/demo">Restart Demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
