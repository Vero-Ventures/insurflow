import {
  PrometheusExporter,
  PrometheusSerializer,
} from "@opentelemetry/exporter-prometheus";

let prometheusExporter: PrometheusExporter | null = null;

export function getPrometheusExporter(): PrometheusExporter {
  if (!prometheusExporter) {
    prometheusExporter = new PrometheusExporter({
      endpoint: "/api/metrics",
      preventServerStart: true,
    });
  }

  return prometheusExporter;
}

export function getPrometheusResponseHeaders(): Record<string, string> {
  return {
    "cache-control": "no-store",
    "content-type": "text/plain; version=0.0.4; charset=utf-8",
  };
}

export function isPrometheusAuthorized(
  request: Request,
  token: string | undefined,
): boolean {
  if (!token) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function renderPrometheusMetrics(): Promise<string | null> {
  try {
    const { resourceMetrics } = await getPrometheusExporter().collect();

    return new PrometheusSerializer().serialize(resourceMetrics);
  } catch {
    return null;
  }
}
