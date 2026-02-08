/**
 * Demo client data for the demo mode feature.
 * Provides a realistic, pre-populated client for prospects to explore.
 */

import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";
import type { InsuranceNeedsResult } from "@/lib/financial/insurance-needs";

const DEMO_CLIENT_ID = "demo-client-001";
const DEMO_TIMESTAMP = "2026-02-01T12:00:00.000Z";

/**
 * Demo client: A typical mid-career professional with a family.
 * Realistic profile for life insurance needs analysis.
 */
export const demoClient: Client = {
  id: DEMO_CLIENT_ID,
  firstName: "Alex",
  lastName: "Thompson",
  dateOfBirth: "1982-06-15", // 43 years old
  state: "CA",
  sex: "M",
  smoker: false,
  healthRating: "preferred",
  hasSpouse: true,
  spouseAge: 41,
  clientIncome: "125000.00",
  spouseIncome: "85000.00",
  incomeReplacementPercent: "70",
  replacementDurationYears: 15,
  existingLifeInsuranceCoverage: "250000.00",
  additionalGoals:
    "Fund children's education (2 kids, ages 8 and 12). Want to ensure mortgage is paid off and spouse can maintain lifestyle if something happens.",
  status: "active",
  updatedAt: DEMO_TIMESTAMP,
};

/**
 * Demo assets representing a typical US family's wealth.
 */
export const demoAssets: Asset[] = [
  {
    id: "demo-asset-001",
    clientId: DEMO_CLIENT_ID,
    name: "Primary Residence",
    type: "real_estate",
    currentValue: "850000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-002",
    clientId: DEMO_CLIENT_ID,
    name: "401(k) - Self",
    type: "401k",
    currentValue: "185000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-003",
    clientId: DEMO_CLIENT_ID,
    name: "401(k) - Spouse",
    type: "401k",
    currentValue: "95000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-004",
    clientId: DEMO_CLIENT_ID,
    name: "Joint Brokerage Account",
    type: "brokerage",
    currentValue: "45000.00",
    isLiquid: true,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-005",
    clientId: DEMO_CLIENT_ID,
    name: "Emergency Fund",
    type: "savings",
    currentValue: "25000.00",
    isLiquid: true,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-006",
    clientId: DEMO_CLIENT_ID,
    name: "Family Vehicle",
    type: "other",
    currentValue: "35000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-007",
    clientId: DEMO_CLIENT_ID,
    name: "529 Plan - Children",
    type: "529_plan",
    currentValue: "42000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
];

/**
 * Demo debts representing typical US household liabilities.
 */
export const demoDebts: Debt[] = [
  {
    id: "demo-debt-001",
    clientId: DEMO_CLIENT_ID,
    name: "Mortgage - Primary Residence",
    type: "mortgage",
    currentBalance: "485000.00",
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-debt-002",
    clientId: DEMO_CLIENT_ID,
    name: "Vehicle Loan",
    type: "car_loan",
    currentBalance: "18500.00",
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-debt-003",
    clientId: DEMO_CLIENT_ID,
    name: "Line of Credit",
    type: "line_of_credit",
    currentBalance: "12000.00",
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
];

/**
 * Pre-calculated insurance needs result for demo mode.
 * This matches what the calculation engine would produce for the demo client.
 *
 * Calculation breakdown:
 * - Income Replacement: $125,000 × 70% × 15 years = $1,312,500
 * - Debt Payoff: $485,000 + $18,500 + $12,000 = $515,500
 * - Estate Buffer: $15,000 (fixed default)
 * - Gross Needs: $1,843,000
 * - Existing Coverage: $250,000
 * - Liquid Assets: $70,000 (Brokerage $45,000 + Emergency Fund $25,000)
 * - Net Needs: $1,523,000
 */
export const demoInsuranceResult: InsuranceNeedsResult = {
  incomeReplacementNeeds: 1312500,
  debtPayoffNeeds: 515500,
  estateBufferNeeds: 15000,
  grossNeeds: 1843000,
  existingCoverage: 250000,
  liquidAssets: 70000,
  totalInsuranceNeeds: 1523000,
  inputsUsed: {
    clientIncome: 125000,
    spouseIncome: 85000,
    includeSpouseIncome: false, // Only insuring primary earner
    incomeReplacementPercent: 70,
    replacementDurationYears: 15,
    estateBufferType: "fixed",
    estateBufferValue: 15000,
  },
};

/**
 * Pre-generated AI "Reasons Why" letter for demo mode.
 * Written to match the output style and compliance tone that
 * Gemini would produce given the demo client's financial profile.
 */
export const demoLetter = `Dear Alex,

Following our comprehensive review of your financial situation and insurance needs, I am writing to document the basis for my life insurance recommendation. This letter serves as a formal record of the analysis conducted and the reasoning behind the coverage amount proposed.

Our analysis considered your combined household income of $210,000, comprising your annual income of $125,000 and your spouse's income of $85,000. As the primary income earner in your household, ensuring adequate income replacement in the event of your premature death is a critical component of your family's financial security plan. With your spouse aged 41 and two children whose education funding remains a priority, the need for comprehensive coverage is particularly evident.

To determine the appropriate level of coverage, we employed a needs-based analysis methodology. This approach calculates the total financial obligations your family would face and offsets them against your existing resources. The income replacement component was calculated at 70% of your annual income over a 15-year period, resulting in a need of $1,312,500. This duration and percentage reflect the time required for your dependents to achieve financial independence while maintaining their current standard of living. Additionally, we identified $515,500 in outstanding debts, including your mortgage on your primary residence, vehicle loan, and line of credit, all of which would need to be addressed to prevent financial hardship. An estate settlement provision of $15,000 was also included to cover probate, legal, and final expenses.

The gross insurance need was determined to be $1,843,000. From this amount, we deducted your existing life insurance coverage of $250,000 and available liquid assets of $70,000, which include your brokerage account and emergency fund. These offsets reduce the net insurance requirement to $1,523,000.

Your stated goals of funding your children's education and ensuring your mortgage is fully paid off in the event of your passing were factored into this analysis. The recommended coverage amount of $1,523,000 is designed to address these objectives while providing your spouse with the financial means to maintain your family's current lifestyle.

This recommendation is based solely on the financial information you have provided and the assumptions outlined above. I encourage you to review this analysis periodically, particularly following any significant life changes such as income adjustments, the birth of additional dependents, or material changes in your asset or liability profile. Should your circumstances change, a revised analysis would be appropriate to ensure your coverage remains adequate.`;
