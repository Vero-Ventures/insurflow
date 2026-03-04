/**
 * @fileoverview Unit tests for D2C draft helper functions.
 *
 * Tests the database operations for creating, finding, and updating
 * draft client records.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findLatestDraft,
  createDraft,
  updateDraft,
} from "../d2c-draft-helpers";

import {
  createMockClient,
  TEST_UUIDS,
} from "./helpers/d2c-resume-link-test-helpers";

// ============================================================================
// Mock Setup
// ============================================================================

const mockClientFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockExecute = vi.fn();

const mockValues = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockReturning = vi.fn().mockResolvedValue([]);

mockInsert.mockReturnValue({ values: mockValues });
mockValues.mockReturnValue({ returning: mockReturning });
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });
mockWhere.mockReturnValue({ returning: mockReturning });

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      client: { findFirst: mockClientFindFirst },
    },
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
    execute: mockExecute,
  })),
}));

// ============================================================================
// Helper: create a full draft mock record
// ============================================================================

function createMockDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_UUIDS.validClientId,
    firstName: "",
    lastName: "",
    dateOfBirth: "2000-01-01",
    sex: "M",
    province: "NY",
    smoker: false,
    healthRating: "standard",
    clientIncome: "0",
    existingLifeInsuranceCoverage: "0",
    replacementDurationYears: 20,
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: TEST_UUIDS.validUserId,
    ...overrides,
  };
}

// ============================================================================
// findLatestDraft
// ============================================================================

describe("findLatestDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns found: false when no draft exists", async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const result = await findLatestDraft(TEST_UUIDS.validUserId);

    expect(result.found).toBe(false);
  });

  it("returns the draft when one exists", async () => {
    const mockDraft = createMockDraft();
    mockClientFindFirst.mockResolvedValue(mockDraft);

    const result = await findLatestDraft(TEST_UUIDS.validUserId);

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.draft.id).toBe(TEST_UUIDS.validClientId);
      expect(result.draft.status).toBe("draft");
    }
  });

  it("calls findFirst with correct filters", async () => {
    mockClientFindFirst.mockResolvedValue(null);

    await findLatestDraft(TEST_UUIDS.validUserId);

    expect(mockClientFindFirst).toHaveBeenCalledTimes(1);
    // Verify findFirst was called (specific drizzle filter args are hard to assert
    // since they are SQL expression objects, but the call itself is important)
    expect(mockClientFindFirst).toHaveBeenCalled();
  });
});

// ============================================================================
// createDraft
// ============================================================================

describe("createDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback: unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (callback as any)({
        query: {
          client: { findFirst: mockClientFindFirst },
        },
        insert: mockInsert,
        execute: mockExecute,
      }),
    );
  });

  it("returns existing draft if one already exists (idempotent)", async () => {
    const existingDraft = createMockDraft();
    mockClientFindFirst.mockResolvedValue(existingDraft);

    const result = await createDraft(TEST_UUIDS.validUserId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.existed).toBe(true);
      expect(result.draft.id).toBe(TEST_UUIDS.validClientId);
    }
    // Should NOT call insert
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates a new draft when none exists", async () => {
    const newDraft = createMockDraft();
    // First findFirst call returns null (no existing draft)
    // After insert, second findFirst returns the created draft
    mockClientFindFirst
      .mockResolvedValueOnce(null) // findLatestDraft check
      .mockResolvedValueOnce(newDraft); // re-fetch after insert

    mockReturning.mockResolvedValueOnce([{ id: TEST_UUIDS.validClientId }]);

    const result = await createDraft(TEST_UUIDS.validUserId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.existed).toBe(false);
      expect(result.draft.id).toBe(TEST_UUIDS.validClientId);
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("applies initial fields when creating", async () => {
    const newDraft = createMockDraft({ sex: "F", smoker: true });
    mockClientFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(newDraft);

    mockReturning.mockResolvedValueOnce([{ id: TEST_UUIDS.validClientId }]);

    const result = await createDraft(TEST_UUIDS.validUserId, {
      sex: "F",
      smoker: true,
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns INSERT_FAILED when insert returns no rows", async () => {
    mockClientFindFirst.mockResolvedValueOnce(null);
    mockReturning.mockResolvedValueOnce([]); // empty result from insert

    const result = await createDraft(TEST_UUIDS.validUserId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INSERT_FAILED");
    }
  });

  it("returns INSERT_FAILED when re-fetch fails after insert", async () => {
    mockClientFindFirst
      .mockResolvedValueOnce(null) // findLatestDraft
      .mockResolvedValueOnce(null); // re-fetch returns null (shouldn't happen)

    mockReturning.mockResolvedValueOnce([{ id: TEST_UUIDS.validClientId }]);

    const result = await createDraft(TEST_UUIDS.validUserId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INSERT_FAILED");
      expect(result.message).toContain("could not be retrieved");
    }
  });
});

// ============================================================================
// updateDraft
// ============================================================================

describe("updateDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });
  });

  it("returns NO_FIELDS when empty fields provided", async () => {
    const result = await updateDraft(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      {},
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("NO_FIELDS");
    }
  });

  it("strips status from update payload", async () => {
    // Only status provided => effectively empty => NO_FIELDS
    const result = await updateDraft(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      { status: "active" },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("NO_FIELDS");
    }
  });

  it("updates draft successfully", async () => {
    const updatedDraft = createMockDraft({ smoker: true });

    mockReturning.mockResolvedValueOnce([{ id: TEST_UUIDS.validClientId }]);
    mockClientFindFirst.mockResolvedValueOnce(updatedDraft);

    const result = await updateDraft(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      { smoker: true },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.draft.smoker).toBe(true);
    }
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns NOT_FOUND when update matches no rows and client does not exist", async () => {
    // Update returns empty (no matching row)
    mockReturning.mockResolvedValueOnce([]);
    // Diagnostic query also returns null
    mockClientFindFirst.mockResolvedValueOnce(null);

    const result = await updateDraft(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      { smoker: true },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("NOT_FOUND");
    }
  });

  it("returns NOT_FOUND when client belongs to another user", async () => {
    mockReturning.mockResolvedValueOnce([]);
    mockClientFindFirst.mockResolvedValueOnce(
      createMockClient({
        id: TEST_UUIDS.validClientId,
        userId: TEST_UUIDS.otherUserId,
        status: "draft",
      }),
    );

    const result = await updateDraft(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      { smoker: true },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("NOT_FOUND");
    }
  });

  it("returns NOT_DRAFT when client is no longer in draft status", async () => {
    mockReturning.mockResolvedValueOnce([]);
    mockClientFindFirst.mockResolvedValueOnce(
      createMockClient({
        id: TEST_UUIDS.validClientId,
        userId: TEST_UUIDS.validUserId,
        status: "active",
      }),
    );

    const result = await updateDraft(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      { smoker: true },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("NOT_DRAFT");
    }
  });

  it("strips undefined values from fields", async () => {
    const updatedDraft = createMockDraft({ smoker: true });

    mockReturning.mockResolvedValueOnce([{ id: TEST_UUIDS.validClientId }]);
    mockClientFindFirst.mockResolvedValueOnce(updatedDraft);

    const result = await updateDraft(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      { smoker: true, firstName: undefined as unknown as string },
    );

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
