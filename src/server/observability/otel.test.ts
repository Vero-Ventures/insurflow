import { describe, expect, it } from "vitest";

import { buildOtlpSignalUrl } from "./otel";

describe("buildOtlpSignalUrl", () => {
  it("appends signal paths to a base OTLP endpoint", () => {
    expect(
      buildOtlpSignalUrl("https://grafana.example.com/otlp", "metrics"),
    ).toBe("https://grafana.example.com/otlp/v1/metrics");
    expect(
      buildOtlpSignalUrl("https://grafana.example.com/otlp", "traces"),
    ).toBe("https://grafana.example.com/otlp/v1/traces");
    expect(buildOtlpSignalUrl("https://grafana.example.com/otlp", "logs")).toBe(
      "https://grafana.example.com/otlp/v1/logs",
    );
  });

  it("replaces an existing signal suffix before appending the requested one", () => {
    expect(
      buildOtlpSignalUrl(
        "https://grafana.example.com/otlp/v1/traces/",
        "metrics",
      ),
    ).toBe("https://grafana.example.com/otlp/v1/metrics");
    expect(
      buildOtlpSignalUrl(
        "https://grafana.example.com/otlp/v1/metrics",
        "traces",
      ),
    ).toBe("https://grafana.example.com/otlp/v1/traces");
    expect(
      buildOtlpSignalUrl("https://grafana.example.com/otlp/v1/logs", "metrics"),
    ).toBe("https://grafana.example.com/otlp/v1/metrics");
  });
});
