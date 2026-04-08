import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("insurflow-observability");

const requestCounter = meter.createCounter("http.server.requests_total", {
  description: "Count of completed HTTP server requests",
});

const requestDuration = meter.createHistogram("http.server.request.duration", {
  description: "HTTP server request duration in milliseconds",
  unit: "ms",
});

const errorCounter = meter.createCounter("http.server.errors_total", {
  description: "Count of HTTP server responses with 5xx status codes",
});

export interface HttpRequestMetric {
  duration: number;
  method: string;
  route: string;
  statusCode: number;
}

export function recordHttpRequestMetric(metric: HttpRequestMetric): void {
  const attributes = {
    "http.method": metric.method,
    "http.route": metric.route,
    "http.status_code": metric.statusCode,
    "http.status_class": `${Math.floor(metric.statusCode / 100)}xx`,
  };

  requestCounter.add(1, attributes);
  requestDuration.record(metric.duration, attributes);

  if (metric.statusCode >= 500) {
    errorCounter.add(1, attributes);
  }
}
