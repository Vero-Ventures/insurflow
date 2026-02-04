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
  state: "ON",
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
 * Demo assets representing a typical Canadian family's wealth.
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
    name: "RRSP - Self",
    type: "retirement",
    currentValue: "185000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-003",
    clientId: DEMO_CLIENT_ID,
    name: "RRSP - Spouse",
    type: "retirement",
    currentValue: "95000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-004",
    clientId: DEMO_CLIENT_ID,
    name: "TFSA - Joint",
    type: "investment",
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
    type: "vehicle",
    currentValue: "35000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
  {
    id: "demo-asset-007",
    clientId: DEMO_CLIENT_ID,
    name: "RESP - Children",
    type: "education",
    currentValue: "42000.00",
    isLiquid: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    deletedAt: null,
  },
];

/**
 * Demo debts representing typical Canadian household liabilities.
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
    type: "auto_loan",
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
 * - Liquid Assets: $70,000 (TFSA $45,000 + Emergency Fund $25,000)
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
