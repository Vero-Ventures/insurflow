import { getSession, type Session } from "@/server/better-auth/server";
import { createLogger, type Logger } from "@/server/axiom";
import { getDb } from "@/server/db";
import { userProfile } from "@/server/db/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateUUID, verifyClientOwnership } from "./client-helpers";
import { getSessionUserId } from "@/lib/auth/session-utils";

/**
 * Context passed to API route handlers
 */
export interface RouteContext {
  session: Session;
  logger: Logger;
  clientId?: string;
  params: Record<string, string>;
  /** Additional validated resource IDs (e.g., debtId, assetId) */
  resourceIds?: Record<string, string>;
}

/**
 * Configuration for the API handler wrapper
 */
export interface ApiHandlerConfig {
  /** Endpoint path for logging (can include placeholders) */
  endpoint: string;
  /** HTTP method */
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Whether to validate and verify client ownership (requires clientId param) */
  requireClient?: boolean;
  /** Whether endpoint requires advisor account */
  requireAdvisor?: boolean;
  /** Additional resource IDs to validate as UUIDs */
  resourceIdParams?: string[];
}

/**
 * Result type for handlers - either a NextResponse or data to be JSON serialized
 */
type HandlerResult = NextResponse | { data: unknown; status?: number };

/**
 * Handler function type
 */
type ApiHandler = (
  request: Request,
  context: RouteContext,
) => Promise<HandlerResult>;

/**
 * Higher-order function that wraps API route handlers with common boilerplate:
 * - Logger setup
 * - Session validation
 * - UUID validation for client and other resource IDs
 * - Client ownership verification (optional)
 * - Error handling with consistent logging and responses
 *
 * @example
 * ```ts
 * export const GET = withApiHandler(
 *   { endpoint: "/api/clients/[id]/debts", method: "GET", requireClient: true },
 *   async (_request, { logger, clientId }) => {
 *     const debts = await db.query.debt.findMany({ ... });
 *     return { data: { debts } };
 *   }
 * );
 * ```
 */
export function withApiHandler(config: ApiHandlerConfig, handler: ApiHandler) {
  return async (
    request: Request,
    context?: {
      params?: Promise<Record<string, string>> | Record<string, string>;
    },
  ): Promise<NextResponse> => {
    const resolvedParams = await Promise.resolve(context?.params ?? {});
    const clientId = resolvedParams.id;

    // Build endpoint string with actual IDs for logging
    let endpoint = config.endpoint;
    for (const [key, value] of Object.entries(resolvedParams)) {
      endpoint = endpoint.replace(`[${key}]`, value);
    }

    const logger = createLogger({
      endpoint,
      method: config.method,
    });

    try {
      await logger.info("API request received", {
        requestUrl: request.url,
        requestMethod: request.method,
      });

      // Validate session
      const sessionResult = config.requireAdvisor
        ? await validateAdvisorSession(logger)
        : await validateSession(logger);
      if ("error" in sessionResult) return sessionResult.error;
      const { session } = sessionResult;

      logger.addContext({ userId: session.user.id });

      // Validate client ID if present
      if (clientId) {
        const clientIdError = validateUUID(clientId, "client ID");
        if (clientIdError) {
          await logger.warn("Invalid client ID format");
          return clientIdError;
        }
        logger.addContext({ clientId });
      }

      // Validate additional resource IDs
      const resourceIds: Record<string, string> = {};
      if (config.resourceIdParams) {
        for (const paramName of config.resourceIdParams) {
          const paramValue = resolvedParams[paramName];
          if (paramValue) {
            const error = validateUUID(paramValue, paramName);
            if (error) {
              await logger.warn(`Invalid ${paramName} format`);
              return error;
            }
            resourceIds[paramName] = paramValue;
            logger.addContext({ [paramName]: paramValue });
          }
        }
      }

      // Verify client ownership if required
      if (config.requireClient && clientId) {
        const foundClient = await verifyClientOwnership(
          clientId,
          session.user.id,
        );
        if (!foundClient) {
          await logger.info("Client not found", { statusCode: 404 });
          return NextResponse.json(
            { error: "Client not found" },
            { status: 404 },
          );
        }
      }

      // Execute the handler
      const result = await handler(request, {
        session,
        logger,
        clientId,
        params: resolvedParams,
        resourceIds,
      });

      // Return NextResponse directly or wrap data
      if (result instanceof NextResponse) {
        await logger.info("API response returned", {
          statusCode: result.status,
          responseBody: await readResponseBodyForDebug(result),
        });
        return result;
      }

      await logger.info("API response returned", {
        statusCode: result.status ?? 200,
        responseBody: result.data,
      });

      return NextResponse.json(result.data, { status: result.status ?? 200 });
    } catch (error) {
      await logger.error(
        `Error in ${config.method} ${config.endpoint}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

async function readResponseBodyForDebug(response: NextResponse) {
  try {
    const text = await response.clone().text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return "Unable to read response body";
  }
}

/**
 * Shared helper for session validation in API routes
 * Returns the session if valid, or an error response if unauthorized
 */
export async function validateSession(
  logger: Logger,
): Promise<{ session: Session } | { error: NextResponse }> {
  const session = await getSession();
  const userId = getSessionUserId(session);

  if (!session?.user || !userId) {
    await logger.warn("Unauthorized access attempt");
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const normalizedSession = {
    ...session,
    user: {
      ...session.user,
      id: userId,
    },
  } as Session;

  return { session: normalizedSession };
}

export async function validateAdvisorSession(
  logger: Logger,
): Promise<{ session: Session } | { error: NextResponse }> {
  const sessionResult = await validateSession(logger);
  if ("error" in sessionResult) {
    return sessionResult;
  }

  const advisorGuard = await requireAdvisorAccount(
    logger,
    sessionResult.session,
  );
  if (advisorGuard) {
    return { error: advisorGuard };
  }

  return sessionResult;
}

/**
 * Shared helper for parsing JSON body with error handling
 * Returns the parsed body or an error response
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
  logger: Logger,
): Promise<{ body: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    return { body: body as T };
  } catch {
    await logger.warn("Invalid JSON body received");
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

/**
 * Shared helper for validation error responses
 */
export async function handleValidationError(
  logger: Logger,
  error: { flatten: () => unknown; format: () => unknown },
  message = "Validation failed",
) {
  await logger.warn(message, {
    validationErrors: error.flatten(),
  });
  return NextResponse.json(
    {
      error: message,
      details: error.format(),
    },
    { status: 400 },
  );
}

export async function requireAdvisorAccount(
  logger: Logger,
  session: Session,
): Promise<NextResponse | null> {
  const db = getDb();
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
    columns: { accountType: true },
  });

  if (profile?.accountType === "advisor") {
    return null;
  }

  await logger.warn("Forbidden: advisor account required", {
    statusCode: 403,
  });

  return NextResponse.json(
    { error: "Advisor account required" },
    { status: 403 },
  );
}
