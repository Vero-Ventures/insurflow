/**
 * Methodology text, source citations, and effective dates for
 * each calculation module. Pure data — no UI dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export interface SourceCitation {
  /** Short label shown inline */
  label: string;
  /** Full title of the source */
  title: string;
  /** URL to the authoritative source */
  url: string;
  /** When this source was last verified */
  accessedDate: string;
  /** Effective date of the rates/rules cited */
  effectiveDate: string;
}

export interface MethodologyStep {
  /** Step number (1-based) */
  step: number;
  /** Short heading */
  title: string;
  /** Plain-language explanation */
  description: string;
  /** Optional formula in plain text */
  formula?: string;
}

export interface MethodologyData {
  /** Module identifier */
  id: string;
  /** Human-readable title */
  title: string;
  /** One-line summary */
  summary: string;
  /** Ordered calculation steps */
  steps: MethodologyStep[];
  /** Authoritative sources */
  sources: SourceCitation[];
  /** Assumptions applied by default */
  assumptions: string[];
  /** Date the methodology was last reviewed */
  lastReviewedDate: string;
}

// ============================================================================
// Insurance Needs (Gap Analysis)
// ============================================================================

export const INSURANCE_NEEDS_METHODOLOGY: MethodologyData = {
  id: "insurance-needs",
  title: "Insurance Needs Analysis",
  summary:
    "Calculates the total life insurance coverage needed by comparing gross financial obligations against existing resources.",
  steps: [
    {
      step: 1,
      title: "Calculate Income Replacement Needs",
      description:
        "Determines how much coverage is needed to replace the client's income for the specified duration, factoring in the replacement percentage and spouse income if applicable.",
      formula:
        "Income Replacement = clientIncome × replacementPercent × durationYears",
    },
    {
      step: 2,
      title: "Calculate Debt Payoff Needs",
      description:
        "Sums all outstanding debts (mortgages, loans, credit cards) that should be paid off upon death.",
      formula: "Debt Payoff = Σ(all debt balances)",
    },
    {
      step: 3,
      title: "Add Estate Buffer",
      description:
        "Adds a buffer for estate settling costs. Can be a fixed amount (default $15,000) or a percentage of the estate.",
      formula: "Estate Buffer = $15,000 (fixed default) or estateValue × %",
    },
    {
      step: 4,
      title: "Calculate Gross Needs",
      description: "Sum of income replacement, debt payoff, and estate buffer.",
      formula: "Gross Needs = Income Replacement + Debt Payoff + Estate Buffer",
    },
    {
      step: 5,
      title: "Subtract Existing Resources",
      description:
        "Existing life insurance coverage and liquid assets are subtracted from gross needs to determine the coverage gap.",
      formula:
        "Total Insurance Needs = max(0, Gross Needs − Existing Coverage − Liquid Assets)",
    },
  ],
  sources: [
    {
      label: "LIMRA",
      title: "LIMRA Life Insurance Needs Analysis Guidelines",
      url: "https://www.limra.com/en/research/research-abstracts-public/2024/2024-insurance-barometer-study/",
      accessedDate: "2024-12-01",
      effectiveDate: "2024-01-01",
    },
    {
      label: "NAIC",
      title:
        "National Association of Insurance Commissioners — Life Insurance Buyer's Guide",
      url: "https://content.naic.org/consumer/life-insurance.htm",
      accessedDate: "2024-12-01",
      effectiveDate: "2024-01-01",
    },
  ],
  assumptions: [
    "Income replacement uses the client-specified percentage (default 70%).",
    "Duration defaults to the client's replacement duration years setting.",
    "Spouse income is included when client has a spouse (unless overridden).",
    "Estate buffer defaults to $15,000 fixed amount.",
    "Only liquid assets are counted toward existing resources.",
    "Existing life insurance policies are summed for total existing coverage.",
  ],
  lastReviewedDate: "2024-12-01",
};

// ============================================================================
// Income Replacement (Advanced)
// ============================================================================

export const INCOME_REPLACEMENT_METHODOLOGY: MethodologyData = {
  id: "income-replacement",
  title: "Income Replacement Analysis",
  summary:
    "Calculates the present value of future income that needs to be replaced, accounting for inflation and time value of money.",
  steps: [
    {
      step: 1,
      title: "Determine Annual Income Need",
      description:
        "The client's income is multiplied by the replacement percentage to determine the annual income that needs to be replaced.",
      formula: "Annual Need = clientIncome × replacementPercent",
    },
    {
      step: 2,
      title: "Determine Duration",
      description:
        "Duration is based on the scenario: custom years, until retirement, or until the youngest child turns 18.",
    },
    {
      step: 3,
      title: "Calculate Present Value",
      description:
        "Future income needs are discounted to present value using a real discount rate (nominal rate minus inflation).",
      formula:
        "PV = Σ(annualNeed × (1+inflation)^t / (1+discount)^t) for t=1..duration",
    },
    {
      step: 4,
      title: "Subtract Survivor Resources",
      description:
        "Government survivor benefits, spouse income, investment income, and other income sources are subtracted.",
      formula: "Net Need = PV of Income Need − PV of Survivor Resources",
    },
  ],
  sources: [
    {
      label: "SOA",
      title: "Society of Actuaries — Income Replacement Ratios",
      url: "https://www.soa.org/",
      accessedDate: "2024-12-01",
      effectiveDate: "2024-01-01",
    },
  ],
  assumptions: [
    "Default inflation rate: 2.5% annually.",
    "Default discount rate: 5.0% annually.",
    "Income grows with inflation over the replacement period.",
    "Survivor resources are assumed constant (not inflation-adjusted by default).",
  ],
  lastReviewedDate: "2024-12-01",
};

// ============================================================================
// Lookup helper
// ============================================================================

const METHODOLOGY_MAP: Record<string, MethodologyData> = {
  "insurance-needs": INSURANCE_NEEDS_METHODOLOGY,
  "income-replacement": INCOME_REPLACEMENT_METHODOLOGY,
};

/**
 * Look up methodology data by module ID.
 */
export function getMethodologyData(
  moduleId: string,
): MethodologyData | undefined {
  return METHODOLOGY_MAP[moduleId];
}

/**
 * Get all available methodology module IDs.
 */
export function getAvailableMethodologies(): string[] {
  return Object.keys(METHODOLOGY_MAP);
}
