export interface RequestObservabilityContext {
  requestId: string;
  routePattern: string;
  requestPath: string;
  requestUrl: string;
  requestMethod: string;
  userAgent?: string;
  ipAddress?: string;
}

export function getOrCreateRequestId(headers: Pick<Headers, "get">): string {
  const requestId = headers.get("x-request-id");

  if (requestId === null) {
    return crypto.randomUUID();
  }

  const trimmedRequestId = requestId.trim();
  return trimmedRequestId || crypto.randomUUID();
}

export function getRequestObservabilityContext(
  request: Request,
  routePattern: string,
): RequestObservabilityContext {
  const url = new URL(request.url);
  const sanitizedUrl = `${url.origin}${routePattern}`;

  return {
    requestId: getOrCreateRequestId(request.headers),
    routePattern,
    requestPath: routePattern,
    requestUrl: sanitizedUrl,
    requestMethod: request.method,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: getClientIp(request) ?? undefined,
  };
}

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    null
  );
}
