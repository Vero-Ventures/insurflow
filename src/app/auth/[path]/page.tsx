import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  FileText,
  BarChart3,
  Smartphone,
  Shield,
  Zap,
} from "lucide-react";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

const features = [
  {
    icon: Clock,
    title: "5-Minute Analysis",
    description:
      "Complete comprehensive financial analysis before your client finishes their coffee",
  },
  {
    icon: FileText,
    title: "Instant Compliance",
    description:
      "Generate 'Reasons Why' letters and cover letters that satisfy regulators",
  },
  {
    icon: BarChart3,
    title: "Visual Dashboards",
    description:
      "Interactive charts that make complex estate planning crystal clear",
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    description:
      "Full functionality on iPad and mobile. Conduct meetings anywhere",
  },
];

const stats = [
  { value: "90%", label: "Time Saved" },
  { value: "50+", label: "Beta Advisors" },
  { value: "100%", label: "Compliance Rate" },
];

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  // Determine if this is sign-up or sign-in for contextual copy
  const isSignUp = path === "sign-up";

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] w-full flex-col lg:flex-row">
      {/* Branding Panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-[oklch(0.22_0.05_250)] p-6 text-white lg:w-1/2 lg:p-12 dark:bg-[oklch(0.18_0.04_250)]">
        {/* Background decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Gradient orb top-right */}
          <div className="absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent blur-3xl" />
          {/* Gradient orb bottom-left */}
          <div className="absolute -bottom-32 -left-32 h-[300px] w-[300px] rounded-full bg-gradient-to-tr from-white/10 via-white/5 to-transparent blur-3xl" />
          {/* Wave pattern echoing logo */}
          <svg
            className="absolute right-0 bottom-0 h-full w-1/2 opacity-[0.07]"
            viewBox="0 0 400 800"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M50,0 Q250,200 150,400 T250,800"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M150,0 Q350,200 250,400 T350,800"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M250,0 Q450,200 350,400 T450,800"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col space-y-6 lg:space-y-10">
          {/* Logo & Tagline */}
          <div className="space-y-3 lg:space-y-5">
            <div className="flex items-center space-x-3">
              <Image
                src="/insurflow-logo-no-bg.png"
                alt="InsurFlow"
                width={52}
                height={52}
                className="drop-shadow-lg"
                priority
              />
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-normal lg:text-3xl">
                  InsurFlow
                </h1>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">
                    Private Beta
                  </span>
                </div>
              </div>
            </div>
            <p className="max-w-md text-base leading-relaxed font-medium text-white/90 lg:text-lg">
              The AI-powered platform that turns client data into insurance
              recommendations in{" "}
              <span className="text-emerald-400">under 5 minutes</span>.
            </p>
          </div>

          {/* Stats row - Desktop only */}
          <div className="hidden gap-8 lg:flex">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-[family-name:var(--font-display)] text-3xl font-normal text-emerald-400">
                  {stat.value}
                </div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Value Proposition - Desktop only */}
          <div className="hidden space-y-4 lg:block">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Shield className="text-emerald h-5 w-5" />
              Built for US Life Insurance Advisors
            </h2>
            <p className="max-w-md leading-relaxed text-white/80">
              Replace archaic spreadsheets with a modern, AI-native platform
              that automates estate planning, income replacement modeling, and
              compliance document generation.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group flex items-start space-x-2 rounded-lg bg-white/5 p-2.5 transition-colors hover:bg-white/10 lg:space-x-3 lg:p-3"
              >
                <div className="bg-emerald/20 text-emerald flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg lg:h-10 lg:w-10">
                  <feature.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white lg:text-base">
                    {feature.title}
                  </h3>
                  <p className="mt-0.5 hidden text-xs leading-relaxed text-white/70 lg:line-clamp-2 lg:block">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Desktop only */}
        <div className="relative z-10 mt-6 hidden text-sm text-white/50 lg:block">
          <p>
            &copy; {new Date().getFullYear()} Vero Ventures. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* Auth Form Panel */}
      <div className="relative flex w-full items-center justify-center p-4 lg:w-1/2 lg:p-8">
        {/* Subtle background gradient */}
        <div className="from-primary/[0.02] to-emerald/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Welcome text */}
          <div className="mb-6 text-center lg:mb-8">
            <h2 className="text-foreground font-[family-name:var(--font-display)] text-2xl font-normal lg:text-3xl">
              {isSignUp ? "Join the Beta" : "Welcome Back"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {isSignUp
                ? "Create your account to get early access"
                : "Sign in to continue to InsurFlow"}
            </p>
          </div>

          <AuthView
            path={path}
            classNames={{
              base: "w-full shadow-lg border border-border/50 bg-card rounded-xl",
            }}
          />

          {/* Trust badges below form */}
          <div className="text-muted-foreground mt-6 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Shield className="text-emerald h-3.5 w-3.5" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="text-emerald h-3.5 w-3.5" />
              <span>FINRA Aligned</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
