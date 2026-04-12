export interface AssumptionParameters {
  incomeReplacementPercent: number;
  replacementDurationYears: number;
  estateBuffer: {
    type: "fixed" | "percentage";
    value: number;
  };
  existingCoverageDefault: number;
  totalDebtsDefault: number;
  liquidAssetsDefault: number;
}

export interface EstimateRunInputs {
  annualIncome: number;
  age: number;
  province: string;
  tobaccoUse: boolean;
  termYears: number;
  coverageAmount: number;
  includeSpouseIncome: boolean;
  spouseIncome: number;
}

export interface EstimateRunOutputs {
  insuranceNeeds: {
    incomeReplacementNeeds: number;
    debtPayoffNeeds: number;
    estateBufferNeeds: number;
    grossNeeds: number;
    existingCoverage: number;
    liquidAssets: number;
    totalInsuranceNeeds: number;
  };
  recommendedCoverage: number;
  premiumRange: {
    lowMonthlyPremiumCad: number;
    highMonthlyPremiumCad: number;
    currency: "CAD";
    nonBinding: boolean;
  };
}
