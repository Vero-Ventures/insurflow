import { decimalToNumber } from "@/lib/financial/decimal-to-number";

export function hasClientValue(
  value: string | number | null | undefined,
): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

type PolicyAggregateRow = {
  totalPolicyCount: number | string | null | undefined;
  totalActivePolicyCoverage: string | null | undefined;
};

export function extractPolicyCoverageAggregate(row: PolicyAggregateRow) {
  return {
    totalPolicyCount: Number(row.totalPolicyCount ?? 0),
    activePolicyCoverage: decimalToNumber(row.totalActivePolicyCoverage),
  };
}
