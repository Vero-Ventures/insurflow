import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  LineChart,
  Lock,
  PlayCircle,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "InsurFlow | AI-Powered Insurance Analysis for Advisors",
  description:
    "Close more insurance business with faster needs analysis, visual recommendations, and compliant AI-supported documentation.",
  openGraph: {
    title: "InsurFlow | AI-Powered Insurance Analysis for Advisors",
    description:
      "Generate insurance needs analysis and compliant client documentation in minutes.",
    url: "https://insurflow.biz",
    type: "website",
  },
};

const problemSolutionOutcome = [
  {
    problem: "Manual spreadsheets create delays and missed follow-ups",
    solution: "Guided workflows with real-time calculations",
    outcome: "Complete advisor-ready analysis in minutes",
    icon: Clock,
  },
  {
    problem: "Compliance documentation is repetitive and error-prone",
    solution: 'AI-assisted "Reasons Why" letter generation',
    outcome: "Consistent, audit-friendly explanations every time",
    icon: FileText,
  },
  {
    problem: "Clients struggle to understand recommendation logic",
    solution: "Visual breakdowns for needs, assets, and debt offsets",
    outcome: "Clearer recommendations and stronger client confidence",
    icon: LineChart,
  },
];

const previewScreens = [
  {
    title: "Advisor Dashboard",
    description:
      "Track client progress, status, and latest updates in one place.",
  },
  {
    title: "Insurance Needs Breakdown",
    description:
      "Show exactly how income replacement and liabilities shape coverage.",
  },
  {
    title: "AI Compliance Output",
    description: "Generate polished recommendation letters from client data.",
  },
  {
    title: "Report Export",
    description: "Deliver a professional summary ready for print or PDF.",
  },
];

const trustSignals = [
  {
    title: "Built for insurance professionals",
    icon: Users,
  },
  {
    title: "Client data protection controls",
    icon: Lock,
  },
  {
    title: "Compliance-oriented workflows",
    icon: Shield,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <section className="border-b px-4 py-20 sm:py-24">
        <div className="container mx-auto max-w-6xl">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Badge variant="outline" className="mb-6 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Built for life insurance advisors
            </Badge>

            <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Close more insurance sales with faster analysis and clearer client
              recommendations
            </h1>

            <p className="text-muted-foreground mt-6 max-w-3xl text-lg sm:text-xl">
              InsurFlow replaces spreadsheet-heavy workflows with guided needs
              analysis, visual reporting, and AI-assisted compliance output.
            </p>

            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/demo">
                  Try Interactive Demo
                  <PlayCircle className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/auth/sign-up">
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="text-muted-foreground mt-10 flex flex-wrap items-center justify-center gap-6 text-sm">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Demo available instantly
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Product preview
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
              See the complete advisor journey from intake to recommendation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {previewScreens.map((screen) => (
              <Card key={screen.title} className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl">{screen.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {screen.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 border-y px-4 py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Problem → Solution → Outcome
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {problemSolutionOutcome.map((item) => (
              <Card key={item.problem} className="border-border/60 bg-card/80">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Problem</CardTitle>
                  <CardDescription className="text-foreground text-sm">
                    {item.problem}
                  </CardDescription>
                  <CardTitle className="mt-3 text-base">Solution</CardTitle>
                  <CardDescription className="text-foreground text-sm">
                    {item.solution}
                  </CardDescription>
                  <CardTitle className="mt-3 text-base">Outcome</CardTitle>
                  <CardDescription className="text-foreground text-sm">
                    {item.outcome}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="container mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            {trustSignals.map((signal) => (
              <Card key={signal.title} className="border-border/60 text-center">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full">
                    <signal.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{signal.title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="bg-card mt-10 rounded-2xl border p-8 text-center">
            <h3 className="font-display text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              Explore the demo, then launch your own workspace
            </h3>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
              Use preloaded client scenarios to see InsurFlow in action, then
              start with your own clients when ready.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/demo">
                  Open Demo Mode
                  <PlayCircle className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/auth/sign-up">
                  Sign Up Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
