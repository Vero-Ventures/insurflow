import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("insurflow-business-metrics");

const carrierWebhookEvents = meter.createCounter(
  "carrier.webhook.events_total",
  {
    description: "Count of carrier webhook events by provider and outcome",
  },
);

const aiLetterJobs = meter.createCounter("ai.letter.jobs_total", {
  description: "Count of AI letter generation attempts by outcome",
});

const aiChatEvents = meter.createCounter("ai.chat.events_total", {
  description: "Count of AI chat interactions by outcome",
});

export function recordCarrierWebhookEvent(
  provider: string,
  outcome: "accepted" | "duplicate" | "failed" | "rejected",
): void {
  carrierWebhookEvents.add(1, { provider, outcome });
}

export function recordAiLetterJob(
  outcome: "completed" | "failed" | "queued" | "rejected",
): void {
  aiLetterJobs.add(1, { outcome });
}

export function recordAiChatEvent(
  outcome: "completed" | "failed" | "rejected" | "started",
): void {
  aiChatEvents.add(1, { outcome });
}
