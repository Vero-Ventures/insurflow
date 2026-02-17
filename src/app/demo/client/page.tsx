"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Calculator,
  Sparkles,
  FileText,
  Printer,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  demoClient,
  demoAssets,
  demoDebts,
  demoInsuranceResult,
  demoLetter,
} from "@/lib/demo-data";
import { calculateAge, formatCurrency } from "@/lib/client-utils";
import { useDemoContext } from "@/components/demo/demo-context";
import { TourOverlay } from "@/components/demo/tour-overlay";
import { clientDetailTourSteps } from "@/components/demo/tour-steps";
import { InsuranceNeedsCard } from "@/components/clients/insurance-needs/insurance-needs-card";
import { InsuranceNeedsChart } from "@/components/clients/insurance-needs/insurance-needs-chart";
import { AssetsSummary } from "@/components/clients/assets-summary";
import { DebtsSummary } from "@/components/clients/debts-summary";
import { AISummaryCard } from "@/components/clients/ai-summary-card";
import { ClientReportView } from "@/components/clients/client-report-view";

/**
 * Demo client detail page showing the full analysis experience.
 * Includes tabs for profile, calculation, AI letter, and report.
 */
export default function DemoClientPage() {
  const { state, nextTourStep, prevTourStep, setShowTour } = useDemoContext();
  const [activeTab, setActiveTab] = useState("insurance");
  const [showTypingEffect, setShowTypingEffect] = useState(false);
  const [typedLetter, setTypedLetter] = useState("");

  // Typing effect for AI letter
  useEffect(() => {
    if (!showTypingEffect) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < demoLetter.length) {
        setTypedLetter(demoLetter.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 5); // Fast typing speed

    return () => clearInterval(interval);
  }, [showTypingEffect]);

  const handleGenerateLetter = () => {
    setShowTypingEffect(true);
    setActiveTab("letter");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        {/* Client Header */}
        <div className="animate-fade-up mb-8" data-tour="client-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.696_0.17_162.48)] to-[oklch(0.55_0.14_175)] text-lg font-semibold text-white">
                {demoClient.firstName.charAt(0)}
                {demoClient.lastName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
                    {demoClient.firstName} {demoClient.lastName}
                  </h1>
                  <Badge
                    variant="outline"
                    className="border-emerald/20 bg-emerald/10 text-emerald"
                  >
                    Active
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  {calculateAge(demoClient.dateOfBirth)} years old •{" "}
                  {demoClient.state} •{" "}
                  {demoClient.hasSpouse ? "Married" : "Single"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setActiveTab("report");
                  setTimeout(() => {
                    window.dispatchEvent(new Event("insurflow:print-report"));
                  }, 150);
                }}
                data-tour="print-button"
              >
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="animate-fade-up animation-delay-100 mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-border/60 p-4">
            <p className="text-muted-foreground text-sm">Annual Income</p>
            <p className="text-foreground font-currency text-xl font-semibold">
              {formatCurrency(Number(demoClient.clientIncome))}
            </p>
          </Card>
          <Card className="border-border/60 p-4">
            <p className="text-muted-foreground text-sm">Total Assets</p>
            <p className="text-emerald font-currency text-xl font-semibold">
              {formatCurrency(
                demoAssets.reduce((sum, a) => sum + Number(a.currentValue), 0),
              )}
            </p>
          </Card>
          <Card className="border-border/60 p-4">
            <p className="text-muted-foreground text-sm">Total Debts</p>
            <p className="text-chart-3 font-currency text-xl font-semibold">
              {formatCurrency(
                demoDebts.reduce((sum, d) => sum + Number(d.currentBalance), 0),
              )}
            </p>
          </Card>
          <Card className="border-border/60 p-4">
            <p className="text-muted-foreground text-sm">Insurance Need</p>
            <p className="text-primary font-currency text-xl font-semibold">
              {formatCurrency(demoInsuranceResult.totalInsuranceNeeds)}
            </p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="animate-fade-up animation-delay-150"
        >
          <TabsList
            className="mb-6 flex w-full flex-wrap justify-start gap-1 sm:grid sm:grid-cols-4"
            data-tour="client-tabs"
          >
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Insurance</span>
            </TabsTrigger>
            <TabsTrigger value="letter" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Letter</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Client Info */}
              <Card className="border-border/60 p-6">
                <h3 className="text-foreground mb-4 font-semibold">
                  Client Information
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Full Name</dt>
                    <dd className="text-foreground font-medium">
                      {demoClient.firstName} {demoClient.lastName}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Age</dt>
                    <dd className="text-foreground font-medium">
                      {calculateAge(demoClient.dateOfBirth)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">State</dt>
                    <dd className="text-foreground font-medium">
                      {demoClient.state}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Health Rating</dt>
                    <dd className="text-foreground font-medium capitalize">
                      {demoClient.healthRating?.replace("_", " ")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Smoker</dt>
                    <dd className="text-foreground font-medium">
                      {demoClient.smoker ? "Yes" : "No"}
                    </dd>
                  </div>
                </dl>
              </Card>

              {/* Financial Summary */}
              <Card className="border-border/60 p-6">
                <h3 className="text-foreground mb-4 font-semibold">
                  Financial Summary
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Client Income</dt>
                    <dd className="text-foreground font-currency font-medium">
                      {formatCurrency(Number(demoClient.clientIncome))}
                    </dd>
                  </div>
                  {demoClient.spouseIncome && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Spouse Income</dt>
                      <dd className="text-foreground font-currency font-medium">
                        {formatCurrency(Number(demoClient.spouseIncome))}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Income Replacement %
                    </dt>
                    <dd className="text-foreground font-medium">
                      {demoClient.incomeReplacementPercent}%
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Replacement Duration
                    </dt>
                    <dd className="text-foreground font-medium">
                      {demoClient.replacementDurationYears} years
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Existing Coverage</dt>
                    <dd className="text-foreground font-currency font-medium">
                      {formatCurrency(
                        Number(demoClient.existingLifeInsuranceCoverage),
                      )}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>

            {/* Assets & Debts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <AssetsSummary items={demoAssets} />
              <DebtsSummary
                items={demoDebts}
                totalAssets={demoAssets.reduce(
                  (sum, a) => sum + Number(a.currentValue),
                  0,
                )}
              />
            </div>

            {/* Goals */}
            <Card className="border-border/60 p-6">
              <h3 className="text-foreground mb-4 font-semibold">
                Additional Goals
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {demoClient.additionalGoals}
              </p>
            </Card>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div data-tour="insurance-needs">
                <InsuranceNeedsCard
                  result={demoInsuranceResult}
                  isLoading={false}
                  error={null}
                  calculatedAt="2026-02-08T14:30:00.000Z"
                  isReadOnly
                />
              </div>
              <div data-tour="insurance-chart">
                <Card className="border-border/60 p-6">
                  <h3 className="text-foreground mb-4 font-semibold">
                    Coverage Breakdown
                  </h3>
                  <InsuranceNeedsChart result={demoInsuranceResult} />
                </Card>
              </div>
            </div>

            {/* Call to action */}
            <Card className="border-emerald/20 bg-emerald/5 p-6">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div>
                  <h3 className="text-foreground font-semibold">
                    Ready to generate the compliance letter?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Our AI will create a professional &quot;Reasons Why&quot;
                    letter based on this analysis.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateLetter}
                  className="gap-2 bg-gradient-to-r from-[oklch(0.627_0.265_303.9)] to-[oklch(0.5_0.2_280)] text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate AI Letter
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* AI Letter Tab */}
          <TabsContent value="letter" className="space-y-6">
            <div data-tour="ai-letter">
              {showTypingEffect ? (
                <Card className="border-border/60 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.627_0.265_303.9)] to-[oklch(0.5_0.2_280)]">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">
                        AI Recommendation Letter
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {typedLetter.length === demoLetter.length
                          ? "Generation complete"
                          : "Generating..."}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/20 border-border/60 rounded-xl border p-6 font-serif text-sm leading-relaxed whitespace-pre-wrap">
                    {typedLetter}
                    {typedLetter.length < demoLetter.length && (
                      <span className="animate-pulse">|</span>
                    )}
                  </div>
                  {typedLetter.length === demoLetter.length && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => setActiveTab("report")}
                        className="bg-emerald hover:bg-emerald/90 gap-2"
                      >
                        View Full Report
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <AISummaryCard
                  clientId={demoClient.id}
                  demoLetter={demoLetter}
                />
              )}
            </div>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            <div data-tour="report-section">
              <ClientReportView
                client={demoClient}
                clientId={demoClient.id}
                demoAssets={demoAssets}
                demoDebts={demoDebts}
                demoInsuranceResult={demoInsuranceResult}
                demoLetter={demoLetter}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Final CTA */}
        {activeTab === "report" && (
          <div className="animate-fade-up mt-12 text-center">
            <Card className="border-emerald/20 bg-emerald/5 mx-auto max-w-2xl p-8">
              <h2 className="font-display text-foreground mb-2 text-2xl font-semibold">
                Ready to create your own analyses?
              </h2>
              <p className="text-muted-foreground mb-6">
                Sign up free and start building professional financial needs
                reports for your clients in minutes.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-emerald hover:bg-emerald/90 gap-2"
                >
                  <Link href="/auth/sign-up">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Tour Overlay */}
      <TourOverlay
        steps={clientDetailTourSteps}
        currentStep={state.currentTourStep}
        onNext={() => {
          if (state.currentTourStep >= clientDetailTourSteps.length - 1) {
            setShowTour(false);
          } else {
            nextTourStep();
          }
        }}
        onPrev={prevTourStep}
        onSkip={() => setShowTour(false)}
        isVisible={state.showTour}
      />
    </div>
  );
}
