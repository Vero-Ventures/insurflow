"use client";

import { useCallback, useState } from "react";
import { Check, Copy, LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraftResumeLinkProps {
  clientId: string;
}

/**
 * Client component for generating and copying a D2C resume link.
 *
 * Calls POST /api/d2c/resume-links to generate a time-limited token,
 * then copies the full URL to clipboard with user feedback.
 */
export function DraftResumeLink({ clientId }: DraftResumeLinkProps) {
  const [state, setState] = useState<"idle" | "loading" | "copied" | "error">(
    "idle",
  );

  const handleGenerateLink = useCallback(async () => {
    setState("loading");

    try {
      const res = await fetch("/api/d2c/resume-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      if (!res.ok) {
        setState("error");
        return;
      }

      const json = (await res.json()) as {
        resumeUrl?: string;
        data?: { resumeUrl?: string };
      };

      const resumePath = json.resumeUrl ?? json.data?.resumeUrl;
      if (!resumePath) {
        setState("error");
        return;
      }

      // Build full URL from relative path
      const fullUrl = `${window.location.origin}${resumePath}`;
      await navigator.clipboard.writeText(fullUrl);
      setState("copied");

      // Reset back to idle after 2 seconds
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      // Reset back to idle after 3 seconds
      setTimeout(() => setState("idle"), 3000);
    }
  }, [clientId]);

  return (
    <Button
      variant="outline"
      onClick={handleGenerateLink}
      disabled={state === "loading"}
      className="gap-2"
    >
      {state === "loading" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Generating...
        </>
      )}
      {state === "copied" && (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          Link copied!
        </>
      )}
      {state === "error" && (
        <>
          <LinkIcon className="h-4 w-4" aria-hidden="true" />
          Failed - try again
        </>
      )}
      {state === "idle" && (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy resume link
        </>
      )}
    </Button>
  );
}
