import posthog from "posthog-js";

import { env } from "@/env";
import type {
  AnalyticsEvent,
  AnalyticsProperties,
} from "@/lib/analytics/event-schema";

let initialized = false;

export function isPostHogConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST);
}

export function initPostHog(): boolean {
  if (initialized || typeof window === "undefined" || !isPostHogConfigured()) {
    return initialized;
  }

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageleave: true,
    capture_pageview: false,
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    ui_host: env.NEXT_PUBLIC_POSTHOG_UI_HOST,
    loaded: (client) => {
      if (env.NODE_ENV === "development") {
        client.debug();
      }
    },
  });

  initialized = true;
  return true;
}

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") {
    return;
  }

  const didInitialize = initPostHog();
  if (!didInitialize) {
    return;
  }

  posthog.capture(event.name, sanitizeProperties(event.properties));
}

export function trackPageView(properties?: AnalyticsProperties): void {
  trackEvent({
    name: "page_viewed",
    properties: {
      ...properties,
      feature: properties?.feature ?? "pageview",
      source: properties?.source ?? "navigation",
    },
  });
}

export function identifyUser(
  userId: string,
  properties?: AnalyticsProperties,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const didInitialize = initPostHog();
  if (!didInitialize) {
    return;
  }

  posthog.identify(userId, sanitizeProperties(properties));
}

export function resetUser(): void {
  if (typeof window === "undefined") {
    return;
  }

  const didInitialize = initPostHog();
  if (!didInitialize) {
    return;
  }

  posthog.reset();
}

function sanitizeProperties(
  properties?: AnalyticsProperties,
): AnalyticsProperties | undefined {
  if (!properties) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as AnalyticsProperties;
}
