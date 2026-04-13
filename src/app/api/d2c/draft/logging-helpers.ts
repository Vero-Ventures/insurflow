import type { Logger } from "@/server/axiom";

interface DraftStartLogInput {
  message:
    | "Draft POST start"
    | "Draft GET start"
    | "Draft-by-id GET start"
    | "Draft-by-id PATCH start";
  userId: string;
  requestedClientId?: string;
}

interface NormalizationFailureLogInput {
  userId: string;
  error: unknown;
  clientId?: string;
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return {
      name: "UnknownObjectError",
      details: error,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

export async function logDraftStart(
  logger: Logger,
  input: Readonly<DraftStartLogInput>,
): Promise<void> {
  const { message, userId, requestedClientId } = input;
  await logger.info(message, {
    userId,
    ...(requestedClientId ? { requestedClientId } : {}),
  });
}

export async function logD2cNormalizationFailure(
  logger: Logger,
  input: Readonly<NormalizationFailureLogInput>,
): Promise<void> {
  const { userId, error, clientId } = input;
  await logger.warn("D2C account normalization failed", {
    userId,
    ...(clientId ? { clientId } : {}),
    error: formatUnknownError(error),
  });
}

export const DRAFT_RESPONSE_ENVELOPE = { responseEnvelope: "data.draft" };
