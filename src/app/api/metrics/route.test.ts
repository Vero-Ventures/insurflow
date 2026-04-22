import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRenderPrometheusMetrics = vi.fn();
const mockIsPrometheusAuthorized = vi.fn();

vi.mock("@/server/observability/prometheus", () => ({
  getPrometheusResponseHeaders: vi.fn(() => ({
    "cache-control": "no-store",
    "content-type": "text/plain; version=0.0.4; charset=utf-8",
  })),
  isPrometheusAuthorized: (...args: unknown[]) =>
    mockIsPrometheusAuthorized(...args),
  renderPrometheusMetrics: (...args: unknown[]) =>
    mockRenderPrometheusMetrics(...args),
}));

describe("GET /api/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 when token is configured but authorization is missing", async () => {
    vi.doMock("@/env", () => ({
      env: {
        PROMETHEUS_METRICS_TOKEN: "metrics-secret",
      },
    }));
    mockIsPrometheusAuthorized.mockReturnValue(false);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/metrics"));

    expect(response.status).toBe(401);
  });

  it("returns prometheus text when authorized", async () => {
    vi.doMock("@/env", () => ({
      env: {
        PROMETHEUS_METRICS_TOKEN: "metrics-secret",
      },
    }));
    mockIsPrometheusAuthorized.mockReturnValue(true);
    mockRenderPrometheusMetrics.mockResolvedValue(
      "# HELP http_requests_total demo",
    );

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/metrics", {
        headers: {
          Authorization: "Bearer metrics-secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; version=0.0.4; charset=utf-8",
    );
    await expect(response.text()).resolves.toContain("# HELP");
  });

  it("returns 503 when metrics cannot be rendered", async () => {
    vi.doMock("@/env", () => ({
      env: {
        PROMETHEUS_METRICS_TOKEN: "metrics-secret",
      },
    }));
    mockIsPrometheusAuthorized.mockReturnValue(true);
    mockRenderPrometheusMetrics.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/metrics", {
        headers: {
          Authorization: "Bearer metrics-secret",
        },
      }),
    );

    expect(response.status).toBe(503);
  });

  it("returns 503 when the metrics token is not configured", async () => {
    vi.doMock("@/env", () => ({
      env: {
        PROMETHEUS_METRICS_TOKEN: undefined,
      },
    }));

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/metrics"));

    expect(response.status).toBe(503);
  });
});
