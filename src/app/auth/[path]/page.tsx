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
    <main className="flex min-h-[calc(100vh-3.5rem)] w-full">
      {/* Left Panel - Branding & Marketing (Hidden on Mobile) */}
      <div className="bg-primary text-primary-foreground hidden flex-col justify-between p-12 lg:flex lg:w-1/2">
        <div className="flex flex-col space-y-8">
          {/* Logo & Tagline */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/insurflow-logo.png"
                alt="InsurFlow"
                width={48}
                height={48}
                className="rounded-lg"
                priority
              />
              <h1 className="text-3xl font-bold">InsurFlow</h1>
            </div>
            <p className="text-primary-foreground/90 text-lg font-medium">
              The fastest path from client data to insurance recommendation —
              powered by AI.
            </p>
          </div>

          {/* Value Proposition */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">
              Built for Canadian Life Insurance Advisors
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              Replace archaic spreadsheets with a modern, AI-native platform
              that automates complex estate planning, income replacement
              modeling, and compliance document generation.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start space-x-3">
                <CheckCircle2 className="text-primary-foreground/90 mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <h3 className="text-primary-foreground font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-primary-foreground/70 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-primary-foreground/60 text-sm">
          <p>
            © {new Date().getFullYear()} Vero Ventures. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="bg-muted/30 flex w-full items-center justify-center p-4 lg:w-1/2">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile Logo (Visible on Mobile Only) */}
          <div className="mb-6 flex flex-col items-center space-y-2 lg:hidden">
            <Image
              src="/insurflow-logo.png"
              alt="InsurFlow"
              width={64}
              height={64}
              className="rounded-lg"
              priority
            />
            <h1 className="text-2xl font-bold">InsurFlow</h1>
            <p className="text-muted-foreground text-center text-sm">
              AI-powered financial analysis for insurance advisors
            </p>
          </div>

          {/* Auth Form */}
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
