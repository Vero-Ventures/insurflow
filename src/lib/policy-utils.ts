const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type ExistingCoverageInput = {
  totalPolicyCount: number;
  activePolicyCoverage: number;
  legacyCoverage: number;
};

type ExistingCoverageResult = {
  existingCoverage: number;
  coverageSource: "policies" | "legacy";
};

/**
 * Resolve coverage source for insurance-needs calculation.
 * If any policy records exist, policy coverage is authoritative even when
 * active-policy coverage is zero.
 */
export function resolveExistingCoverage({
  totalPolicyCount,
  activePolicyCoverage,
  legacyCoverage,
}: ExistingCoverageInput): ExistingCoverageResult {
  if (totalPolicyCount > 0) {
    return {
      existingCoverage: activePolicyCoverage,
      coverageSource: "policies",
    };
  }

  return {
    existingCoverage: legacyCoverage,
    coverageSource: "legacy",
  };
}

/**
 * Format ISO date-only strings (YYYY-MM-DD) without timezone shifting.
 */
export function formatPolicyExpiryMonthYear(
  expiryDate: string | null,
): string | null {
  if (!expiryDate || !ISO_DATE_ONLY_REGEX.test(expiryDate)) {
    return null;
  }

  const [yearPart, monthPart] = expiryDate.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, 1));
  return utcDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
