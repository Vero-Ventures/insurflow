import { env } from "@/env";

let started = false;

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
        url: env.GRAFANA_OTLP_ENDPOINT,
        headers: parseHeaders(env.GRAFANA_OTLP_HEADERS),
      }),
    }),
    traceExporter: new OTLPTraceExporter({
      url: env.GRAFANA_OTLP_ENDPOINT,
      headers: parseHeaders(env.GRAFANA_OTLP_HEADERS),
    }),
  });

  await sdk.start();
  started = true;
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
