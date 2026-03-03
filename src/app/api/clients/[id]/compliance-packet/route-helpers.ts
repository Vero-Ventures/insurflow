export function hasClientValue(
  value: string | number | null | undefined,
): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

function decimalToNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
