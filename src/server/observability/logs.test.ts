import { SeverityNumber } from "@opentelemetry/api-logs";
import { describe, expect, it } from "vitest";

import { buildOtelLogRecord } from "./logs";

describe("buildOtelLogRecord", () => {
  it("maps the app log level to an OTLP severity", () => {
    const record = buildOtelLogRecord({
      level: "error",
      message: "Webhook failed",
      timestamp: "2026-04-22T00:00:00.000Z",
    });

    expect(record.severityNumber).toBe(SeverityNumber.ERROR);
    expect(record.severityText).toBe("ERROR");
  });

  it("uses the message as the log body", () => {
    const record = buildOtelLogRecord({
      level: "info",
      message: "API response returned",
      timestamp: "2026-04-22T00:00:00.000Z",
    });

    expect(record.body).toBe("API response returned");
  });

  it("flattens structured fields into attributes", () => {
    const record = buildOtelLogRecord({
      level: "warn",
      message: "Latency threshold exceeded",
      timestamp: "2026-04-22T00:00:00.000Z",
      requestId: "req-123",
      statusCode: 503,
      error: {
        name: "Error",
        message: "timeout",
      },
    });

    expect(record.attributes).toMatchObject({
      level: "warn",
      requestId: "req-123",
      statusCode: 503,
      "error.name": "Error",
      "error.message": "timeout",
    });
  });
});
