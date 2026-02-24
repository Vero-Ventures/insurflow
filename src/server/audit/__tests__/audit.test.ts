import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  detectChangedFields,
  sanitizeForAudit,
  getClientIp,
  extractAuditContext,
  AuditLogger,
  createAuditLogger,
} from "../index";

// Create mock functions we can inspect
const mockValues = vi.fn(() => Promise.resolve());
const mockInsert = vi.fn(() => ({ values: mockValues }));

// Mock the database module
vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
  })),
}));

// Helper to create test requests with headers
function createTestRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost", { headers });
}

describe("detectChangedFields", () => {
  it("returns empty array when both values are null", () => {
    const result = detectChangedFields(null, null);
    expect(result).toEqual([]);
  });

  it("returns empty array when both values are undefined", () => {
    const result = detectChangedFields(undefined, undefined);
    expect(result).toEqual([]);
  });

  it("returns empty array when values are identical", () => {
    const obj = { name: "John", age: 30 };
    const result = detectChangedFields(obj, obj);
    expect(result).toEqual([]);
  });

  it("detects changed primitive values", () => {
    const oldValues = { name: "John", age: 30 };
    const newValues = { name: "Jane", age: 30 };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toEqual(["name"]);
  });

  it("detects multiple changed fields", () => {
    const oldValues = { name: "John", age: 30, city: "NYC" };
    const newValues = { name: "Jane", age: 31, city: "NYC" };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toContain("name");
    expect(result).toContain("age");
    expect(result).not.toContain("city");
  });

  it("detects added fields", () => {
    const oldValues = { name: "John" };
    const newValues = { name: "John", age: 30 };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toEqual(["age"]);
  });

  it("detects removed fields (undefined in new)", () => {
    const oldValues = { name: "John", age: 30 };
    const newValues = { name: "John" };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toEqual(["age"]);
  });

  it("ignores updatedAt field", () => {
    const oldValues = { name: "John", updatedAt: new Date("2024-01-01") };
    const newValues = { name: "John", updatedAt: new Date("2024-01-02") };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toEqual([]);
  });

  it("detects changes in date objects", () => {
    const oldValues = { createdAt: new Date("2024-01-01") };
    const newValues = { createdAt: new Date("2024-01-02") };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toEqual(["createdAt"]);
  });

  it("handles null to value change", () => {
    const oldValues = { name: null };
    const newValues = { name: "John" };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toEqual(["name"]);
  });

  it("handles value to null change", () => {
    const oldValues = { name: "John" };
    const newValues = { name: null };
    const result = detectChangedFields(oldValues, newValues);
    expect(result).toEqual(["name"]);
  });
});

describe("sanitizeForAudit", () => {
  it("returns null for null input", () => {
    const result = sanitizeForAudit(null);
    expect(result).toBeNull();
  });

  it("returns null for undefined input", () => {
    const result = sanitizeForAudit(undefined);
    expect(result).toBeNull();
  });

  it("removes password fields", () => {
    const data = { name: "John", password: "secret123" };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({ name: "John" });
    expect(result).not.toHaveProperty("password");
  });

  it("removes fields containing 'password' (case insensitive)", () => {
    const data = {
      name: "John",
      userPassword: "secret",
      PASSWORD_HASH: "hash",
      oldPassword: "old",
    };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({ name: "John" });
  });

  it("removes secret fields", () => {
    const data = { name: "John", apiSecret: "secret123" };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({ name: "John" });
  });

  it("removes token fields", () => {
    const data = { name: "John", accessToken: "abc123", refreshToken: "xyz" };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({ name: "John" });
  });

  it("converts Date objects to ISO strings", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    const data = { name: "John", createdAt: date };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({
      name: "John",
      createdAt: "2024-01-15T10:30:00.000Z",
    });
  });

  it("preserves null values", () => {
    const data = { name: "John", middleName: null };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({ name: "John", middleName: null });
  });

  it("excludes undefined values", () => {
    const data = { name: "John", middleName: undefined };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({ name: "John" });
    expect(result).not.toHaveProperty("middleName");
  });

  it("preserves nested objects", () => {
    const data = { name: "John", address: { city: "NYC", zip: "10001" } };
    const result = sanitizeForAudit(data);
    expect(result).toEqual({
      name: "John",
      address: { city: "NYC", zip: "10001" },
    });
  });
});

describe("getClientIp", () => {
  it("returns null when no IP headers are present", () => {
    const result = getClientIp(createTestRequest());
    expect(result).toBeNull();
  });

  it("extracts IP from x-forwarded-for header", () => {
    const result = getClientIp(
      createTestRequest({ "x-forwarded-for": "192.168.1.1" }),
    );
    expect(result).toBe("192.168.1.1");
  });

  it("extracts first IP from x-forwarded-for with multiple IPs", () => {
    const result = getClientIp(
      createTestRequest({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1",
      }),
    );
    expect(result).toBe("192.168.1.1");
  });

  it("trims whitespace from IP addresses", () => {
    const result = getClientIp(
      createTestRequest({ "x-forwarded-for": "  192.168.1.1  " }),
    );
    expect(result).toBe("192.168.1.1");
  });

  it("extracts IP from cf-connecting-ip header (Cloudflare)", () => {
    const result = getClientIp(
      createTestRequest({ "cf-connecting-ip": "203.0.113.50" }),
    );
    expect(result).toBe("203.0.113.50");
  });

  it("extracts IP from x-real-ip header", () => {
    const result = getClientIp(
      createTestRequest({ "x-real-ip": "198.51.100.25" }),
    );
    expect(result).toBe("198.51.100.25");
  });

  it("prefers x-forwarded-for over other headers", () => {
    const result = getClientIp(
      createTestRequest({
        "x-forwarded-for": "192.168.1.1",
        "cf-connecting-ip": "203.0.113.50",
        "x-real-ip": "198.51.100.25",
      }),
    );
    expect(result).toBe("192.168.1.1");
  });
});

describe("extractAuditContext", () => {
  it("extracts all context from request", () => {
    const result = extractAuditContext(
      createTestRequest({
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Mozilla/5.0",
        "x-request-id": "req-123",
      }),
      "user-456",
    );
    expect(result).toEqual({
      userId: "user-456",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      requestId: "req-123",
    });
  });

  it("handles missing headers gracefully", () => {
    const result = extractAuditContext(createTestRequest());
    expect(result).toEqual({
      userId: undefined,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
  });

  it("handles null userId", () => {
    const result = extractAuditContext(createTestRequest(), null);
    expect(result.userId).toBeNull();
  });
});

describe("AuditLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates logger with empty context", () => {
    const logger = new AuditLogger();
    expect(logger).toBeInstanceOf(AuditLogger);
  });

  it("creates logger with provided context", () => {
    const logger = new AuditLogger({
      userId: "user-123",
      ipAddress: "192.168.1.1",
    });
    expect(logger).toBeInstanceOf(AuditLogger);
  });

  it("allows updating context", () => {
    const logger = new AuditLogger({ userId: "user-123" });
    logger.setContext({ ipAddress: "192.168.1.1" });
    // Context update doesn't throw
    expect(logger).toBeInstanceOf(AuditLogger);
  });

  describe("logCreate", () => {
    it("logs create action with sanitized values", async () => {
      const logger = new AuditLogger({
        userId: "user-123",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        requestId: "req-456",
      });

      await logger.logCreate("client", "client-001", {
        id: "client-001",
        name: "John Doe",
        email: "john@example.com",
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "client",
          entityId: "client-001",
          action: "create",
          oldValues: null,
          newValues: expect.objectContaining({
            id: "client-001",
            name: "John Doe",
            email: "john@example.com",
          }),
          changedFields: null,
          userId: "user-123",
          ipAddress: "192.168.1.1",
          userAgent: "Test Agent",
          requestId: "req-456",
        }),
      );
    });

    it("logs create action with metadata", async () => {
      const logger = new AuditLogger({ userId: "user-123" });

      await logger.logCreate(
        "client",
        "client-001",
        { id: "client-001", name: "Jane Doe" },
        { metadata: { source: "import", batchId: "batch-123" } },
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          metadata: { source: "import", batchId: "batch-123" },
        }),
      );
    });

    it("sanitizes sensitive fields in new values", async () => {
      const logger = new AuditLogger({ userId: "user-123" });

      await logger.logCreate("client", "client-001", {
        id: "client-001",
        name: "John",
        password: "secret123",
        apiToken: "abc123",
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          newValues: {
            id: "client-001",
            name: "John",
          },
        }),
      );
    });
  });

  describe("logUpdate", () => {
    it("logs update action with changed fields detected", async () => {
      const logger = new AuditLogger({ userId: "user-123" });

      await logger.logUpdate(
        "client",
        "client-001",
        { id: "client-001", name: "John", age: 30 },
        { id: "client-001", name: "Jane", age: 30 },
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "client",
          entityId: "client-001",
          action: "update",
          changedFields: ["name"],
        }),
      );
    });

    it("skips logging when no fields changed", async () => {
      const logger = new AuditLogger({ userId: "user-123" });

      await logger.logUpdate(
        "client",
        "client-001",
        { id: "client-001", name: "John" },
        { id: "client-001", name: "John" },
      );

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("logs update with metadata", async () => {
      const logger = new AuditLogger({ userId: "user-123" });

      await logger.logUpdate(
        "client",
        "client-001",
        { name: "John" },
        { name: "Jane" },
        { metadata: { reason: "Name correction" } },
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          metadata: { reason: "Name correction" },
        }),
      );
    });
  });

  describe("logDelete", () => {
    it("logs delete action with old values", async () => {
      const logger = new AuditLogger({
        userId: "user-123",
        ipAddress: "10.0.0.1",
      });

      await logger.logDelete("client", "client-001", {
        id: "client-001",
        name: "John Doe",
        email: "john@example.com",
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "client",
          entityId: "client-001",
          action: "delete",
          oldValues: expect.objectContaining({
            id: "client-001",
            name: "John Doe",
            email: "john@example.com",
          }),
          newValues: null,
          changedFields: null,
          userId: "user-123",
          ipAddress: "10.0.0.1",
        }),
      );
    });

    it("logs delete with reason metadata", async () => {
      const logger = new AuditLogger({ userId: "admin-001" });

      await logger.logDelete(
        "client",
        "client-001",
        { id: "client-001", name: "Test Client" },
        { metadata: { reason: "User requested deletion" } },
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          metadata: { reason: "User requested deletion" },
        }),
      );
    });
  });

  describe("logRestore", () => {
    it("logs restore action with restored values", async () => {
      const logger = new AuditLogger({ userId: "user-123" });

      await logger.logRestore("client", "client-001", {
        id: "client-001",
        name: "John Doe",
        deletedAt: null,
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "client",
          entityId: "client-001",
          action: "restore",
          oldValues: null,
          newValues: expect.objectContaining({
            id: "client-001",
            name: "John Doe",
            deletedAt: null,
          }),
          changedFields: null,
        }),
      );
    });

    it("logs restore with metadata", async () => {
      const logger = new AuditLogger({ userId: "admin-001" });

      await logger.logRestore(
        "client",
        "client-001",
        { id: "client-001", name: "Restored Client" },
        { metadata: { reason: "Accidental deletion" } },
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "restore",
          metadata: { reason: "Accidental deletion" },
        }),
      );
    });
  });

  describe("error handling", () => {
    it("does not throw when database insert fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockValues.mockRejectedValueOnce(new Error("Database error"));

      const logger = new AuditLogger({ userId: "user-123" });

      // Should not throw
      await expect(
        logger.logCreate("client", "client-001", { name: "John" }),
      ).resolves.toBeUndefined();

      expect(consoleError).toHaveBeenCalledWith(
        "[AuditLogger] Failed to write audit log:",
        expect.any(Error),
      );

      consoleError.mockRestore();
    });
  });

  describe("context handling", () => {
    it("uses null for missing context values", async () => {
      const logger = new AuditLogger(); // No context provided

      await logger.logCreate("client", "client-001", { name: "John" });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          ipAddress: null,
          userAgent: null,
          requestId: null,
        }),
      );
    });

    it("merges context when setContext is called", async () => {
      const logger = new AuditLogger({ userId: "user-123" });
      logger.setContext({ ipAddress: "192.168.1.1" });

      await logger.logCreate("client", "client-001", { name: "John" });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          ipAddress: "192.168.1.1",
        }),
      );
    });
  });
});

describe("createAuditLogger", () => {
  it("creates an AuditLogger instance", () => {
    const logger = createAuditLogger();
    expect(logger).toBeInstanceOf(AuditLogger);
  });

  it("creates logger with context", () => {
    const logger = createAuditLogger({
      userId: "user-123",
      ipAddress: "192.168.1.1",
      userAgent: "Test Agent",
      requestId: "req-456",
    });
    expect(logger).toBeInstanceOf(AuditLogger);
  });
});
