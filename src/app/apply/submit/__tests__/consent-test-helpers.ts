/**
 * Shared test helpers for D2C consent submission tests.
 *
 * Extracts duplicated constants, utilities, and factory functions used by
 * both page.test.tsx and consent-scope.test.ts.
 *
 * NOTE: vi.mock() calls cannot be shared — they must remain at module scope
 * in each test file because Vitest hoists them at compile time.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default user ID used across consent submission tests. */
export const TEST_USER_ID = "u1";

/** A valid UUID used as default clientId in consent form payloads. */
export const TEST_CLIENT_ID = "00000000-0000-4000-8000-000000000001";

/** Mock client schema columns — mirrors the shape tests need from drizzle. */
export const MOCK_CLIENT_SCHEMA = {
  id: "id",
  userId: "userId",
  deletedAt: "deletedAt",
  createdAt: "createdAt",
  consentTransmitToCarrierAt: "consentTransmitToCarrierAt",
  healthInfoAuthorizationAt: "healthInfoAuthorizationAt",
  esignIntentAcknowledgedAt: "esignIntentAcknowledgedAt",
} as const;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Calls an async function and catches Next.js-style redirect throws.
 * Returns the caught `redirect:<path>` message, or `null` if no redirect.
 */
export async function callIgnoringRedirect(
  fn: () => Promise<unknown>,
): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("redirect:")) {
      return err.message;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Builds a fully-valid consent FormData payload.
 * Pass `overrides` to remove or change individual fields.
 *
 * @example
 *   // All consents + valid clientId
 *   createValidConsentForm();
 *
 *   // Override clientId
 *   createValidConsentForm({ clientId: "other-uuid" });
 *
 *   // Omit a field (set to undefined)
 *   createValidConsentForm({ consentTransmit: undefined });
 */
export function createValidConsentForm(
  overrides: Partial<Record<string, string | undefined>> = {},
): FormData {
  const defaults: Record<string, string> = {
    consentTransmit: "true",
    healthInfoAuth: "true",
    esignIntent: "true",
    consentConfirmed: "true",
    clientId: TEST_CLIENT_ID,
  };

  const merged = { ...defaults, ...overrides };
  const fd = new FormData();

  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      fd.set(key, value);
    }
  }

  return fd;
}
