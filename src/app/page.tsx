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
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12 dark:from-slate-900 dark:to-slate-800">
        <div className="flex max-w-2xl flex-col items-center text-center">
          <Badge variant="secondary" className="mb-6">
            Pre-Alpha Demo
          </Badge>

          <h1 className="text-foreground mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            InsurFlow
          </h1>

          <p className="text-muted-foreground mb-6 max-w-lg text-base">
            AI-powered financial needs analysis for life insurance advisors.
            Modernizing how advisors analyze client needs and generate
            compliance documentation.
          </p>

          <AuthStatus />
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 px-4 py-12">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="mb-1 text-xl font-semibold tracking-tight">
              What We&apos;re Building
            </h2>
            <p className="text-muted-foreground text-sm">
              Replacing archaic spreadsheets with a modern, intelligent platform
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <Card
                key={feature.title}
                size="sm"
                className="border-border/50 bg-card/50 hover:bg-card transition-colors"
              >
                <CardHeader>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md">
                      <feature.icon className="h-4 w-4" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <p className="text-muted-foreground mt-8 text-center text-xs">
            This is an early demo. Features are actively being developed.
          </p>
        </div>
      </section>
    </main>
  );
}
