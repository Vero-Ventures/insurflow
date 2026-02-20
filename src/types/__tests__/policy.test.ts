import { describe, expect, it } from "vitest";
import {
  aggregatePolicyCoverage,
  POLICY_TYPES,
  POLICY_STATUSES,
  POLICY_TYPE_LABELS,
  POLICY_STATUS_LABELS,
  type Policy,
} from "../policy";

// Helper to create a mock policy with defaults
function createMockPolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: "policy_123",
    clientId: "client_456",
    policyNumber: null,
    carrierName: null,
    type: "term_life",
    faceAmount: "100000",
    annualPremium: null,
    issueDate: null,
    expiryDate: null,
    cashValue: null,
    status: "active",
    riders: null,
    notes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("aggregatePolicyCoverage", () => {
  it("returns zero values for empty array", () => {
    const result = aggregatePolicyCoverage([]);

    expect(result.totalActiveCoverage).toBe(0);
    expect(result.totalPolicies).toBe(0);
    expect(result.activePolicies).toBe(0);
  });

  it("sums face amounts of active policies only", () => {
    const policies: Policy[] = [
      createMockPolicy({ id: "1", faceAmount: "100000", status: "active" }),
      createMockPolicy({ id: "2", faceAmount: "250000", status: "active" }),
      createMockPolicy({ id: "3", faceAmount: "500000", status: "lapsed" }),
    ];

    const result = aggregatePolicyCoverage(policies);

    expect(result.totalActiveCoverage).toBe(350000);
    expect(result.totalPolicies).toBe(3);
    expect(result.activePolicies).toBe(2);
  });

  it("excludes soft-deleted policies from all counts", () => {
    const policies: Policy[] = [
      createMockPolicy({ id: "1", faceAmount: "100000", status: "active" }),
      createMockPolicy({
        id: "2",
        faceAmount: "200000",
        status: "active",
        deletedAt: "2025-01-15T00:00:00.000Z",
      }),
    ];

    const result = aggregatePolicyCoverage(policies);

    expect(result.totalActiveCoverage).toBe(100000);
    expect(result.totalPolicies).toBe(1);
    expect(result.activePolicies).toBe(1);
  });

  it("handles all policy statuses correctly", () => {
    const policies: Policy[] = [
      createMockPolicy({ id: "1", faceAmount: "100000", status: "active" }),
      createMockPolicy({ id: "2", faceAmount: "100000", status: "lapsed" }),
      createMockPolicy({
        id: "3",
        faceAmount: "100000",
        status: "surrendered",
      }),
      createMockPolicy({ id: "4", faceAmount: "100000", status: "paid_up" }),
      createMockPolicy({ id: "5", faceAmount: "100000", status: "pending" }),
    ];

    const result = aggregatePolicyCoverage(policies);

    // Only "active" status counts toward coverage
    expect(result.totalActiveCoverage).toBe(100000);
    expect(result.totalPolicies).toBe(5);
    expect(result.activePolicies).toBe(1);
  });

  it("handles invalid/NaN face amounts gracefully", () => {
    const policies: Policy[] = [
      createMockPolicy({ id: "1", faceAmount: "100000", status: "active" }),
      createMockPolicy({ id: "2", faceAmount: "invalid", status: "active" }),
      createMockPolicy({ id: "3", faceAmount: "", status: "active" }),
    ];

    const result = aggregatePolicyCoverage(policies);

    expect(result.totalActiveCoverage).toBe(100000);
    expect(result.activePolicies).toBe(3);
  });

  it("handles negative face amounts by treating them as zero", () => {
    const policies: Policy[] = [
      createMockPolicy({ id: "1", faceAmount: "100000", status: "active" }),
      createMockPolicy({ id: "2", faceAmount: "-50000", status: "active" }),
    ];

    const result = aggregatePolicyCoverage(policies);

    // Negative amounts are clamped to 0
    expect(result.totalActiveCoverage).toBe(100000);
  });

  it("handles decimal face amounts", () => {
    const policies: Policy[] = [
      createMockPolicy({ id: "1", faceAmount: "100000.50", status: "active" }),
      createMockPolicy({ id: "2", faceAmount: "50000.25", status: "active" }),
    ];

    const result = aggregatePolicyCoverage(policies);

    expect(result.totalActiveCoverage).toBe(150000.75);
  });
});

describe("policy constants", () => {
  it("has all policy types defined", () => {
    expect(POLICY_TYPES).toContain("term_life");
    expect(POLICY_TYPES).toContain("whole_life");
    expect(POLICY_TYPES).toContain("universal_life");
    expect(POLICY_TYPES).toContain("variable_life");
    expect(POLICY_TYPES).toContain("group_life");
    expect(POLICY_TYPES).toContain("other");
    expect(POLICY_TYPES.length).toBe(6);
  });

  it("has all policy statuses defined", () => {
    expect(POLICY_STATUSES).toContain("active");
    expect(POLICY_STATUSES).toContain("lapsed");
    expect(POLICY_STATUSES).toContain("surrendered");
    expect(POLICY_STATUSES).toContain("paid_up");
    expect(POLICY_STATUSES).toContain("pending");
    expect(POLICY_STATUSES.length).toBe(5);
  });

  it("has labels for all policy types", () => {
    for (const type of POLICY_TYPES) {
      expect(POLICY_TYPE_LABELS[type]).toBeDefined();
      expect(typeof POLICY_TYPE_LABELS[type]).toBe("string");
    }
  });

  it("has labels for all policy statuses", () => {
    for (const status of POLICY_STATUSES) {
      expect(POLICY_STATUS_LABELS[status]).toBeDefined();
      expect(typeof POLICY_STATUS_LABELS[status]).toBe("string");
    }
  });
});
