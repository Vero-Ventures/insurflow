import {
  logs,
  SeverityNumber,
  type LogRecord,
  type SeverityNumber as SeverityNumberType,
} from "@opentelemetry/api-logs";

import type { LogEvent, LogLevel } from "@/server/axiom";

const otelLogger = logs.getLogger("insurflow-structured-logs");

export function buildOtelLogRecord(event: LogEvent): LogRecord {
  return {
    attributes: flattenAttributes(event),
    body: event.message,
    severityNumber: mapLogLevelToSeverity(event.level),
    severityText: event.level.toUpperCase(),
    timestamp: new Date(event.timestamp),
  };
}

export function emitStructuredLog(event: LogEvent): void {
  try {
    otelLogger.emit(buildOtelLogRecord(event));
  } catch {
    // Keep OTLP log export best-effort so existing logging paths still run.
  }
}

function mapLogLevelToSeverity(level: LogLevel): SeverityNumberType {
  switch (level) {
    case "debug":
      return SeverityNumber.DEBUG;
    case "info":
      return SeverityNumber.INFO;
    case "warn":
      return SeverityNumber.WARN;
    case "error":
      return SeverityNumber.ERROR;
    case "fatal":
      return SeverityNumber.FATAL;
    default:
      return SeverityNumber.UNSPECIFIED;
  }
}

function flattenAttributes(
  value: Record<string, unknown>,
  prefix?: string,
  seen = new WeakSet<object>(),
): Record<string, string | number | boolean | string[]> {
  const attributes: Record<string, string | number | boolean | string[]> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined) {
      continue;
    }

    const attributeKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof nestedValue === "string" ||
      typeof nestedValue === "number" ||
      typeof nestedValue === "boolean"
    ) {
      attributes[attributeKey] = nestedValue;
      continue;
    }

    if (
      Array.isArray(nestedValue) &&
      nestedValue.every((item) => typeof item === "string")
    ) {
      attributes[attributeKey] = nestedValue;
      continue;
    }

    if (
      nestedValue &&
      typeof nestedValue === "object" &&
      !Array.isArray(nestedValue)
    ) {
      if (seen.has(nestedValue as object)) {
        attributes[attributeKey] = "[Circular]";
        continue;
      }

      seen.add(nestedValue as object);
      Object.assign(
        attributes,
        flattenAttributes(
          nestedValue as Record<string, unknown>,
          attributeKey,
          seen,
        ),
      );
      continue;
    }

    attributes[attributeKey] = JSON.stringify(nestedValue);
  }

  return attributes;
}
