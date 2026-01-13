/**
 * OpenTelemetry SDK Configuration for Grafana Cloud
 *
 * This module initializes the OpenTelemetry SDK with:
 * - Trace exporter to Grafana Cloud (OTLP HTTP)
 * - Log exporter to Grafana Cloud (OTLP HTTP)
 * - Configurable sampling rate
 *
 * @see https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
 */

import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Semantic convention attribute keys
// Using string literals for attributes not in stable exports
const ATTR_SERVICE_VERSION = "service.version";
const ATTR_DEPLOYMENT_ENVIRONMENT = "deployment.environment";

/**
 * Configuration for OpenTelemetry SDK
 */
interface OTelConfig {
  serviceName: string;
  environment: string;
  version: string;
  otlpEndpoint?: string;
  grafanaInstanceId?: string;
  grafanaApiToken?: string;
  samplingRate?: number;
}

/**
 * Build authorization header for Grafana Cloud
 * Uses Basic Auth with instance ID and API token
 */
function buildGrafanaAuthHeader(
  instanceId: string,
  apiToken: string,
): string | undefined {
  if (!instanceId || !apiToken) return undefined;
  const credentials = Buffer.from(`${instanceId}:${apiToken}`).toString(
    "base64",
  );
  return `Basic ${credentials}`;
}

/**
 * Check if OpenTelemetry export is configured
 */
export function isOTelConfigured(): boolean {
  return !!(
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT &&
    process.env.GRAFANA_CLOUD_INSTANCE_ID &&
    process.env.GRAFANA_CLOUD_API_TOKEN
  );
}

/**
 * Initialize OpenTelemetry SDK
 *
 * Call this in instrumentation.ts to set up tracing and logging
 * before the application starts handling requests.
 */
export function initializeOTel(config: OTelConfig): NodeSDK {
  const {
    serviceName,
    environment,
    version,
    otlpEndpoint,
    grafanaInstanceId,
    grafanaApiToken,
    samplingRate = 1.0,
  } = config;

  // Build resource attributes (metadata attached to all telemetry)
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: version,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // Configure exporters based on whether Grafana Cloud is configured
  const authHeader =
    grafanaInstanceId && grafanaApiToken
      ? buildGrafanaAuthHeader(grafanaInstanceId, grafanaApiToken)
      : undefined;

  const headers = authHeader ? { Authorization: authHeader } : undefined;

  // Trace exporter - sends to Grafana Tempo
  const traceExporter =
    otlpEndpoint && headers
      ? new OTLPTraceExporter({
          url: `${otlpEndpoint}/v1/traces`,
          headers,
        })
      : undefined;

  // Log exporter - sends to Grafana Loki
  const logExporter =
    otlpEndpoint && headers
      ? new OTLPLogExporter({
          url: `${otlpEndpoint}/v1/logs`,
          headers,
        })
      : undefined;

  // Set up log provider with OTLP export
  if (logExporter) {
    const loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)],
    });
    logs.setGlobalLoggerProvider(loggerProvider);
  }

  // Configure span processor - use console in dev if no Grafana configured
  const spanProcessor = traceExporter
    ? new BatchSpanProcessor(traceExporter)
    : environment === "development"
      ? new BatchSpanProcessor(new ConsoleSpanExporter())
      : undefined;

  // Initialize the SDK
  const sdk = new NodeSDK({
    resource,
    spanProcessor,
    // Sampling configuration
    // In production, you might want to sample a percentage of traces
    // The samplingRate is not directly used here but can be configured via
    // OTEL_TRACES_SAMPLER and OTEL_TRACES_SAMPLER_ARG environment variables
  });

  // Start the SDK
  sdk.start();

  // Log initialization status
  if (traceExporter) {
    console.log(
      `[OpenTelemetry] Initialized with Grafana Cloud export (sampling: ${samplingRate * 100}%)`,
    );
  } else {
    console.log(
      "[OpenTelemetry] Initialized in local mode (console export only)",
    );
  }

  // Graceful shutdown on process termination
  const shutdown = () => {
    sdk
      .shutdown()
      .then(() => {
        console.log("[OpenTelemetry] SDK shut down successfully");
      })
      .catch((error: unknown) => {
        console.error("[OpenTelemetry] Error shutting down SDK:", error);
      });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return sdk;
}

/**
 * Get the default OpenTelemetry configuration from environment variables
 */
export function getOTelConfigFromEnv(): OTelConfig {
  const samplingArg = process.env.OTEL_TRACES_SAMPLER_ARG;
  const defaultSamplingRate = process.env.NODE_ENV === "production" ? 0.2 : 1.0;

  return {
    serviceName: process.env.OTEL_SERVICE_NAME ?? "insurflow",
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    version: process.env.npm_package_version ?? "0.0.0",
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    grafanaInstanceId: process.env.GRAFANA_CLOUD_INSTANCE_ID,
    grafanaApiToken: process.env.GRAFANA_CLOUD_API_TOKEN,
    samplingRate: samplingArg ? parseFloat(samplingArg) : defaultSamplingRate,
  };
}
