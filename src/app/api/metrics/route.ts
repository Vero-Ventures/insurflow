import { env } from "@/env";
import {
  getPrometheusResponseHeaders,
  isPrometheusAuthorized,
  renderPrometheusMetrics,
} from "@/server/observability/prometheus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!env.PROMETHEUS_METRICS_TOKEN) {
    return Response.json(
      { error: "Prometheus metrics token is not configured" },
      { status: 503 },
    );
  }

  if (!isPrometheusAuthorized(request, env.PROMETHEUS_METRICS_TOKEN)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = await renderPrometheusMetrics();

  if (!metrics) {
    return Response.json(
      { error: "Prometheus metrics unavailable" },
      { status: 503 },
    );
  }

  return new Response(metrics, {
    headers: getPrometheusResponseHeaders(),
    status: 200,
  });
}
