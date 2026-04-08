import { env } from "@/env";

let started = false;
let shuttingDown = false;
let shutdownHandlersRegistered = false;

export async function registerObservability(): Promise<void> {
  if (started || !env.GRAFANA_OTLP_ENDPOINT || !env.GRAFANA_OTLP_HEADERS) {
    return;
  }

  const [
    { NodeSDK },
    { resourceFromAttributes },
    { PeriodicExportingMetricReader },
    { OTLPMetricExporter },
    { OTLPTraceExporter },
  ] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/sdk-metrics"),
    import("@opentelemetry/exporter-metrics-otlp-http"),
    import("@opentelemetry/exporter-trace-otlp-http"),
  ]);

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "deployment.environment.name": env.NODE_ENV,
      "service.name": "insurflow",
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: buildOtlpSignalUrl(env.GRAFANA_OTLP_ENDPOINT, "metrics"),
        headers: parseHeaders(env.GRAFANA_OTLP_HEADERS),
      }),
    }),
    traceExporter: new OTLPTraceExporter({
      url: buildOtlpSignalUrl(env.GRAFANA_OTLP_ENDPOINT, "traces"),
      headers: parseHeaders(env.GRAFANA_OTLP_HEADERS),
    }),
  });

  await sdk.start();
  started = true;

  if (!shutdownHandlersRegistered) {
    shutdownHandlersRegistered = true;

    const shutdown = () => {
      if (!started || shuttingDown) {
        return;
      }

      shuttingDown = true;
      void sdk
        .shutdown()
        .catch(() => undefined)
        .finally(() => {
          started = false;
          shuttingDown = false;
        });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  }
}

export function buildOtlpSignalUrl(
  baseUrl: string,
  signal: "metrics" | "traces",
): string {
  let normalizedBaseUrl = baseUrl;

  while (normalizedBaseUrl.endsWith("/")) {
    normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
  }

  for (const suffix of ["/v1/logs", "/v1/metrics", "/v1/traces"] as const) {
    if (normalizedBaseUrl.endsWith(suffix)) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -suffix.length);
      break;
    }
  }

  return `${normalizedBaseUrl}/v1/${signal}`;
}

function parseHeaders(rawHeaders: string): Record<string, string> {
  return Object.fromEntries(
    rawHeaders
      .split(",")
      .map((header) => header.trim())
      .filter(Boolean)
      .map((header) => {
        const separatorIndex = header.indexOf("=");
        if (separatorIndex === -1) {
          return [header, ""];
        }

        return [
          header.slice(0, separatorIndex).trim(),
          header.slice(separatorIndex + 1).trim(),
        ];
      }),
  );
}
