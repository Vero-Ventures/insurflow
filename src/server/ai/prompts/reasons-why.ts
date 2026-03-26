/**
 * Reasons Why Letter Prompt Template
 *
 * Generates a professional compliance document explaining insurance recommendations.
 * This is a regulatory requirement for life insurance advisors in the United States.
 */

import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";
import { STATE_LABELS } from "@/lib/constants";

/**
 * Client data needed for letter generation
 */
export interface ReasonsWhyClientData {
  firstName: string;
  lastName: string;
  state: string;
  hasSpouse: boolean;
  spouseAge?: number | null;
  clientIncome: number;
  spouseIncome?: number | null;
  additionalGoals?: string | null;
}

/**
 * Financial summary for letter generation
 */
export interface ReasonsWhyFinancialData {
  totalAssets: number;
  liquidAssets: number;
  totalDebts: number;
  insuranceResult: InsuranceNeedsResult;
}

/**
 * Format currency for display in the letter
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Build the prompt for generating a Reasons Why letter
 */
export function buildReasonsWhyPrompt(
  client: ReasonsWhyClientData,
  financial: ReasonsWhyFinancialData,
): string {
  const { insuranceResult } = financial;
  const stateName = STATE_LABELS[client.state] ?? client.state;
  const clientName = `${client.firstName} ${client.lastName}`;

  // Build household income description
  let incomeDescription = `an annual income of ${formatCurrency(client.clientIncome)}`;
  if (client.hasSpouse && client.spouseIncome && client.spouseIncome > 0) {
    incomeDescription = `a combined household income of ${formatCurrency(client.clientIncome + client.spouseIncome)} (client: ${formatCurrency(client.clientIncome)}, spouse: ${formatCurrency(client.spouseIncome)})`;
  }

  // Build needs breakdown
  const needsBreakdown = `
- Income Replacement: ${formatCurrency(insuranceResult.incomeReplacementNeeds)} (${insuranceResult.inputsUsed.incomeReplacementPercent}% of income for ${insuranceResult.inputsUsed.replacementDurationYears} years)
- Debt Elimination: ${formatCurrency(insuranceResult.debtPayoffNeeds)}
- Estate Settlement: ${formatCurrency(insuranceResult.estateBufferNeeds)}
- Gross Insurance Needs: ${formatCurrency(insuranceResult.grossNeeds)}
- Less: Existing Coverage: ${formatCurrency(insuranceResult.existingCoverage)}
- Less: Available Liquid Assets: ${formatCurrency(insuranceResult.liquidAssets)}
- Net Insurance Needs: ${formatCurrency(insuranceResult.totalInsuranceNeeds)}`.trim();

  // Build additional context if available
  const additionalContext = client.additionalGoals
    ? `\n\nAdditional client goals and considerations: ${client.additionalGoals}`
    : "";

  const prompt = `You are a professional life insurance advisor in the United States. Generate a formal "Reasons Why" letter explaining the insurance recommendation for a client. This is a compliance document that will be part of the client's file.

CLIENT INFORMATION:
- Name: ${clientName}
- State: ${stateName}
- Household Status: ${client.hasSpouse ? `Married${client.spouseAge ? ` (spouse age: ${client.spouseAge})` : ""}` : "Single"}
- Income: ${incomeDescription}

FINANCIAL SNAPSHOT:
- Total Assets: ${formatCurrency(financial.totalAssets)}
- Liquid Assets: ${formatCurrency(financial.liquidAssets)}
- Total Debts: ${formatCurrency(financial.totalDebts)}

INSURANCE NEEDS ANALYSIS:
${needsBreakdown}${additionalContext}

REQUIREMENTS:
1. Write in a professional, formal tone suitable for regulatory compliance
2. Address the letter to ${client.firstName}
3. Explain the methodology used to calculate the insurance need
4. Reference the specific numbers from the analysis
5. Explain why this coverage amount is appropriate for their situation
6. Include standard compliance language about the recommendation being based on information provided
7. Keep the letter concise but thorough (approximately 300-400 words)
8. Do NOT include a signature block or date - those will be added separately
9. Format using clear paragraphs with no headers or bullet points in the main body

Generate the "Reasons Why" letter:`;

  return prompt;
}
