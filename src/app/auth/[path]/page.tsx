import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

const features = [
  {
    title: "Sub-5 Minute Workflows",
    description:
      "Complete comprehensive financial analysis before your client finishes their coffee",
  },
  {
    title: "AI-Powered Documents",
    description:
      "Generate compliant 'Reasons Why' letters and cover letters instantly",
  },
  {
    title: "Visual Estate Planning",
    description:
      "Interactive dashboards that make complex estate planning crystal clear",
  },
  {
    title: "Mobile-First Design",
    description:
      "Full functionality on iPad — conduct meetings anywhere, anytime",
  },
];

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] w-full flex-col lg:flex-row">
      {/* Branding Panel - Stacked on Mobile, Side-by-Side on Desktop */}
      <div className="bg-primary text-primary-foreground flex flex-col justify-between p-6 lg:w-1/2 lg:p-12">
        <div className="flex flex-col space-y-4 lg:space-y-8">
          {/* Logo & Tagline */}
          <div className="space-y-2 lg:space-y-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/insurflow-logo.png"
                alt="InsurFlow"
                width={48}
                height={48}
                className="rounded-lg"
                priority
              />
              <h1 className="text-2xl font-bold lg:text-3xl">InsurFlow</h1>
            </div>
            <p className="text-primary-foreground/90 text-base font-medium lg:text-lg">
              The fastest path from client data to insurance recommendation —
              powered by AI.
            </p>
          </div>

          {/* Value Proposition - Hidden on Mobile */}
          <div className="hidden space-y-6 lg:block">
            <h2 className="text-xl font-semibold">
              Built for US Life Insurance Advisors
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              Replace archaic spreadsheets with a modern, AI-native platform
              that automates complex estate planning, income replacement
              modeling, and compliance document generation.
            </p>
          </div>

          {/* Feature Highlights - Compact on Mobile, Full on Desktop */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col lg:gap-0 lg:space-y-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start space-x-2 lg:space-x-3"
              >
                <CheckCircle2 className="text-primary-foreground/90 mt-0.5 h-4 w-4 flex-shrink-0 lg:h-5 lg:w-5" />
                <div>
                  <h3 className="text-primary-foreground text-sm font-semibold lg:text-base">
                    {feature.title}
                  </h3>
                  <p className="text-primary-foreground/70 hidden text-sm lg:block">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Hidden on Mobile */}
        <div className="text-primary-foreground/60 mt-4 hidden text-sm lg:block">
          <p>
            © {new Date().getFullYear()} Vero Ventures. All rights reserved.
          </p>
        </div>
      </div>

      {/* Auth Form Panel */}
      <div className="bg-muted/30 flex w-full items-center justify-center p-4 lg:w-1/2 lg:p-8">
        <div className="w-full max-w-sm">
          <AuthView
            path={path}
            classNames={{
              base: "w-full shadow-sm border bg-card",
            }}
          />
        </div>
      </div>
    </main>
  );
}
