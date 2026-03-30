"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/client-utils";
import { loadD2cIntake } from "@/lib/d2c/intake-storage";
import { complianceConfig } from "@/lib/d2c/compliance-config";
import { submitApplicationAction } from "@/app/apply/submit/actions";

interface ReviewFormProps {
  /**
   * The server-validated client ID for this D2C submission.
   * Signed-out users can still review consent copy before sign-up, so this
   * may be null until an authenticated draft is available.
   */
  clientId: string | null;
  /** Optional estimate run ID linking this submission to a persisted estimate. */
  estimateRunId?: string;
}

export default function ReviewForm({
  clientId,
  estimateRunId,
}: ReviewFormProps) {
  const router = useRouter();
  const [consentTransmit, setConsentTransmit] = useState(false);
  const [healthInfoAuth, setHealthInfoAuth] = useState(false);
  const [esignIntent, setEsignIntent] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const intake = useMemo(() => loadD2cIntake(), []);

  const allConsentsAccepted = consentTransmit && healthInfoAuth && esignIntent;
  const estimateUrl = clientId
    ? `/apply/estimate?clientId=${encodeURIComponent(clientId)}`
    : "/apply/estimate";

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
            Step 4 of 4
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Review and consent
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review your details and accept the required disclosures before
            submitting.
          </p>
        </section>

        <Card className="border-border/60 bg-card/80 p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">
            Your details
          </h2>
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
          <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">
            Required disclosures
          </h2>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-transmit"
                checked={consentTransmit}
                onCheckedChange={(checked) =>
                  setConsentTransmit(checked === true)
                }
              />
              <Label
                htmlFor="consent-transmit"
                className="text-sm leading-relaxed font-normal whitespace-pre-line"
              >
                {complianceConfig.transmitConsentText}
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-health"
                checked={healthInfoAuth}
                onCheckedChange={(checked) =>
                  setHealthInfoAuth(checked === true)
                }
              />
              <Label
                htmlFor="consent-health"
                className="text-sm leading-relaxed font-normal"
              >
                {complianceConfig.healthAuthorizationText}
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-esign"
                checked={esignIntent}
                onCheckedChange={(checked) => setEsignIntent(checked === true)}
              />
              <Label
                htmlFor="consent-esign"
                className="text-sm leading-relaxed font-normal"
              >
                {complianceConfig.esignIntentText}
              </Label>
            </div>
          </div>
        </Card>

        <form action={submitApplicationAction}>
          <input type="hidden" name="clientId" value={clientId ?? ""} />
          <input
            type="hidden"
            name="consentTransmit"
            value={consentTransmit ? "true" : "false"}
          />
          <input
            type="hidden"
            name="healthInfoAuth"
            value={healthInfoAuth ? "true" : "false"}
          />
          <input
            type="hidden"
            name="esignIntent"
            value={esignIntent ? "true" : "false"}
          />
          <input
            type="hidden"
            name="consentConfirmed"
            value={allConsentsAccepted ? "true" : "false"}
          />
          {estimateRunId && (
            <input type="hidden" name="estimateRunId" value={estimateRunId} />
          )}

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(estimateUrl)}
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
                type="submit"
                className="bg-emerald hover:bg-emerald/90"
                disabled={!allConsentsAccepted}
              >
                Submit application
              </Button>
            </SignedIn>
          </div>
        </form>
      </div>
    </main>
  );
}
