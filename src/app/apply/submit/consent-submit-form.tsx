"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ConsentSubmitFormProps {
  action: (formData: FormData) => Promise<void>;
}

/**
 * Client component for the final application submission form.
 *
 * Reads the consent flags written by the review page from sessionStorage.
 * If any consent is missing, redirects the user back to the review step.
 *
 * Passes consent values as hidden form fields to the server action so
 * the server can independently validate them.
 */
export default function ConsentSubmitForm({ action }: ConsentSubmitFormProps) {
  const router = useRouter();
  // null = loading, true = valid, false = invalid/redirecting
  const [consentsVerified, setConsentsVerified] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem("d2c_consents")
        : null;

    if (!stored) {
      router.replace("/apply/review");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        const p = parsed as Record<string, unknown>;
        const allGiven =
          p.consentTransmit === true &&
          p.healthInfoAuth === true &&
          p.esignIntent === true;
        if (!allGiven) {
          router.replace("/apply/review");
          return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading from sessionStorage on mount is valid
        setConsentsVerified(true);
      } else {
        router.replace("/apply/review");
      }
    } catch {
      router.replace("/apply/review");
    }
  }, [router]);

  // Still loading sessionStorage or redirecting
  if (!consentsVerified) {
    return null;
  }

  return (
    <form action={action} className="space-y-5">
      {/* Hidden consent fields — validated server-side */}
      <input type="hidden" name="consentTransmit" value="true" />
      <input type="hidden" name="healthInfoAuth" value="true" />
      <input type="hidden" name="esignIntent" value="true" />

      <div className="flex items-start gap-3">
        <input
          id="consent-confirmed"
          name="consentConfirmed"
          type="checkbox"
          value="true"
          required
          className="mt-1 h-4 w-4"
        />
        <Label
          htmlFor="consent-confirmed"
          className="text-sm leading-relaxed font-normal"
        >
          I confirm my details are accurate and I am ready to submit this
          term-life application for review.
        </Label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-emerald hover:bg-emerald/90">
          Submit application
        </Button>
      </div>
    </form>
  );
}
