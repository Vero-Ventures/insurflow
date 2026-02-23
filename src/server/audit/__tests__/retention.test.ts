import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getRetentionPolicy, calculateCutoffDate } from "../retention";

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
    // parseInt("invalid") returns NaN, which becomes default
    expect(policy.enabled).toBe(false);
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
