"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Building2,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ShareLinkData {
  id: string;
  token: string;
  status: string;
  expiresAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  householdStatus: string | null;
  annualHouseholdIncome: string | null;
  totalDebts: string | null;
  currentCoverage: string | null;
  primaryGoal: string | null;
  estimatedCoverageNeed: string | null;
  estimatedGap: string | null;
  scenarioId: string | null;
  incomeReplacementPercent: string | null;
  replacementDurationYears: number | null;
  liquidAssets: string | null;
  viewedAt: string | null;
  interestedAt: string | null;
  createdAt: string;
}

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "—";
  const num = Number(value);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatCurrencyInput(value: string): string {
  const num = Number(value);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function getHouseholdStatusLabel(status: string | null): string {
  if (!status) return "Not specified";
  const labels: Record<string, string> = {
    single: "Single",
    married: "Married",
    partnered: "Partnered",
    single_parent: "Single Parent",
  };
  return labels[status] || status;
}

function SharePageContent() {
  const params = useParams();
  const token = params.token as string;

  const [shareLink, setShareLink] = useState<ShareLinkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (token) {
      fetchShareLink();
    }
  }, [token]);

  const fetchShareLink = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/share-links/${token}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("This share link was not found or has expired");
        }
        if (response.status === 410) {
          throw new Error("This share link has expired");
        }
        throw new Error("Failed to load share link");
      }

      const data = await response.json();
      setShareLink(data.shareLink);

      if (data.shareLink.interestedAt) {
        setIsInterested(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterested = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/share-links/${token}/interested`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit interest");
      }

      setIsInterested(true);
      toast.success("Thank you! We'll be in touch soon.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit interest",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (isLoading) {
    return <SharePageSkeleton />;
  }

  if (error || !shareLink) {
    return (
      <div className="from-background to-muted/30 min-h-screen bg-gradient-to-b px-4 py-12">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Link Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || "This share link is no longer valid."}
            </p>
            <Button asChild>
              <Link href="/">Go to InsurFlow</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="from-background to-muted/30 min-h-screen bg-gradient-to-b px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <Badge variant="outline" className="mb-4">
            Estimate Summary
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Insurance Needs Estimate
          </h1>
          <p className="text-muted-foreground mt-2">
            Shared by {shareLink.firstName} {shareLink.lastName}
          </p>
        </div>

        {shareLink.status === "interested" && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">
                An advisor has been notified and will reach out soon.
              </span>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-emerald h-5 w-5" />
              Coverage Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">
                  Estimated Coverage Need
                </p>
                <p className="font-display text-emerald text-2xl font-bold">
                  {formatCurrencyInput(shareLink.estimatedCoverageNeed || "0")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">
                  Current Coverage
                </p>
                <p className="font-display text-2xl font-bold">
                  {formatCurrency(shareLink.currentCoverage)}
                </p>
              </div>
              {shareLink.estimatedGap && Number(shareLink.estimatedGap) > 0 && (
                <div className="rounded-lg bg-red-50 p-4 sm:col-span-2">
                  <p className="text-sm text-red-700">Potential Coverage Gap</p>
                  <p className="font-display text-2xl font-bold text-red-700">
                    {formatCurrencyInput(shareLink.estimatedGap)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Household Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">
                  Household Status
                </p>
                <p className="font-medium">
                  {getHouseholdStatusLabel(shareLink.householdStatus)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Annual Household Income
                </p>
                <p className="font-medium">
                  {formatCurrency(shareLink.annualHouseholdIncome)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Debts</p>
                <p className="font-medium">
                  {formatCurrency(shareLink.totalDebts)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Liquid Assets</p>
                <p className="font-medium">
                  {formatCurrency(shareLink.liquidAssets)}
                </p>
              </div>
              {shareLink.primaryGoal && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-sm">Primary Goal</p>
                  <p className="font-medium">{shareLink.primaryGoal}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={handleCopyLink} className="gap-2">
            {isCopied ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {isCopied ? "Copied!" : "Copy Link"}
          </Button>

          {!isInterested ? (
            <Button
              onClick={handleInterested}
              disabled={isSubmitting}
              className="bg-emerald hover:bg-emerald/90 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  I&apos;m Interested
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link href="/auth/sign-in">
                Sign in to manage lead
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-center text-sm">
          This link expires on{" "}
          {new Date(shareLink.expiresAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function SharePageSkeleton() {
  return (
    <div className="from-background to-muted/30 min-h-screen bg-gradient-to-b px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <Skeleton className="mx-auto mb-4 h-6 w-32" />
          <Skeleton className="mx-auto h-10 w-64" />
          <Skeleton className="mx-auto mt-2 h-5 w-48" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return <SharePageContent />;
}
