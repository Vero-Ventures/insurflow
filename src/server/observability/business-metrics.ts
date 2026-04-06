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

const CARRIER_PROVIDERS = ["equitable", "mock"] as const;

type CarrierProvider = (typeof CARRIER_PROVIDERS)[number];

export function recordCarrierWebhookEvent(
  provider: string,
  outcome: "accepted" | "duplicate" | "failed" | "rejected",
): void {
  carrierWebhookEvents.add(1, {
    outcome,
    provider: normalizeCarrierProvider(provider),
  });
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

function normalizeCarrierProvider(
  provider: string,
): CarrierProvider | "unknown" {
  return (CARRIER_PROVIDERS as readonly string[]).includes(provider)
    ? (provider as CarrierProvider)
    : "unknown";
}
