/**
 * Policy type constants matching database enum values.
 */
export const POLICY_TYPES = [
  "term_life",
  "whole_life",
  "universal_life",
  "variable_life",
  "group_life",
  "other",
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

/**
 * Policy status constants matching database enum values.
 */
export const POLICY_STATUSES = [
  "active",
  "lapsed",
  "surrendered",
  "paid_up",
  "pending",
] as const;

export type PolicyStatus = (typeof POLICY_STATUSES)[number];

/**
 * Human-readable labels for policy types.
 */
export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  term_life: "Term Life",
  whole_life: "Whole Life",
  universal_life: "Universal Life",
  variable_life: "Variable Life",
  group_life: "Group Life",
  other: "Other",
};

/**
 * Human-readable labels for policy statuses.
 */
export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  active: "Active",
  lapsed: "Lapsed",
  surrendered: "Surrendered",
  paid_up: "Paid Up",
  pending: "Pending",
};

/**
 * Policy entity interface for client-side use.
 * All decimal values are represented as strings for precision.
 */
export interface Policy {
  id: string;
  clientId: string;
  policyNumber: string | null;
  carrierName: string | null;
  type: PolicyType;
  faceAmount: string;
  annualPremium: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  cashValue: string | null;
  status: PolicyStatus;
  riders: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}

/**
 * Result of policy coverage aggregation.
 */
export interface PolicyCoverageAggregation {
  /** Total face amount of active policies */
  totalActiveCoverage: number;
  /** Count of all policies (including inactive) */
  totalPolicies: number;
  /** Count of active policies only */
  activePolicies: number;
}

/**
 * Aggregates total coverage from an array of policies.
 * Only includes active policies in the total coverage amount.
 *
 * @param policies - Array of policy objects
 * @returns Aggregation result with total coverage and policy counts
 */
export function aggregatePolicyCoverage(
  policies: Policy[],
): PolicyCoverageAggregation {
  const nonDeleted = policies.filter((p) => !p.deletedAt);
  const active = nonDeleted.filter((p) => p.status === "active");

  const totalActiveCoverage = active.reduce((sum, p) => {
    const amount = parseFloat(p.faceAmount);
    return sum + (isNaN(amount) ? 0 : Math.max(0, amount));
  }, 0);

  return {
    totalActiveCoverage,
    totalPolicies: nonDeleted.length,
    activePolicies: active.length,
  };
}
