"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, ArrowRight } from "lucide-react";
import { ClientReportView } from "@/components/clients/client-report-view";
import {
  demoClient,
  demoAssets,
  demoDebts,
  demoInsuranceResult,
  demoLetter,
} from "@/lib/demo-data";

/**
 * Demo page showing a pre-populated sample client report.
 * Allows prospects to explore the app without authentication.
 */
export default function DemoPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        {/* Demo Header */}
        <div className="animate-fade-up mb-8">
          {/* Back button */}
          <Button variant="ghost" asChild className="mb-6 -ml-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          {/* Title section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight lg:text-4xl">
                  Interactive Demo
                </h1>
                <Badge
                  variant="outline"
                  className="border-emerald bg-emerald/5 text-emerald flex items-center gap-1.5 px-3 py-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Sample Data
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                Explore a complete financial needs analysis report for a typical
                mid-career professional. This demo showcases how InsurFlow
                calculates insurance needs and generates compliance documents.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Report View */}
        <div className="animate-fade-up animation-delay-200">
          <ClientReportView
            client={demoClient}
            clientId={demoClient.id}
            demoAssets={demoAssets}
            demoDebts={demoDebts}
            demoInsuranceResult={demoInsuranceResult}
            demoLetter={demoLetter}
          />
        </div>

        {/* CTA Section */}
        <div className="animate-fade-up animation-delay-300 relative mt-12 overflow-hidden rounded-2xl print:hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.05_250)] to-[oklch(0.28_0.06_240)]" />

          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[oklch(0.696_0.17_162.48_/_0.2)] to-transparent blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-tr from-[oklch(0.45_0.1_230_/_0.15)] to-transparent blur-2xl" />

          {/* Content */}
          <div className="relative z-10 px-8 py-10 text-center sm:py-12">
            <h2 className="font-display mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready to create your own analyses?
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-white/70">
              Sign up for free and start building professional financial needs
              reports for your clients in minutes.
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
