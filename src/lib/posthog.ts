import posthog from "posthog-js";
import { env } from "@/env";

/**
 * Initialize PostHog client
 */
export function initPostHog() {
  if (
    typeof window !== "undefined" &&
    env.NEXT_PUBLIC_POSTHOG_KEY &&
    env.NEXT_PUBLIC_POSTHOG_HOST
  ) {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // Disable automatic pageview capture, we'll manually handle this
      capture_pageleave: true,
      loaded: (posthog) => {
        if (env.NODE_ENV === "development") posthog.debug();
      },
    });
  }
}

/**
 * PostHog client instance
 */
export { posthog };

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window !== "undefined") {
    posthog.capture(eventName, properties);
  }
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window !== "undefined") {
    posthog.identify(userId, properties);
  }
}

/**
 * Reset user identity (e.g., on logout)
 */
export function resetUser() {
  if (typeof window !== "undefined") {
    posthog.reset();
  }
}

/**
 * Track a page view
 */
export function trackPageView() {
  if (typeof window !== "undefined") {
    posthog.capture("$pageview");
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    posthog.setPersonProperties(properties);
  }
}
