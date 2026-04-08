"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { authClient } from "@/server/better-auth/client";
import {
  identifyUser,
  initPostHog,
  resetUser,
  trackEvent,
  trackPageView,
} from "@/lib/posthog";

function PostHogSessionTracker() {
  const { data: session } = authClient.useSession();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;
    const prevUserId = prevUserIdRef.current;

    if (prevUserId && currentUserId !== prevUserId) {
      resetUser();
    }

    if (currentUserId && currentUserId !== prevUserId) {
      identifyUser(currentUserId, {
        feature: "auth",
        source: "session",
      });

      if (prevUserId === null) {
        trackEvent({
          name: "auth_signed_in",
          properties: {
            feature: "auth",
            outcome: "succeeded",
            source: "session",
          },
        });
      }
    }

    prevUserIdRef.current = currentUserId;
  }, [session?.user?.id]);

  return null;
}

function PostHogPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackPageView({
      feature: "pageview",
      route: sanitizeAnalyticsRoute(pathname),
      source: queryString ? "navigation+query" : "navigation",
    });
  }, [pathname, queryString]);

  return null;
}

export function PostHogProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogSessionTracker />
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
        /^\d+$/.test(segment) ||
        /^[A-Za-z0-9_-]{20,}$/.test(segment)
      ) {
        return "[param]";
      }

      return segment;
    })
    .join("/");
}
