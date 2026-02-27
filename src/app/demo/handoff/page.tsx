"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  FileCheck2,
  MessageCircle,
  Share2,
  Copy,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useDemoContext } from "@/components/demo/demo-context";
import { useDemoInsuranceNeeds } from "@/components/demo/use-demo-insurance-needs";
import { toast } from "sonner";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;

const nextSteps = [
  {
    title: "Book your review",
    description: "Pick a time that works for you.",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  {
    title: "Review your estimate together",
    description: "Confirm your numbers and family priorities.",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    title: "Get a personalized recommendation",
    description: "Receive next steps tailored to your situation.",
    icon: <FileCheck2 className="h-4 w-4" />,
  },
];

export default function DemoHandoffPage() {
  const { state } = useDemoContext();
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { result } = useDemoInsuranceNeeds({
    annualHouseholdIncome: state.intakeData.annualHouseholdIncome,
    totalDebts: state.intakeData.totalDebts,
    currentCoverage: state.intakeData.currentCoverage,
    incomeReplacementPercent:
      state.analysisAssumptions.incomeReplacementPercent,
    replacementDurationYears:
      state.analysisAssumptions.replacementDurationYears,
    liquidAssets: state.analysisAssumptions.liquidAssets,
  });

  const coverageGap = result
    ? Math.max(0, result.totalInsuranceNeeds - result.existingCoverage)
    : 0;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Demo",
          lastName: "User",
          email: "demo@example.com",
          householdStatus: state.intakeData.householdStatus,
          annualHouseholdIncome: state.intakeData.annualHouseholdIncome,
          totalDebts: state.intakeData.totalDebts || undefined,
          currentCoverage: state.intakeData.currentCoverage || undefined,
          primaryGoal: state.intakeData.primaryGoal || undefined,
          estimatedCoverageNeed: result?.totalInsuranceNeeds.toString() || "0",
          estimatedGap: coverageGap.toString(),
          estimatedPremium: "0", // Premium calculation not available in demo
          scenarioId: state.selectedScenarioId,
          incomeReplacementPercent:
            state.analysisAssumptions.incomeReplacementPercent,
          replacementDurationYears:
            state.analysisAssumptions.replacementDurationYears,
          liquidAssets: state.analysisAssumptions.liquidAssets,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate share link");
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
      toast.success("Share link generated!");
    } catch {
      toast.error("Failed to generate share link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              Step {CURRENT_STEP} of {TOTAL_STEPS}
            </span>
            <div className="bg-border h-1.5 w-32 overflow-hidden rounded-full">
              <div className="bg-emerald h-full" style={{ width: "100%" }} />
            </div>
          </div>

          <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
            Review your estimate with an advisor
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            You are at the final step. A human advisor helps validate your
            estimate and make sure the recommendation fits real-life goals.
          </p>
        </div>

        <Card className="border-border/60 p-6">
          <h2 className="text-foreground text-lg font-semibold">
            What happens next
          </h2>
          <div className="mt-4 space-y-4">
            {nextSteps.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary mt-0.5 flex h-8 w-8 items-center justify-center rounded-full">
                  {step.icon}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {index + 1}. {step.title}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-emerald/20 bg-emerald/5 mt-6 p-4">
          <Badge
            variant="outline"
            className="border-emerald/30 bg-emerald/10 text-emerald"
          >
            Advisor view note
          </Badge>
          <p className="mt-2 text-sm leading-relaxed">
            Your intake, interactive estimate, AI draft letter, and report
            preview are ready for advisor follow-up.
          </p>
        </Card>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            className="bg-emerald hover:bg-emerald/90 gap-2"
            onClick={() => setShowSharePanel(true)}
          >
            <Share2 className="h-4 w-4" />
            Share with Advisor
          </Button>
          <Button variant="outline" asChild>
            <Link href="/demo">Restart Demo</Link>
          </Button>
        </div>

        {showSharePanel && (
          <Card className="border-border/60 mt-6">
            <div className="m-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald/10 text-emerald flex h-12 w-12 items-center justify-center rounded-full">
                  <Share2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Share your estimate</h3>
                  <p className="text-muted-foreground text-sm">
                    Generate a link to share with an advisor
                  </p>
                </div>
              </div>

              {!shareUrl ? (
                <Button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="bg-emerald hover:bg-emerald/90 w-full gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating link...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Generate Share Link
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      {isCopied ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    This link is valid for 2 days. The advisor will be able to
                    view your estimate without needing an account.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSharePanel(false)}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
