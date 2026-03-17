import { AuthStatus } from "@/components/auth-status";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calculator,
  FileText,
  Clock,
  Shield,
  CheckCircle2,
  ArrowRight,
  Zap,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Clock,
    title: "See your estimate in plain language",
    description:
      "Answer a few questions and review a clear, non-binding estimate with no confusing jargon.",
    stat: "5 min",
    statLabel: "Typical intake",
  },
  {
    icon: Calculator,
    title: "Move from estimate to application in one flow",
    description:
      "No need to start over. Your answers carry through to a simple guided submission.",
    stat: "1 flow",
    statLabel: "Estimate to submit",
  },
  {
    icon: FileText,
    title: "See what happens after you apply",
    description:
      "Track your application status from submitted to reviewed — no guessing required.",
    stat: "Live",
    statLabel: "Status tracking",
  },
  {
    icon: Sparkles,
    title: "Built for first-time applicants",
    description:
      "Plain-language questions, Canadian-focused fields, and clear guidance at every step.",
    stat: "Simple",
    statLabel: "No jargon",
  },
];

const painPoints = [
  "Confusing insurance language you need a dictionary to decode",
  "Too many forms upfront before you know anything",
  "No clear estimate until you've already committed time",
  "No visibility into what happens after you submit",
];

const solutions = [
  "A short guided intake with plain-language questions",
  "A clear non-binding estimate before you commit",
  "One continuous flow from estimate to submission",
  "Transparent status updates you can check anytime",
];

const applicationFlowSteps = [
  {
    title: "1) Intake",
    description:
      "Capture your eligibility details with plain-language, Canada-first fields.",
  },
  {
    title: "2) Estimate",
    description:
      "Review a clear, non-binding estimate preview and supporting assumptions.",
  },
  {
    title: "3) Submit + Track",
    description:
      "Create your account, submit your application, and follow status updates in one place.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4 py-16">
        {/* Background gradient mesh */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Primary gradient orb */}
          <div className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.15)] via-[oklch(0.55_0.12_200_/_0.1)] to-transparent blur-3xl" />
          {/* Emerald accent orb */}
          <div className="absolute -bottom-48 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.12)] via-[oklch(0.65_0.15_170_/_0.08)] to-transparent blur-3xl" />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(oklch(0.35 0.08 250) 1px, transparent 1px),
                               linear-gradient(90deg, oklch(0.35 0.08 250) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
          {/* Beta badge */}
          <div className="animate-fade-up">
            <Badge
              variant="outline"
              className="border-emerald bg-emerald/5 text-emerald mb-8 px-4 py-1.5 text-sm font-medium"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Consumer Preview
            </Badge>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up animation-delay-100 text-foreground font-display mb-6 text-4xl font-normal tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            A simpler way to apply for{" "}
            <span className="relative">
              <span className="from-primary to-emerald relative z-10 bg-gradient-to-r via-[oklch(0.55_0.12_200)] bg-clip-text text-transparent">
                term life insurance
              </span>
              <span className="bg-emerald/20 absolute right-0 -bottom-1 left-0 h-3 -skew-x-6" />
            </span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-up animation-delay-200 text-muted-foreground mb-8 max-w-2xl text-lg sm:text-xl">
            Answer a few simple questions, review a clear non-binding estimate,
            and submit your application in{" "}
            <span className="text-foreground font-semibold">
              under 5 minutes
            </span>
            . No confusing forms, no jargon, no guessing what happens next.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-up animation-delay-300 flex flex-col items-center gap-4 sm:flex-row">
            <AuthStatus />
          </div>

          {/* Trust indicators */}
          <div className="animate-fade-up animation-delay-400 text-muted-foreground mt-12 flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="text-emerald h-4 w-4" aria-hidden="true" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="text-emerald h-4 w-4"
                aria-hidden="true"
              />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-emerald h-4 w-4" aria-hidden="true" />
              <span>Takes about 5 minutes</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="animate-fade-in animation-delay-700 absolute bottom-8 left-1/2 -translate-x-1/2"
          aria-hidden="true"
        >
          <div className="border-muted-foreground/30 flex h-8 w-5 items-start justify-center rounded-full border-2 p-1">
            <div className="bg-muted-foreground/50 h-2 w-1 animate-bounce rounded-full" />
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16 sm:py-20">
        <div className="relative z-10 container mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Badge
              variant="secondary"
              className="bg-emerald/10 text-emerald mb-4"
            >
              Application Flow
            </Badge>
            <h2 className="text-foreground font-display text-3xl font-normal tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="text-muted-foreground mt-3 text-base sm:text-lg">
              A simple three-step walkthrough from intake to submission and
              status tracking.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {applicationFlowSteps.map((step, index) => (
              <Card
                key={step.title}
                className={`animate-fade-up border-border/60 bg-card/70 animation-delay-${(index + 1) * 100}`}
              >
                <CardHeader>
                  <CardTitle className="text-foreground text-lg font-semibold">
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-emerald hover:bg-emerald/90 text-base text-white"
            >
              <Link href="/apply/intake">
                Start Application
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="relative bg-[oklch(0.22_0.05_250)] px-4 py-20 text-white dark:bg-[oklch(0.18_0.04_250)]">
        {/* Decorative wave pattern echoing the logo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
          <svg
            className="absolute top-0 -right-24 h-full w-1/2"
            viewBox="0 0 400 800"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,0 Q200,200 100,400 T200,800"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M100,0 Q300,200 200,400 T300,800"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="relative z-10 container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="animate-fade-up font-display text-3xl font-normal tracking-tight sm:text-4xl">
              Applying for life insurance usually feels harder than it should
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Pain Points */}
            <div className="animate-slide-in-left animation-delay-200 rounded-2xl bg-white/5 p-8 backdrop-blur-sm dark:bg-white/[0.03]">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-red-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                  ✕
                </span>
                The Old Way
              </h3>
              <ul className="space-y-4">
                {painPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/80">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div className="animate-slide-in-right animation-delay-200 rounded-2xl bg-emerald-500/10 p-8 backdrop-blur-sm dark:bg-emerald-400/10">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-emerald-300 dark:text-emerald-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </span>
                The InsurFlow Way
              </h3>
              <ul className="space-y-4">
                {solutions.map((solution, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/90">
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400"
                      aria-hidden="true"
                    />
                    {solution}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-20">
        {/* Subtle background texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.696_0.17_162.48_/_0.03),transparent_70%)]" />

        <div className="relative z-10 container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge
              variant="secondary"
              className="bg-primary/5 text-primary mb-4"
            >
              What you can do in a few minutes
            </Badge>
            <h2 className="animate-fade-up text-foreground font-display text-3xl font-normal tracking-tight sm:text-4xl">
              Everything you need to apply with confidence
            </h2>
            <p className="animate-fade-up animation-delay-100 text-muted-foreground mx-auto mt-4 max-w-2xl">
              From eligibility to submission, InsurFlow keeps the process clear,
              fast, and easy to follow.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature, i) => (
              <Card
                key={feature.title}
                className={`animate-fade-up group border-border/50 bg-card/80 hover:border-primary/30 relative overflow-hidden transition-all duration-300 hover:shadow-lg animation-delay-${(i + 1) * 100}`}
              >
                {/* Hover gradient */}
                <div className="from-primary/5 to-emerald/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <CardHeader className="relative">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="from-primary/10 to-emerald/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110">
                      <feature.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-display text-2xl font-normal">
                        {feature.stat}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {feature.statLabel}
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative px-4 py-24">
        {/* Background gradient */}
        <div className="via-emerald/5 to-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent" />

        <div className="relative z-10 container mx-auto max-w-3xl text-center">
          <div className="animate-fade-up mb-6 flex items-center justify-center">
            <Image
              src="/insurflow-logo-no-bg.png"
              alt="InsurFlow"
              width={80}
              height={80}
              className="animate-float"
            />
          </div>

          <h2 className="animate-fade-up animation-delay-100 text-foreground font-display text-3xl font-normal tracking-tight sm:text-4xl md:text-5xl">
            Ready to start your application?
          </h2>

          <p className="animate-fade-up animation-delay-200 text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
            Start with a short eligibility check, review your estimate, and
            continue to a simple, guided submission flow.
          </p>

          <div className="animate-fade-up animation-delay-300 mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="animate-pulse-glow from-primary hover:from-primary/90 bg-gradient-to-r to-[oklch(0.45_0.10_230)] text-lg hover:to-[oklch(0.45_0.10_230)]/90"
            >
              <Link href="/auth/sign-up?role=client">
                Start Application
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg">
              <Link href="/demo">View Demo</Link>
            </Button>
          </div>

          <p className="animate-fade-up animation-delay-400 text-muted-foreground mt-6 text-sm">
            No credit card required. Takes about 5 minutes.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/50 bg-muted/20 border-t px-4 py-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/insurflow-logo-no-bg.png"
                alt="InsurFlow"
                width={24}
                height={24}
              />
              <span className="text-foreground text-sm font-medium">
                InsurFlow
              </span>
            </div>
            <div className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} Vero Ventures. All rights
              reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
