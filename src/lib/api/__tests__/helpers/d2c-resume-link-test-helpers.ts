/**
 * @fileoverview Test helpers for D2C resume link tests.
 *
 * Provides reusable mock factories and test utilities to avoid code duplication
 * across test files.
 */

import { vi } from "vitest";

/**
 * Creates a mock session object for testing
 */
export function createMockSession(userId: string = "test-user-id") {
  return {
    user: { id: userId },
    session: { id: "session-id" },
  };
}

/**
 * Creates a mock client record for testing
 */
export function createMockClient(
  overrides: {
    id?: string;
    userId?: string;
    status?: "draft" | "active" | "archived";
    deletedAt?: Date | null;
  } = {},
) {
  return {
    id: overrides.id ?? "test-client-id",
    userId: overrides.userId ?? "test-user-id",
    status: overrides.status ?? "draft",
    deletedAt: overrides.deletedAt ?? null,
  };
}

/**
 * Creates a mock D2C resume link record for testing
 */
export function createMockResumeLink(
  overrides: {
    id?: string;
    token?: string;
    clientId?: string;
    userId?: string;
    expiresAt?: Date;
    usedAt?: Date | null;
    createdAt?: Date;
  } = {},
) {
  const now = new Date();
  const defaultExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    id: overrides.id ?? "test-link-id",
    // Using obviously fake test token to avoid GitGuardian false positives
    token: overrides.token ?? "FAKE_TEST_TOKEN_000000000000000000000000",
    clientId: overrides.clientId ?? "test-client-id",
    userId: overrides.userId ?? "test-user-id",
    expiresAt: overrides.expiresAt ?? defaultExpiry,
    usedAt: overrides.usedAt ?? null,
    createdAt: overrides.createdAt ?? now,
  };
}

/**
 * Creates an expired resume link for testing
 */
export function createExpiredResumeLink(
  overrides: Parameters<typeof createMockResumeLink>[0] = {},
) {
  const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  return createMockResumeLink({
    ...overrides,
    expiresAt: expiredDate,
  });
}

/**
 * Creates a used resume link for testing
 */
export function createUsedResumeLink(
  overrides: Parameters<typeof createMockResumeLink>[0] = {},
) {
  return createMockResumeLink({
    ...overrides,
    usedAt: new Date(),
  });
}

/**
 * Creates standard mock functions for database queries
 */
export function createDbMocks() {
  const mockClientFindFirst = vi.fn();
  const mockResumeLinkFindFirst = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();

  const mockValues = vi.fn().mockReturnThis();
  const mockSet = vi.fn().mockReturnThis();
  const mockWhere = vi.fn().mockReturnThis();
  // Mock returning() to return an array (simulates successful atomic update)
  const mockReturning = vi.fn().mockResolvedValue([{ id: "test-link-id" }]);

  mockInsert.mockReturnValue({ values: mockValues });
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ returning: mockReturning });

  return {
    mockClientFindFirst,
    mockResumeLinkFindFirst,
    mockInsert,
    mockUpdate,
    mockValues,
    mockSet,
    mockWhere,
    mockReturning,
    createMockDb: () => ({
      query: {
        client: { findFirst: mockClientFindFirst },
        d2cResumeLink: { findFirst: mockResumeLinkFindFirst },
      },
      insert: mockInsert,
      update: mockUpdate,
    }),
  };
}

/**
 * Generates a valid URL-safe base64 token (43 characters)
 * Uses crypto.randomBytes for secure token generation matching production behavior
 */
export function generateValidToken(): string {
  // Use the same approach as the actual generateSecureToken() implementation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Test UUIDs for consistent testing
 */
export const TEST_UUIDS = {
  validClientId: "550e8400-e29b-41d4-a716-446655440001",
  validUserId: "550e8400-e29b-41d4-a716-446655440002",
  validLinkId: "550e8400-e29b-41d4-a716-446655440003",
  otherUserId: "550e8400-e29b-41d4-a716-446655440004",
} as const;
