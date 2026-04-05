"use client";

import type { AnalyticsEventName, AnalyticsProperties } from "./event-schema";
import { trackEvent } from "@/lib/posthog";

export function captureAnalyticsEvent(
  name: AnalyticsEventName,
  properties?: AnalyticsProperties,
): void {
  trackEvent({ name, properties });
}
