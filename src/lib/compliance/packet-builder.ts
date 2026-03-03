/**
 * Compliance Packet Builder
 *
 * Pure function that assembles a CompliancePacket from calculation
 * results, client data, and methodology references.
 *
 * No side effects, no DB access, no HTTP — easy to test.
 */

import type {
  CompliancePacket,
  PacketAssumption,
  PacketConsumerContext,
  PacketEstimateSummary,
  PacketMetadata,
  PacketMethodologyNote,
} from "./packet-types";
import { PACKET_VERSION } from "./packet-types";
import type { InsuranceNeedsResult } from "@/lib/financial/insurance-needs";
import type { USSettlingRequirementsResult } from "@/lib/financial/settling-requirements-us";
import type { ConfidenceResult } from "@/lib/financial/confidence-scoring";
import type { CalculationTrace } from "@/types/calculation-trace";
import type { MethodologyData } from "@/lib/transparency/methodology-data";
import { formatCurrency } from "@/lib/client-utils";

// =============================================================================
// Input types for the builder
// =============================================================================

export interface PacketBuilderInput {
  /** Client profile data */
  client: {
    firstName: string;
    lastName: string;
    stateCode: string;
    stateName: string;
    dateOfBirth: string;
    age: number;
    hasSpouse: boolean;
    smoker: boolean;
    healthRating: string;
  };

  /** Insurance needs result */
  insuranceNeeds: InsuranceNeedsResult;

  /** Settling requirements result (null if not calculated) */
  settlingRequirements: USSettlingRequirementsResult | null;

  /** Confidence scoring */
  confidence: ConfidenceResult;

  /** Calculation trace */
  trace: CalculationTrace;

  /** Input parameters used for transparency */
  inputsUsed: {
    clientIncome: number;
    spouseIncome: number;
    includeSpouseIncome: boolean;
    incomeReplacementPercent: number;
    replacementDurationYears: number;
    existingCoverage: number;
    totalDebts: number;
    liquidAssets: number;
    totalAssets: number;
    estateBufferType: "fixed" | "percentage";
    estateBufferValue: number;
  };

  /** Methodology data for included modules */
  methodologies: MethodologyData[];

  /** Application context */
  applicationContext: "d2c-consumer" | "advisor-review";
}

// =============================================================================
// Builder
// =============================================================================

/**
 * Build a compliance packet from calculation results and metadata.
 * This is a pure function — deterministic, no side effects.
 */
export function buildCompliancePacket(
  input: PacketBuilderInput,
): CompliancePacket {
  const metadata = buildMetadata(input);
  const consumerContext = buildConsumerContext(input);
  const estimateSummary = buildEstimateSummary(input);
  const assumptions = buildAssumptions(input);
  const methodologyNotes = buildMethodologyNotes(input.methodologies);
  const methodNotes = collectMethodNotes(input.methodologies);

  return {
    metadata,
    consumerContext,
    estimateSummary,
    trace: input.trace,
    assumptions,
    methodologyNotes,
    methodNotes,
  };
}

// =============================================================================
// Internal builders
// =============================================================================

function buildMetadata(input: PacketBuilderInput): PacketMetadata {
  return {
    generatedAt: new Date().toISOString(),
    packetVersion: PACKET_VERSION,
    applicationContext: input.applicationContext,
    engineVersions: {
      insuranceNeeds: input.trace.version,
      settlingRequirements: "1.0.0",
    },
  };
}

function buildConsumerContext(
  input: PacketBuilderInput,
): PacketConsumerContext {
  return {
    clientName: `${input.client.firstName} ${input.client.lastName}`,
    stateCode: input.client.stateCode,
    stateName: input.client.stateName,
    dateOfBirth: input.client.dateOfBirth,
    age: input.client.age,
    hasSpouse: input.client.hasSpouse,
    smoker: input.client.smoker,
    healthRating: input.client.healthRating,
  };
}

function buildEstimateSummary(
  input: PacketBuilderInput,
): PacketEstimateSummary {
  return {
    insuranceNeeds: input.insuranceNeeds,
    settlingRequirements: input.settlingRequirements,
    confidence: input.confidence,
  };
}

function buildAssumptions(input: PacketBuilderInput): PacketAssumption[] {
  const assumptions: PacketAssumption[] = [];
  const { inputsUsed } = input;

  assumptions.push({
    category: "Income Replacement",
    description: "Client annual income used for replacement calculation",
    value: formatCurrency(inputsUsed.clientIncome),
    source: inputsUsed.clientIncome > 0 ? "user-provided" : "default",
  });

  if (inputsUsed.includeSpouseIncome) {
    assumptions.push({
      category: "Income Replacement",
      description: "Spouse income offset included in calculation",
      value: formatCurrency(inputsUsed.spouseIncome),
      source: inputsUsed.spouseIncome > 0 ? "user-provided" : "default",
    });
  }

  assumptions.push({
    category: "Income Replacement",
    description: "Income replacement percentage",
    value: `${inputsUsed.incomeReplacementPercent}%`,
    source: "user-provided",
  });

  assumptions.push({
    category: "Income Replacement",
    description: "Replacement duration",
    value: `${inputsUsed.replacementDurationYears} years`,
    source: "user-provided",
  });

  assumptions.push({
    category: "Existing Coverage",
    description: "Existing life insurance coverage deducted from needs",
    value: formatCurrency(inputsUsed.existingCoverage),
    source: inputsUsed.existingCoverage > 0 ? "user-provided" : "default",
  });

  assumptions.push({
    category: "Debts",
    description: "Total debts included in coverage needs",
    value: formatCurrency(inputsUsed.totalDebts),
    source: inputsUsed.totalDebts > 0 ? "user-provided" : "default",
  });

  assumptions.push({
    category: "Assets",
    description: "Liquid assets deducted from coverage needs",
    value: formatCurrency(inputsUsed.liquidAssets),
    source: inputsUsed.liquidAssets > 0 ? "user-provided" : "default",
  });

  assumptions.push({
    category: "Estate Buffer",
    description:
      inputsUsed.estateBufferType === "fixed"
        ? "Fixed estate settling buffer"
        : "Percentage-based estate settling buffer",
    value:
      inputsUsed.estateBufferType === "fixed"
        ? formatCurrency(inputsUsed.estateBufferValue)
        : `${inputsUsed.estateBufferValue}%`,
    source: "default",
  });

  return assumptions;
}

function buildMethodologyNotes(
  methodologies: MethodologyData[],
): PacketMethodologyNote[] {
  return methodologies.map((m) => ({
    moduleId: m.id,
    title: m.title,
    summary: m.summary,
    steps: m.steps.map((s) => ({
      step: s.step,
      title: s.title,
      description: s.description,
      formula: s.formula,
    })),
    sources: m.sources.map((src) => ({
      label: src.label,
      title: src.title,
      url: src.url,
      effectiveDate: src.effectiveDate,
    })),
    assumptions: m.assumptions,
  }));
}

function collectMethodNotes(methodologies: MethodologyData[]): string[] {
  const notes: string[] = [];
  for (const m of methodologies) {
    notes.push(
      `${m.title}: ${m.summary} (Last reviewed: ${m.lastReviewedDate})`,
    );
    for (const assumption of m.assumptions) {
      notes.push(`  • ${assumption}`);
    }
  }
  return notes;
}
