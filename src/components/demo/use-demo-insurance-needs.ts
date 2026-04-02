import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsResult,
} from "@/lib/financial/insurance-needs";
import { decimalToNumber } from "@/lib/financial/decimal-to-number";

const DEMO_TOTAL_ASSETS = 1277000;

export interface DemoInsuranceInputs {
  annualHouseholdIncome: string;
  totalDebts: string;
  currentCoverage: string;
  incomeReplacementPercent: number;
  replacementDurationYears: number;
  liquidAssets: number;
}

function parseCurrencyInput(value: string): number {
  return decimalToNumber(value.replace(/[^\d.-]/g, ""));
}

export function calculateDemoInsuranceNeeds(
  inputs: DemoInsuranceInputs,
): InsuranceNeedsResult {
  return calculateInsuranceNeedsRounded({
    clientIncome: parseCurrencyInput(inputs.annualHouseholdIncome),
    spouseIncome: 0,
    includeSpouseIncome: false,
    incomeReplacementPercent: inputs.incomeReplacementPercent,
    replacementDurationYears: inputs.replacementDurationYears,
    existingLifeInsuranceCoverage: parseCurrencyInput(inputs.currentCoverage),
    totalDebts: parseCurrencyInput(inputs.totalDebts),
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
