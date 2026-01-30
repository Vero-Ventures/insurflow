import { AuthStatus } from "@/components/auth-status";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calculator, FileText, Users, Sparkles } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Management",
    description:
      "Organize client profiles with demographics, assets, debts, and financial inputs in one place.",
  },
  {
    icon: Calculator,
    title: "Insurance Needs Analysis",
    description:
      "Calculate income replacement, debt payoff, and estate settling requirements automatically.",
  },
  {
    icon: FileText,
    title: "Compliance Reports",
    description:
      'Generate "Reasons Why" letters and cover letters that meet regulatory requirements.',
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description:
      "Leverage GenAI to draft documents and surface personalized recommendations.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-16">
        <div className="container flex max-w-4xl flex-col items-center text-center">
          <Badge variant="secondary" className="mb-4">
            Pre-Alpha Demo
          </Badge>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            InsurFlow
          </h1>

          <p className="mb-2 max-w-2xl text-lg text-slate-300 sm:text-xl">
            AI-powered financial needs analysis for life insurance advisors
          </p>

          <p className="mb-8 max-w-xl text-sm text-slate-400">
            Modernizing how advisors analyze client needs, calculate coverage
            requirements, and generate compliance documentation.
          </p>

          <AuthStatus />
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 px-4 py-16">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              What We&apos;re Building
            </h2>
            <p className="text-muted-foreground">
              Replacing archaic spreadsheets with a modern, intelligent platform
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-muted bg-card/50 hover:bg-card transition-colors"
              >
                <CardHeader>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <p className="text-muted-foreground mt-10 text-center text-sm">
            This is an early demo. Features are actively being developed and may
            change.
          </p>
        </div>
      </section>
    </main>
  );
}
