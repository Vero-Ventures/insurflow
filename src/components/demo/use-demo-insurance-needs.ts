import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsResult,
} from "@/lib/financial/insurance-needs";

const DEMO_TOTAL_ASSETS = 1277000;

export interface DemoInsuranceInputs {
  annualHouseholdIncome: string;
  totalDebts: string;
  currentCoverage: string;
  incomeReplacementPercent: number;
  replacementDurationYears: number;
  liquidAssets: number;
}

function toNumber(value: string): number {
  const normalized = value.replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateDemoInsuranceNeeds(
  inputs: DemoInsuranceInputs,
): InsuranceNeedsResult {
  return calculateInsuranceNeedsRounded({
    clientIncome: toNumber(inputs.annualHouseholdIncome),
    spouseIncome: 0,
    includeSpouseIncome: false,
    incomeReplacementPercent: inputs.incomeReplacementPercent,
    replacementDurationYears: inputs.replacementDurationYears,
    existingLifeInsuranceCoverage: toNumber(inputs.currentCoverage),
    totalDebts: toNumber(inputs.totalDebts),
    liquidAssets: inputs.liquidAssets,
    totalAssets: DEMO_TOTAL_ASSETS,
    estateBuffer: DEFAULT_ESTATE_BUFFER,
  });
}

export function useDemoInsuranceNeeds(inputs: DemoInsuranceInputs) {
  const result = calculateDemoInsuranceNeeds(inputs);

  const coverageGap = Math.max(
    0,
    result.totalInsuranceNeeds - result.existingCoverage,
  );

  return {
    result,
    coverageGap,
  };
}
