import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getRetentionPolicy,
  calculateCutoffDate,
  cleanupOldAuditLogs,
  runFullCleanup,
} from "../retention";

// Mock data for tests
const mockSelectResult: { id: string }[] = [];
const mockDelete = vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) }));
const mockLimit = vi.fn(() => Promise.resolve(mockSelectResult));
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

// Mock the database module
vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    delete: mockDelete,
  })),
}));

// Mock the schema
vi.mock("@/server/db/schemas", () => ({
  auditLog: {
    id: "id",
    createdAt: "createdAt",
  },
}));

describe("getRetentionPolicy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns default retention period when env var is not set", () => {
    delete process.env.AUDIT_LOG_RETENTION_DAYS;
    const policy = getRetentionPolicy();
    expect(policy.retentionDays).toBe(90);
    expect(policy.enabled).toBe(true);
  });

  it("reads retention period from environment variable", () => {
    process.env.AUDIT_LOG_RETENTION_DAYS = "365";
    const policy = getRetentionPolicy();
    expect(policy.retentionDays).toBe(365);
    expect(policy.enabled).toBe(true);
  });

  it("disables retention when set to 0", () => {
    process.env.AUDIT_LOG_RETENTION_DAYS = "0";
    const policy = getRetentionPolicy();
    expect(policy.retentionDays).toBe(0);
    expect(policy.enabled).toBe(false);
  });

  it("handles negative values by disabling retention", () => {
    process.env.AUDIT_LOG_RETENTION_DAYS = "-30";
    const policy = getRetentionPolicy();
    expect(policy.retentionDays).toBe(0);
    expect(policy.enabled).toBe(false);
  });

  it("handles non-numeric values by using default", () => {
    process.env.AUDIT_LOG_RETENTION_DAYS = "invalid";
    const policy = getRetentionPolicy();
    // parseInt("invalid") returns NaN, which falls back to default (90 days)
    expect(policy.retentionDays).toBe(90);
    expect(policy.enabled).toBe(true);
  });
});

describe("calculateCutoffDate", () => {
  it("calculates correct cutoff date for 90 days", () => {
    const now = new Date();
    const cutoff = calculateCutoffDate(90);

    // Cutoff should be approximately 90 days ago
    const expectedCutoff = new Date(now);
    expectedCutoff.setDate(expectedCutoff.getDate() - 90);

    // Allow 1 second tolerance for test execution time
    const diffMs = Math.abs(cutoff.getTime() - expectedCutoff.getTime());
    expect(diffMs).toBeLessThan(1000);
  });

  it("calculates correct cutoff date for 1 day", () => {
    const now = new Date();
    const cutoff = calculateCutoffDate(1);

    const expectedCutoff = new Date(now);
    expectedCutoff.setDate(expectedCutoff.getDate() - 1);

    const diffMs = Math.abs(cutoff.getTime() - expectedCutoff.getTime());
    expect(diffMs).toBeLessThan(1000);
  });

  it("calculates correct cutoff date for 365 days", () => {
    const now = new Date();
    const cutoff = calculateCutoffDate(365);

    const expectedCutoff = new Date(now);
    expectedCutoff.setDate(expectedCutoff.getDate() - 365);

    const diffMs = Math.abs(cutoff.getTime() - expectedCutoff.getTime());
    expect(diffMs).toBeLessThan(1000);
  });

  it("handles 0 days (returns current date)", () => {
    const now = new Date();
    const cutoff = calculateCutoffDate(0);

    const diffMs = Math.abs(cutoff.getTime() - now.getTime());
    expect(diffMs).toBeLessThan(1000);
  });
});

describe("cleanupOldAuditLogs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset mock to return empty array by default
    mockLimit.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns zero count when retention is disabled (0 days)", async () => {
    const result = await cleanupOldAuditLogs({ retentionDays: 0 });

    expect(result.deletedCount).toBe(0);
    expect(result.hasMore).toBe(false);
    expect(result.dryRun).toBe(false);
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("returns zero count when no records to delete", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await cleanupOldAuditLogs({ retentionDays: 90 });

    expect(result.deletedCount).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("deletes records older than retention period", async () => {
    mockLimit.mockResolvedValue([{ id: "log-1" }, { id: "log-2" }]);

    const result = await cleanupOldAuditLogs({ retentionDays: 90 });

    expect(result.deletedCount).toBe(2);
    expect(result.hasMore).toBe(false);
    expect(result.dryRun).toBe(false);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("reports hasMore when batch limit is reached", async () => {
    // Return batchSize + 1 results to indicate there are more
    const manyRecords = Array.from({ length: 101 }, (_, i) => ({
      id: `log-${i}`,
    }));
    mockLimit.mockResolvedValue(manyRecords);

    const result = await cleanupOldAuditLogs({
      retentionDays: 90,
      batchSize: 100,
    });

    expect(result.deletedCount).toBe(100);
    expect(result.hasMore).toBe(true);
  });

  it("respects custom batch size", async () => {
    const records = [{ id: "log-1" }, { id: "log-2" }, { id: "log-3" }];
    mockLimit.mockResolvedValue(records);

    await cleanupOldAuditLogs({ retentionDays: 90, batchSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(51); // batchSize + 1
  });

  describe("dry run mode", () => {
    it("counts records without deleting in dry run mode", async () => {
      mockLimit.mockResolvedValue([
        { id: "log-1" },
        { id: "log-2" },
        { id: "log-3" },
      ]);

      const result = await cleanupOldAuditLogs({
        retentionDays: 90,
        dryRun: true,
      });

      expect(result.deletedCount).toBe(3);
      expect(result.dryRun).toBe(true);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("reports hasMore correctly in dry run mode", async () => {
      const manyRecords = Array.from({ length: 1001 }, (_, i) => ({
        id: `log-${i}`,
      }));
      mockLimit.mockResolvedValue(manyRecords);

      const result = await cleanupOldAuditLogs({
        retentionDays: 90,
        batchSize: 1000,
        dryRun: true,
      });

      expect(result.deletedCount).toBe(1000);
      expect(result.hasMore).toBe(true);
    });
  });
});

describe("runFullCleanup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockLimit.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns zero when no records to delete", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await runFullCleanup({ retentionDays: 90 });

    expect(result.totalDeleted).toBe(0);
    expect(result.batches).toBe(1);
  });

  it("runs multiple batches until all records deleted", async () => {
    // First call returns batch + 1 (indicating more)
    // Second call returns batch + 1 (indicating more)
    // Third call returns empty (done)
    mockLimit
      .mockResolvedValueOnce([{ id: "log-1" }, { id: "log-2" }])
      .mockResolvedValueOnce([{ id: "log-3" }])
      .mockResolvedValueOnce([]);

    const result = await runFullCleanup({ retentionDays: 90, batchSize: 1 });

    expect(result.batches).toBeGreaterThanOrEqual(2);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("respects retention days option", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await runFullCleanup({ retentionDays: 365 });

    expect(result.totalDeleted).toBe(0);
    // Cutoff date should be approximately 365 days ago
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 365);
    const diffMs = Math.abs(
      result.cutoffDate.getTime() - expectedCutoff.getTime(),
    );
    expect(diffMs).toBeLessThan(1000);
  });
});
