/**
 * Calculate age based on date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Format date string to localized format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Format number as Canadian currency (CAD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d.-]/g, ""));
}

/**
 * Format date string to localized format with time
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Calculate total and liquid asset values from an array of assets
 */
export function calculateAssetTotals(
  assets: Array<{ currentValue: string; isLiquid: boolean }>,
): { total: number; liquid: number } {
  return assets.reduce(
    (acc, asset) => {
      const value = parseFloat(asset.currentValue);
      const assetValue = isNaN(value) ? 0 : value;

      return {
        total: acc.total + assetValue,
        liquid: acc.liquid + (asset.isLiquid ? assetValue : 0),
      };
    },
    { total: 0, liquid: 0 },
  );
}

/**
 * Calculate total debt balance from an array of debts
 */
export function calculateDebtTotal(
  debts: Array<{ currentBalance: string }>,
): number {
  return debts.reduce((sum, debt) => {
    const balance = parseFloat(debt.currentBalance);
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);
}

/**
 * Client section completion status
 */
export type SectionCompletionStatus = {
  profile: boolean;
  financialInputs: boolean;
  insuranceNeeds: boolean;
};

/**
 * Check if a client's profile section is complete.
 * Profile is complete when basic info exists (always true if client exists).
 */
export function isProfileComplete(client: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  province: string;
}): boolean {
  return !!(
    client.firstName &&
    client.lastName &&
    client.dateOfBirth &&
    client.province
  );
}

/**
 * Check if a client's financial inputs section is complete.
 * Financial inputs are complete when income is specified.
 */
export function isFinancialInputsComplete(client: {
  clientIncome?: string;
}): boolean {
  const income = parseFloat(client.clientIncome || "0");
  return income > 0;
}

/**
 * Check if insurance needs calculation is complete.
 * Insurance needs are complete when a result exists with total > 0 or explicit calculation was done.
 */
export function isInsuranceNeedsComplete(
  insuranceResult: { totalInsuranceNeeds: number } | null,
): boolean {
  return insuranceResult !== null;
}

/**
 * Calculate overall completion status for a client
 */
export function calculateCompletionStatus(
  client: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    province: string;
    clientIncome?: string;
  },
  insuranceResult: { totalInsuranceNeeds: number } | null,
): SectionCompletionStatus {
  return {
    profile: isProfileComplete(client),
    financialInputs: isFinancialInputsComplete(client),
    insuranceNeeds: isInsuranceNeedsComplete(insuranceResult),
  };
}

/**
 * Get completion count (e.g., "2/3 sections complete")
 */
export function getCompletionCount(status: SectionCompletionStatus): {
  completed: number;
  total: number;
} {
  const sections = [
    status.profile,
    status.financialInputs,
    status.insuranceNeeds,
  ];
  return {
    completed: sections.filter(Boolean).length,
    total: sections.length,
  };
}
