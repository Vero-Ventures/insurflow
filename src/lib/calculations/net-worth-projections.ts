/**
 * Net worth projection calculations
 * Projects asset growth, debt reduction, and net worth over time
 */

export interface NetWorthProjection {
  year: number;
  assets: number;
  debts: number;
  netWorth: number;
}

export interface NetWorthProjectionInput {
  currentAssets: number;
  currentDebts: number;
  assetGrowthRate?: number; // Default 5%
  debtPaydownYears?: number; // Default 10 years
  projectionYears?: number; // Default 10 years
}

/**
 * Calculate net worth projections over time
 */
export function calculateNetWorthProjections(
  input: NetWorthProjectionInput,
): NetWorthProjection[] {
  const {
    currentAssets,
    currentDebts,
    assetGrowthRate = 0.05,
    debtPaydownYears = 10,
    projectionYears = 10,
  } = input;

  const currentYear = new Date().getFullYear();
  const projections: NetWorthProjection[] = [];

  for (let i = 0; i <= projectionYears; i++) {
    // Project asset growth (compound annual growth)
    const projectedAssets = currentAssets * Math.pow(1 + assetGrowthRate, i);

    // Project debt reduction (linear paydown)
    const projectedDebts = Math.max(
      0,
      currentDebts * (1 - i / debtPaydownYears),
    );

    projections.push({
      year: currentYear + i,
      assets: Math.round(projectedAssets),
      debts: Math.round(projectedDebts),
      netWorth: Math.round(projectedAssets - projectedDebts),
    });
  }

  return projections;
}
