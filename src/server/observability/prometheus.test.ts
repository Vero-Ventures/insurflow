import { describe, expect, it } from "vitest";

import {
  getPrometheusResponseHeaders,
  isPrometheusAuthorized,
} from "./prometheus";

describe("isPrometheusAuthorized", () => {
  it("rejects requests when the bearer token is missing from config", () => {
    const request = new Request("http://localhost/api/metrics");

    expect(isPrometheusAuthorized(request, undefined)).toBe(false);
  });

  it("rejects requests when the bearer token is wrong", () => {
    const request = new Request("http://localhost/api/metrics", {
      headers: {
        Authorization: "Bearer wrong-token",
      },
    });

    expect(isPrometheusAuthorized(request, "expected-token")).toBe(false);
  });

  it("allows requests when the bearer token matches", () => {
    const request = new Request("http://localhost/api/metrics", {
      headers: {
        Authorization: "Bearer expected-token",
      },
    });

    expect(isPrometheusAuthorized(request, "expected-token")).toBe(true);
  });
});

describe("getPrometheusResponseHeaders", () => {
  it("returns prometheus response metadata", () => {
    const headers = getPrometheusResponseHeaders();

    expect(headers["content-type"]).toBe(
      "text/plain; version=0.0.4; charset=utf-8",
    );
    expect(headers["cache-control"]).toBe("no-store");
  });
});
