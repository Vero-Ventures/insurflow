"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { initPostHog, trackPageView } from "@/lib/posthog";

/**
 * PostHog Page Tracking Component
 * Tracks page views when route changes
 */
function PostHogPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views when route changes
  useEffect(() => {
    if (pathname) {
      trackPageView();
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * PostHog Provider Component
 * Initializes PostHog and tracks page views
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageTracker />
      </Suspense>
      {children}
    </>
  );
}
