import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  detectChangedFields,
  sanitizeForAudit,
  getClientIp,
  extractAuditContext,
  AuditLogger,
  createAuditLogger,
} from "../index";

// Mock the database module
vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

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
    const request = new Request("http://localhost", {
      headers: {},
    });
    const result = getClientIp(request);
    expect(result).toBeNull();
  });

  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    const result = getClientIp(request);
    expect(result).toBe("192.168.1.1");
  });

  it("extracts first IP from x-forwarded-for with multiple IPs", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1" },
    });
    const result = getClientIp(request);
    expect(result).toBe("192.168.1.1");
  });

  it("trims whitespace from IP addresses", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  192.168.1.1  " },
    });
    const result = getClientIp(request);
    expect(result).toBe("192.168.1.1");
  });

  it("extracts IP from cf-connecting-ip header (Cloudflare)", () => {
    const request = new Request("http://localhost", {
      headers: { "cf-connecting-ip": "203.0.113.50" },
    });
    const result = getClientIp(request);
    expect(result).toBe("203.0.113.50");
  });

  it("extracts IP from x-real-ip header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.25" },
    });
    const result = getClientIp(request);
    expect(result).toBe("198.51.100.25");
  });

  it("prefers x-forwarded-for over other headers", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "cf-connecting-ip": "203.0.113.50",
        "x-real-ip": "198.51.100.25",
      },
    });
    const result = getClientIp(request);
    expect(result).toBe("192.168.1.1");
  });
});

describe("extractAuditContext", () => {
  it("extracts all context from request", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Mozilla/5.0",
        "x-request-id": "req-123",
      },
    });
    const result = extractAuditContext(request, "user-456");
    expect(result).toEqual({
      userId: "user-456",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      requestId: "req-123",
    });
  });

  it("handles missing headers gracefully", () => {
    const request = new Request("http://localhost");
    const result = extractAuditContext(request);
    expect(result).toEqual({
      userId: undefined,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
  });

  it("handles null userId", () => {
    const request = new Request("http://localhost");
    const result = extractAuditContext(request, null);
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
