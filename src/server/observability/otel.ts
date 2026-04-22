import { env } from "@/env";
import type { IMetricReader } from "@opentelemetry/sdk-metrics";

import { getPrometheusExporter } from "./prometheus";

let started = false;
let shuttingDown = false;
let shutdownHandlersRegistered = false;

export async function registerObservability(): Promise<void> {
  const hasGrafanaOtlp =
    Boolean(env.GRAFANA_OTLP_ENDPOINT) && Boolean(env.GRAFANA_OTLP_HEADERS);
  const hasPrometheusScrape = Boolean(env.PROMETHEUS_METRICS_TOKEN);

  if (started || (!hasGrafanaOtlp && !hasPrometheusScrape)) {
    return;
  }

  const [
    { NodeSDK },
    { resourceFromAttributes },
    { BatchLogRecordProcessor },
    { PeriodicExportingMetricReader },
    { OTLPLogExporter },
    { OTLPMetricExporter },
    { OTLPTraceExporter },
  ] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/sdk-logs"),
    import("@opentelemetry/sdk-metrics"),
    import("@opentelemetry/exporter-logs-otlp-http"),
    import("@opentelemetry/exporter-metrics-otlp-http"),
    import("@opentelemetry/exporter-trace-otlp-http"),
  ]);

  const metricReaders: IMetricReader[] = [];

  if (hasGrafanaOtlp) {
    metricReaders.push(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: buildOtlpSignalUrl(env.GRAFANA_OTLP_ENDPOINT!, "metrics"),
          headers: parseHeaders(env.GRAFANA_OTLP_HEADERS!),
        }),
      }),
    );
  }

  if (hasPrometheusScrape) {
    metricReaders.push(getPrometheusExporter());
  }

  const sdkOptions: ConstructorParameters<typeof NodeSDK>[0] = {
    resource: resourceFromAttributes({
      "deployment.environment.name": env.NODE_ENV,
      "service.name": "insurflow",
    }),
    metricReaders,
  };

  if (hasGrafanaOtlp) {
    sdkOptions.logRecordProcessors = [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: buildOtlpSignalUrl(env.GRAFANA_OTLP_ENDPOINT!, "logs"),
          headers: parseHeaders(env.GRAFANA_OTLP_HEADERS!),
        }),
      ),
    ];
    sdkOptions.traceExporter = new OTLPTraceExporter({
      url: buildOtlpSignalUrl(env.GRAFANA_OTLP_ENDPOINT!, "traces"),
      headers: parseHeaders(env.GRAFANA_OTLP_HEADERS!),
    });
  }

  const sdk = new NodeSDK(sdkOptions);

  sdk.start();
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
  signal: "logs" | "metrics" | "traces",
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
