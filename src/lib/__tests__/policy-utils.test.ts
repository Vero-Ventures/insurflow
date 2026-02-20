import { describe, expect, it } from "vitest";

import {
  formatPolicyExpiryMonthYear,
  resolveExistingCoverage,
} from "../policy-utils";

describe("resolveExistingCoverage", () => {
  it("uses policy coverage when policy records exist", () => {
    const result = resolveExistingCoverage({
      totalPolicyCount: 2,
      activePolicyCoverage: 250000,
      legacyCoverage: 900000,
    });

    expect(result).toEqual({
      existingCoverage: 250000,
      coverageSource: "policies",
    });
  });

  it("returns zero policy coverage when only inactive policies exist", () => {
    const result = resolveExistingCoverage({
      totalPolicyCount: 3,
      activePolicyCoverage: 0,
      legacyCoverage: 500000,
    });

    expect(result).toEqual({
      existingCoverage: 0,
      coverageSource: "policies",
    });
  });

  it("falls back to legacy coverage when no policies exist", () => {
    const result = resolveExistingCoverage({
      totalPolicyCount: 0,
      activePolicyCoverage: 0,
      legacyCoverage: 125000,
    });

    expect(result).toEqual({
      existingCoverage: 125000,
      coverageSource: "legacy",
    });
  });
});

describe("formatPolicyExpiryMonthYear", () => {
  it("formats YYYY-MM-DD consistently as month and year", () => {
    expect(formatPolicyExpiryMonthYear("2026-03-01")).toBe("Mar 2026");
    expect(formatPolicyExpiryMonthYear("2026-12-31")).toBe("Dec 2026");
  });

  it("returns null for empty or invalid date input", () => {
    expect(formatPolicyExpiryMonthYear(null)).toBeNull();
    expect(formatPolicyExpiryMonthYear("")).toBeNull();
    expect(formatPolicyExpiryMonthYear("2026/03/01")).toBeNull();
  });
});
