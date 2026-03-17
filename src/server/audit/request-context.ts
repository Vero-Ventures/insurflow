import { headers } from "next/headers";

import type { ApplicationEventContext } from "./application-events";

export function getOrCreateRequestId(
  headersLike: Pick<Headers, "get">,
): string {
  return headersLike.get("x-request-id") ?? crypto.randomUUID();
}

export function createRequestApplicationEventContext(
  request: Request,
  actorUserId?: string | null,
): ApplicationEventContext {
  return {
    actorUserId,
    requestId: getOrCreateRequestId(request.headers),
  };
}

export async function getServerActionApplicationEventContext(
  actorUserId?: string | null,
): Promise<ApplicationEventContext> {
  const requestHeaders = await headers();

  return {
    actorUserId,
    requestId: getOrCreateRequestId(requestHeaders),
  };
}
