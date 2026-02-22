import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileBarChart2,
  Handshake,
} from "lucide-react";
import type { ComponentType } from "react";

import {
  DEMO_HANDOFF_ROUTE,
  DEMO_INTAKE_ROUTE,
  DEMO_SNAPSHOT_ROUTE,
} from "@/lib/app-routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type JourneyCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  icon: ComponentType<{ className?: string }>;
};

function JourneyCard({
  title,
  description,
  href,
  ctaLabel,
  icon: Icon,
}: JourneyCardProps) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
        <Button asChild className="w-full sm:w-auto">
          <Link href={href}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="space-y-3">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Your Planning Dashboard
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Pick up your client journey
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            Start where you left off. Move from intake to estimate and finish
            with a clear advisor handoff.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <JourneyCard
            title="Continue Intake"
            description="Capture or update household details in a guided flow before running the estimate."
            href={DEMO_INTAKE_ROUTE}
            ctaLabel="Continue Intake"
            icon={ClipboardList}
          />
          <JourneyCard
            title="View Estimate Snapshot"
            description="Review the current estimate and plain-language breakdown of what it means."
            href={DEMO_SNAPSHOT_ROUTE}
            ctaLabel="View Estimate Snapshot"
            icon={FileBarChart2}
          />
          <JourneyCard
            title="Advisor Handoff"
            description="Prepare the next conversation with one clear handoff step and recommended action."
            href={DEMO_HANDOFF_ROUTE}
            ctaLabel="Advisor Handoff"
            icon={Handshake}
          />
        </section>
      </div>
    </main>
  );
}
