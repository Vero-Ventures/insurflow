"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { initPostHog, trackPageView } from "@/lib/posthog";

function PostHogPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackPageView({
      feature: "pageview",
      route: sanitizeAnalyticsRoute(pathname),
      source: searchParams.toString() ? "navigation+query" : "navigation",
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
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

function sanitizeAnalyticsRoute(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => {
      if (!segment) {
        return segment;
      }

      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          segment,
        ) ||
        /^[A-Za-z0-9_-]{20,}$/.test(segment)
      ) {
        return "[param]";
      }

      return segment;
    })
    .join("/");
}
