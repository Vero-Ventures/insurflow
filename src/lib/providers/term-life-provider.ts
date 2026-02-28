export type PremiumRangeEstimate = {
  lowMonthlyPremiumCad: number;
  highMonthlyPremiumCad: number;
  currency: "CAD";
  nonBinding: true;
};

export type EstimatePremiumRangeInput = {
  age: number;
  tobaccoUse: boolean;
  province: string;
  termYears: number;
  coverageAmount: number;
};

export interface TermLifeProvider {
  estimatePremiumRange(
    input: EstimatePremiumRangeInput,
  ): Promise<PremiumRangeEstimate>;
}
