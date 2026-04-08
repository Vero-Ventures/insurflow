import { createLogger, type Logger } from "@/server/axiom";

import { recordHttpRequestMetric } from "./metrics";
import { getRequestObservabilityContext } from "./request-context";
import { summarizeResponse } from "./route-summary";

export interface ManualRouteLogger {
  complete<T extends Response>(response: T): T;
  context: ReturnType<typeof getRequestObservabilityContext>;
  logger: Logger;
}

export function createManualRouteLogger(
  request: Request,
  routePattern: string,
  method: string,
): ManualRouteLogger {
  const startedAt = performance.now();
  const context = getRequestObservabilityContext(request, routePattern);
  const logger = createLogger({
    endpoint: routePattern,
    ipAddress: context.ipAddress,
    method,
    requestId: context.requestId,
    requestPath: context.requestPath,
    routePattern,
    userAgent: context.userAgent,
  });

  return {
    complete<T extends Response>(response: T) {
      const duration = performance.now() - startedAt;

      response.headers.set("x-request-id", context.requestId);

      void (async () => {
        try {
          await logger.info("API response returned", {
            ...summarizeResponse(response),
            duration,
            statusCode: response.status,
          });
        } catch (error) {
          console.error(
            "[createManualRouteLogger] Failed to log response",
            error,
          );
        }

        try {
          recordHttpRequestMetric({
            duration,
            method,
            route: routePattern,
            statusCode: response.status,
          });
        } catch (error) {
          console.error(
            "[createManualRouteLogger] Failed to record response metric",
            error,
          );
        }
      })();

      return response;
    },
    context,
    logger,
  };
}
