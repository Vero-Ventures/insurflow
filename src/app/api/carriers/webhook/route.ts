/**
 * @fileoverview Carrier webhook endpoint.
 *
 * POST /api/carriers/webhook?provider={providerId}
 *
 * Accepts webhook payloads from carrier providers, verifies authenticity
 * via the provider's verifyWebhook method, and persists normalized status
 * events idempotently. This endpoint does NOT require user authentication —
 * it uses provider-specific signature verification instead.
 *
 * Security:
 * - The mock provider is only available in non-production environments.
 * - All payloads are verified via HMAC or provider-specific signature.
 * - Metadata is sanitized before persistence (PII/secrets stripped).
 *
 * Idempotency:
 * - Duplicate events (same provider + providerEventId) return 200 with
 *   { duplicate: true } instead of creating duplicate rows.
 */

import { NextResponse } from "next/server";
import { createLogger } from "@/server/axiom";
import {
  getCarrierProvider,
  listProviderIds,
} from "@/lib/providers/carrier-registry";
import { persistWebhookEvent } from "@/lib/api/webhook-helpers";
import { createRequestApplicationEventContext } from "@/server/audit/request-context";

// Node runtime required for crypto operations (HMAC verification)
export const runtime = "nodejs";

/**
 * Maximum allowed webhook payload size (1MB).
 * Prevents denial-of-service via oversized payloads.
 */
const MAX_PAYLOAD_SIZE = 1024 * 1024;

/**
 * POST /api/carriers/webhook?provider={providerId}
 *
 * Accepts carrier webhook events, verifies authenticity, and persists them.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const logger = createLogger({
    endpoint: "/api/carriers/webhook",
    method: "POST",
  });

  try {
    // 1. Extract and validate provider ID from query string
    const url = new URL(request.url);
    const userProvidedId = url.searchParams.get("provider");

    // Get the allowlist of valid provider IDs before any user-controlled checks
    const validProviderIds = listProviderIds();

    // Find the matching provider ID from our trusted allowlist
    // This ensures we never use user-controlled input directly — only the
    // canonical value from our registry. This prevents security bypass attacks.
    const providerId = validProviderIds.find((id) => id === userProvidedId);

    if (!providerId) {
      // Log without user-controlled data in message to prevent log injection
      await logger.warn("Invalid or unknown provider", {
        providedValue: userProvidedId ? "[redacted]" : "missing",
        validProviders: validProviderIds,
      });
      // Return generic error to avoid information disclosure
      return NextResponse.json(
        { error: "Invalid or unknown provider" },
        { status: 400 },
      );
    }

    // providerId is now a trusted value from our allowlist, not user input
    logger.addContext({ provider: providerId });

    // 2. Resolve the carrier provider (guaranteed to exist after allowlist check)
    const provider = getCarrierProvider(providerId);
    if (!provider) {
      // This should never happen after allowlist validation, but handle defensively
      await logger.error(
        "Provider registry inconsistency",
        new Error(`Provider '${providerId}' in allowlist but not in registry`),
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    // 3. Read raw body for signature verification
    // Always read the body and proceed to signature verification regardless of content
    // This prevents timing attacks that could distinguish empty vs non-empty payloads
    const rawBody = await request.text();

    // Validate payload size to prevent denial-of-service
    if (rawBody.length > MAX_PAYLOAD_SIZE) {
      await logger.warn("Payload exceeds size limit", {
        size: rawBody.length,
        limit: MAX_PAYLOAD_SIZE,
      });
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // 4. Verify webhook authenticity and parse payload
    // IMPORTANT: Always perform signature verification, even for empty/invalid payloads
    // This ensures the security check cannot be bypassed by user-controlled input
    // The verifyWebhook method handles empty/malformed payloads securely
    const verification = await provider.verifyWebhook(rawBody, request.headers);

    if (!verification.success) {
      await logger.warn("Webhook verification failed", {
        reason: verification.error,
        statusCode: verification.statusCode,
      });
      return NextResponse.json(
        { error: verification.error },
        { status: verification.statusCode },
      );
    }

    const { event } = verification;
    logger.addContext({
      clientId: event.clientId,
      providerEventId: event.providerEventId,
      status: event.status,
    });

    // 5. Persist event idempotently and update application status
    const result = await persistWebhookEvent(providerId, event, {
      auditContext: createRequestApplicationEventContext(request),
    });

    if (result.duplicate) {
      await logger.info("Duplicate event ignored", {
        providerEventId: event.providerEventId,
      });
      return NextResponse.json(
        { accepted: true, duplicate: true },
        { status: 200 },
      );
    }

    if (!result.persisted && "error" in result) {
      await logger.warn("Event persistence failed", {
        reason: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    await logger.info("Webhook event processed", {
      statusUpdated: result.statusUpdated,
      providerEventId: event.providerEventId,
      applicationStatus: event.status,
    });

    return NextResponse.json(
      {
        accepted: true,
        duplicate: false,
        statusUpdated: result.statusUpdated,
      },
      { status: 200 },
    );
  } catch (error) {
    await logger.error(
      "Webhook processing error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
