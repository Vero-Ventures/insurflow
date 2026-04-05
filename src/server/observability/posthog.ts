import { env } from "@/env";

import type {
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics/event-schema";

interface ServerAnalyticsEvent {
  distinctId: string;
  event: AnalyticsEventName;
  properties?: AnalyticsProperties;
}

export function captureServerAnalyticsEvent({
  distinctId,
  event,
  properties,
}: ServerAnalyticsEvent): void {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.NEXT_PUBLIC_POSTHOG_HOST) {
    return;
  }

  void fetch(`${env.NEXT_PUBLIC_POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: env.NEXT_PUBLIC_POSTHOG_KEY,
      distinct_id: distinctId,
      event,
      properties: sanitizeProperties(properties),
    }),
  }).catch(() => undefined);
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
