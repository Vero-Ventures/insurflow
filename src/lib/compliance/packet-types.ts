/**
 * Compliance Packet Types
 *
 * Defines the shape of a compliance-ready packet that bundles
 * estimate summary, assumptions, methodology notes, and metadata
 * for D2C estimate/application review.
 *
 * This is a pure data module — no side effects, no UI dependencies.
 */

import type { InsuranceNeedsResult } from "@/lib/financial/insurance-needs";
import type { USSettlingRequirementsResult } from "@/lib/financial/settling-requirements-us";
import type { ConfidenceResult } from "@/lib/financial/confidence-scoring";
import type { CalculationTrace } from "@/types/calculation-trace";

// =============================================================================
// Consumer Context
// =============================================================================

export interface PacketConsumerContext {
  /** Client display name */
  clientName: string;
  /** Client state code (e.g. "CA") */
  stateCode: string;
  /** Client state full name */
  stateName: string;
  /** Client date of birth */
  dateOfBirth: string;
  /** Client age at calculation time */
  age: number;
  /** Whether client has a spouse */
  hasSpouse: boolean;
  /** Smoker status */
  smoker: boolean;
  /** Health rating */
  healthRating: string;
}

// =============================================================================
// Estimate Summary
// =============================================================================

export interface PacketEstimateSummary {
  /** Insurance needs result */
  insuranceNeeds: InsuranceNeedsResult;
  /** Settling requirements result (if available) */
  settlingRequirements: USSettlingRequirementsResult | null;
  /** Confidence scoring result */
  confidence: ConfidenceResult;
}

// =============================================================================
// Assumptions
// =============================================================================

export interface PacketAssumption {
  /** Category label (e.g. "Income Replacement", "Estate Buffer") */
  category: string;
  /** Description of the assumption */
  description: string;
  /** Value used (human-readable) */
  value: string;
  /** Whether this was a default or user-provided */
  source: "default" | "user-provided";
}

// =============================================================================
// Methodology Notes
// =============================================================================

export interface PacketMethodologyNote {
  /** Module identifier */
  moduleId: string;
  /** Module title */
  title: string;
  /** Summary of the methodology */
  summary: string;
  /** Calculation steps */
  steps: {
    step: number;
    title: string;
    description: string;
    formula?: string;
  }[];
  /** Source citations */
  sources: {
    label: string;
    title: string;
    url: string;
    effectiveDate: string;
  }[];
  /** Assumptions applied */
  assumptions: string[];
}

// =============================================================================
// Packet Metadata
// =============================================================================

export interface PacketMetadata {
  /** ISO timestamp when the packet was generated */
  generatedAt: string;
  /** Packet format version for future compatibility */
  packetVersion: string;
  /** Application context */
  applicationContext: "d2c-consumer" | "advisor-review";
  /** Calculation engine versions used */
  engineVersions: {
    insuranceNeeds: string;
    settlingRequirements: string;
  };
}

// =============================================================================
// Complete Compliance Packet
// =============================================================================

export interface CompliancePacket {
  /** Packet metadata */
  metadata: PacketMetadata;
  /** Consumer/client context */
  consumerContext: PacketConsumerContext;
  /** Estimate summary with results */
  estimateSummary: PacketEstimateSummary;
  /** Calculation trace ("show your work") */
  trace: CalculationTrace;
  /** Assumptions used in calculations */
  assumptions: PacketAssumption[];
  /** Methodology notes per calculation module */
  methodologyNotes: PacketMethodologyNote[];
  /** Method notes collected from methodology data */
  methodNotes: string[];
}

/** Current packet format version */
export const PACKET_VERSION = "1.0.0";
