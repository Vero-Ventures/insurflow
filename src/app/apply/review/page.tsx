"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/client-utils";
import { loadD2cIntake } from "@/lib/d2c/intake-storage";

export default function ApplyReviewPage() {
  const router = useRouter();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const intake = useMemo(() => loadD2cIntake(), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration flag intentionally flips once after mount
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <main className="min-h-[calc(100vh-3.5rem)]" />;
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="space-y-2">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Step 3 of 4
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Review your application details
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Confirm your intake details before submission.
          </p>
        </section>

        <Card className="border-border/60 bg-card/80 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="text-sm">
              Province: <strong>{intake.province || "-"}</strong>
            </p>
            <p className="text-sm">
              Date of birth: <strong>{intake.dateOfBirth || "-"}</strong>
            </p>
            <p className="text-sm">
              Tobacco use: <strong>{intake.tobaccoUse ? "Yes" : "No"}</strong>
            </p>
            <p className="text-sm">
              Annual income:{" "}
              <strong>{formatCurrency(intake.annualIncome)}</strong>
            </p>
            <p className="text-sm">
              Desired coverage:{" "}
              <strong>{formatCurrency(intake.coverageAmount)}</strong>
            </p>
            <p className="text-sm">
              Term length: <strong>{intake.termYears} years</strong>
            </p>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consentAccepted}
              onCheckedChange={(checked) =>
                setConsentAccepted(checked === true)
              }
            />
            <Label
              htmlFor="consent"
              className="text-sm leading-relaxed font-normal"
            >
              I confirm this information is accurate to the best of my knowledge
              and I consent to proceed with a term-life application review.
            </Label>
          </div>
        </Card>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/apply/estimate")}
          >
            Back to estimate
          </Button>

          <SignedOut>
            <Button asChild className="bg-emerald hover:bg-emerald/90">
              <Link href="/auth/sign-up?role=client">Sign up to submit</Link>
            </Button>
          </SignedOut>

          <SignedIn>
            <Button
              className="bg-emerald hover:bg-emerald/90"
              disabled={!consentAccepted}
              onClick={() => router.push("/apply/submit")}
            >
              Submit application
            </Button>
          </SignedIn>
        </div>
      </div>
    </main>
  );
}
