/**
 * State-specific rate table data for transparency display.
 * Exposes federal and state tax information in a UI-friendly format.
 */

import { STATE_LABELS } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

export interface RateTableRow {
  label: string;
  value: string;
  note?: string;
}

export interface RateTableSection {
  title: string;
  effectiveDate: string;
  rows: RateTableRow[];
}

export interface StateRateTable {
  stateCode: string;
  stateName: string;
  sections: RateTableSection[];
}

// ============================================================================
// Constants
// ============================================================================

const FEDERAL_ESTATE_TAX_EXEMPTION_2024 = 13_610_000;
const FEDERAL_ESTATE_TAX_RATE = 0.4;
const DEFAULT_LEGAL_FEE_PERCENT = 3;
const DEFAULT_ACCOUNTING_FEE = 3_500;
const DEFAULT_EXECUTOR_FEE_PERCENT = 2;
const DEFAULT_FUNERAL_EXPENSES = 12_000;

// ============================================================================
// State estate tax data
// ============================================================================

interface StateEstateTaxInfo {
  hasEstateTax: boolean;
  exemption?: number;
  topRate?: number;
  hasInheritanceTax: boolean;
  notes?: string;
}

const STATE_ESTATE_TAX_INFO: Record<string, StateEstateTaxInfo> = {
  CT: {
    hasEstateTax: true,
    exemption: 13_610_000,
    topRate: 12,
    hasInheritanceTax: false,
    notes: "Connecticut matches the federal exemption as of 2024.",
  },
  DC: {
    hasEstateTax: true,
    exemption: 4_710_800,
    topRate: 16,
    hasInheritanceTax: false,
  },
  HI: {
    hasEstateTax: true,
    exemption: 5_490_000,
    topRate: 20,
    hasInheritanceTax: false,
  },
  IL: {
    hasEstateTax: true,
    exemption: 4_000_000,
    topRate: 16,
    hasInheritanceTax: false,
  },
  ME: {
    hasEstateTax: true,
    exemption: 6_800_000,
    topRate: 12,
    hasInheritanceTax: false,
  },
  MD: {
    hasEstateTax: true,
    exemption: 5_000_000,
    topRate: 16,
    hasInheritanceTax: true,
    notes: "Maryland imposes both estate and inheritance taxes.",
  },
  MA: {
    hasEstateTax: true,
    exemption: 2_000_000,
    topRate: 16,
    hasInheritanceTax: false,
  },
  MN: {
    hasEstateTax: true,
    exemption: 3_000_000,
    topRate: 16,
    hasInheritanceTax: false,
  },
  NY: {
    hasEstateTax: true,
    exemption: 6_940_000,
    topRate: 16,
    hasInheritanceTax: false,
    notes:
      "New York has a 'cliff' — if estate exceeds 105% of exemption, the entire estate is taxed.",
  },
  OR: {
    hasEstateTax: true,
    exemption: 1_000_000,
    topRate: 16,
    hasInheritanceTax: false,
    notes: "Oregon has the lowest estate tax exemption in the US.",
  },
  RI: {
    hasEstateTax: true,
    exemption: 1_774_583,
    topRate: 16,
    hasInheritanceTax: false,
  },
  VT: {
    hasEstateTax: true,
    exemption: 5_000_000,
    topRate: 16,
    hasInheritanceTax: false,
  },
  WA: {
    hasEstateTax: true,
    exemption: 2_193_000,
    topRate: 20,
    hasInheritanceTax: false,
    notes: "Washington has the highest top estate tax rate in the US.",
  },
  // Inheritance tax only states
  IA: {
    hasEstateTax: false,
    hasInheritanceTax: true,
    notes: "Iowa is phasing out its inheritance tax (fully repealed 2025).",
  },
  KY: {
    hasEstateTax: false,
    hasInheritanceTax: true,
    notes: "Inheritance tax rates depend on beneficiary relationship.",
  },
  NE: {
    hasEstateTax: false,
    hasInheritanceTax: true,
    notes: "Rates range from 1% to 18% depending on relationship.",
  },
  NJ: {
    hasEstateTax: false,
    hasInheritanceTax: true,
    notes:
      "New Jersey eliminated its estate tax in 2018 but retains inheritance tax.",
  },
  PA: {
    hasEstateTax: false,
    hasInheritanceTax: true,
    notes:
      "Flat rates: 0% spouse, 4.5% direct descendants, 12% siblings, 15% others.",
  },
};

// ============================================================================
// Probate fee data
// ============================================================================

interface ProbateFeeInfo {
  type: "statutory" | "flat" | "reasonable" | "none";
  description: string;
  details?: string;
}

const STATE_PROBATE_INFO: Record<string, ProbateFeeInfo> = {
  CA: {
    type: "statutory",
    description: "Statutory tiered rates",
    details:
      "4% of first $100K, 3% of next $100K, 2% of next $800K, 1% of next $9M, 0.5% of next $15M",
  },
  NY: {
    type: "statutory",
    description: "Statutory filing fees based on estate value",
    details: "$45 to $1,250 depending on estate value tier",
  },
  FL: {
    type: "reasonable",
    description: "Reasonable fees (court discretion)",
    details: "Estimated at ~3% of estate value",
  },
  TX: {
    type: "none",
    description: "No probate fee (independent administration)",
    details: "Texas allows independent administration, avoiding most fees",
  },
};

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(rate: number): string {
  return `${rate}%`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Build the full rate table for a given state.
 */
export function getStateRateTable(stateCode: string): StateRateTable {
  const stateName = STATE_LABELS[stateCode] ?? stateCode;
  const sections: RateTableSection[] = [];

  // Federal estate tax (always shown)
  sections.push({
    title: "Federal Estate Tax (2024)",
    effectiveDate: "2024-01-01",
    rows: [
      {
        label: "Lifetime Exemption",
        value: formatCurrency(FEDERAL_ESTATE_TAX_EXEMPTION_2024),
      },
      {
        label: "Tax Rate (above exemption)",
        value: formatPercent(FEDERAL_ESTATE_TAX_RATE * 100),
      },
      {
        label: "Portability",
        value: "Yes",
        note: "Unused exemption can transfer to surviving spouse",
      },
    ],
  });

  // State estate/inheritance tax
  const stateTax = STATE_ESTATE_TAX_INFO[stateCode];
  if (stateTax) {
    const rows: RateTableRow[] = [];

    if (stateTax.hasEstateTax) {
      rows.push({ label: "State Estate Tax", value: "Yes" });
      if (stateTax.exemption !== undefined) {
        rows.push({
          label: "State Exemption",
          value: formatCurrency(stateTax.exemption),
        });
      }
      if (stateTax.topRate !== undefined) {
        rows.push({
          label: "Top Rate",
          value: formatPercent(stateTax.topRate),
        });
      }
    } else {
      rows.push({ label: "State Estate Tax", value: "None" });
    }

    if (stateTax.hasInheritanceTax) {
      rows.push({
        label: "Inheritance Tax",
        value: "Yes",
      });
    }

    // Add notes as a dedicated row to avoid attaching to wrong data
    if (stateTax.notes) {
      rows.push({
        label: "Notes",
        value: stateTax.notes,
      });
    }

    sections.push({
      title: `${stateName} State Tax`,
      effectiveDate: "2024-01-01",
      rows,
    });
  } else {
    sections.push({
      title: `${stateName} State Tax`,
      effectiveDate: "2024-01-01",
      rows: [
        { label: "State Estate Tax", value: "None" },
        { label: "Inheritance Tax", value: "None" },
      ],
    });
  }

  // Probate fees
  const probate = STATE_PROBATE_INFO[stateCode];
  sections.push({
    title: `${stateName} Probate Fees`,
    effectiveDate: "2024-01-01",
    rows: probate
      ? [
          { label: "Fee Type", value: probate.description },
          ...(probate.details
            ? [{ label: "Details", value: probate.details }]
            : []),
        ]
      : [
          {
            label: "Fee Type",
            value: "Reasonable (court discretion)",
            note: "Estimated at ~2.5% of estate value",
          },
        ],
  });

  // Default professional fees
  sections.push({
    title: "Professional Fees (Defaults)",
    effectiveDate: "2024-01-01",
    rows: [
      {
        label: "Legal Fees",
        value: `${DEFAULT_LEGAL_FEE_PERCENT}% of estate`,
      },
      {
        label: "Accounting Fees",
        value: formatCurrency(DEFAULT_ACCOUNTING_FEE),
      },
      {
        label: "Executor Fees",
        value: `${DEFAULT_EXECUTOR_FEE_PERCENT}% of estate`,
      },
    ],
  });

  // Funeral expenses
  sections.push({
    title: "Funeral Expenses (Default)",
    effectiveDate: "2023-01-01",
    rows: [
      {
        label: "Estimated Cost",
        value: formatCurrency(DEFAULT_FUNERAL_EXPENSES),
        note: "Based on NFDA 2023 Member General Price List Survey",
      },
    ],
  });

  return { stateCode, stateName, sections };
}

/**
 * Check whether a state has estate or inheritance tax.
 */
export function stateHasDeathTax(stateCode: string): boolean {
  const info = STATE_ESTATE_TAX_INFO[stateCode];
  if (!info) return false;
  return info.hasEstateTax || info.hasInheritanceTax;
}

/**
 * Get a summary line for the state's tax situation.
 */
export function getStateTaxSummary(stateCode: string): string {
  const info = STATE_ESTATE_TAX_INFO[stateCode];
  const name = STATE_LABELS[stateCode] ?? stateCode;

  if (!info) {
    return `${name} does not impose a state estate or inheritance tax.`;
  }

  const parts: string[] = [];
  if (info.hasEstateTax) {
    parts.push(
      `estate tax (exemption: ${info.exemption ? formatCurrency(info.exemption) : "varies"}, top rate: ${info.topRate ? formatPercent(info.topRate) : "varies"})`,
    );
  }
  if (info.hasInheritanceTax) {
    parts.push("inheritance tax");
  }

  return `${name} imposes ${parts.join(" and ")}.`;
}
