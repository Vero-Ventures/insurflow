import type {
  EstimatePremiumRangeInput,
  PremiumRangeEstimate,
  TermLifeProvider,
} from "@/lib/providers/term-life-provider";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToWhole(value: number): number {
  return Math.round(value);
}

export function getMockPremiumRangeMonthly(
  input: EstimatePremiumRangeInput,
): PremiumRangeEstimate {
  const normalizedCoverageUnits = Math.max(1, input.coverageAmount / 1000);
  const ageFactor = clamp(0.65 + (input.age - 18) * 0.03, 0.65, 3.2);
  const tobaccoFactor = input.tobaccoUse ? 1.85 : 1;
  const termFactor = clamp(0.8 + (input.termYears - 10) * 0.025, 0.8, 1.5);

  const base = normalizedCoverageUnits * 0.075;
  const center = base * ageFactor * tobaccoFactor * termFactor;

  return {
    lowMonthlyPremiumCad: roundToWhole(center * 0.85),
    highMonthlyPremiumCad: roundToWhole(center * 1.2),
    currency: "CAD",
    nonBinding: true,
  };
}

export const mockTermLifeProvider: TermLifeProvider = {
  async estimatePremiumRange(input) {
    return getMockPremiumRangeMonthly(input);
  },
};
